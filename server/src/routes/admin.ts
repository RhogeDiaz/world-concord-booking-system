import express from 'express';
import { query } from '../db';
import { requireAdmin, requireAdminOrOperator, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get all shipments with shipper and port info (admin or operator)
router.get('/shipments', requireAdminOrOperator, async (req: AuthRequest, res) => {
  try {
    const sql = `
      SELECT 
        s.id,
        s.shipper,
        s.destination_port,
        s.departure_port,
        s.transport_number,
        s.mbl_number,
        s.fsl_type,
        s.container_20,
        s.container_40,
        s.type_of_goods_id,
        s.actual_time_departure,
        s.pickup_location,
        s.dropoff_location,
        s.pickup_date,
        s.book_date,
        s.status_id,
        s.amount,
        sh.company_name AS shipper_name,
        dp.port_name AS departure_port_name,
        dtp.port_name AS destination_port_name,
        st.status_label
      FROM shipments s
      LEFT JOIN shippers sh ON s.shipper = sh.id
      LEFT JOIN ports dp ON s.departure_port = dp.id
      LEFT JOIN ports dtp ON s.destination_port = dtp.id
      LEFT JOIN status st ON s.status_id = st.id
      ORDER BY s.id DESC
    `;
    const result = await query(sql);
    return res.json(result.rows);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get all ports (for dropdowns)
router.get('/ports', requireAdminOrOperator, async (req: AuthRequest, res) => {
  try {
    const sql = `SELECT id, port_name FROM ports ORDER BY port_name`;
    const result = await query(sql);
    return res.json(result.rows);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get all statuses (for dropdowns)
router.get('/statuses', requireAdminOrOperator, async (req: AuthRequest, res) => {
  try {
    const sql = `SELECT id, status_label FROM status ORDER BY id`;
    const result = await query(sql);
    let statuses = result.rows;
    if (req.user?.is_operator) {
      const allowed = ['Confirmed', 'Rejected', 'Rescheduled'];
      statuses = statuses.filter((status: any) => allowed.includes(status.status_label));
    }
    return res.json(statuses);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update shipment details (admin or operator)
router.put('/shipments/:id', requireAdminOrOperator, async (req: AuthRequest, res) => {
  try {
    const shipmentId = req.params.id;
    const { destination_port, departure_port, fsl_type, status_id, actual_time_departure, pickup_date, amount } = req.body;
    const isOperator = !!req.user?.is_operator;

    if (isOperator) {
      if (destination_port != null || departure_port != null || fsl_type != null || actual_time_departure != null || amount != null) {
        return res.status(403).json({ error: 'Operator access only allows status and pickup date updates.' });
      }

      if (status_id != null) {
        const statusResult = await query('SELECT status_label FROM status WHERE id = $1', [status_id]);
        const statusRow = statusResult.rows[0];
        const allowed = ['Confirmed', 'Rejected', 'Rescheduled'];
        if (!statusRow || !allowed.includes(statusRow.status_label)) {
          return res.status(403).json({ error: 'Operator access only allows Confirmed, Rejected, or Rescheduled status updates.' });
        }
      }
    }

    const sql = isOperator
      ? `
      UPDATE shipments
      SET 
        status_id = COALESCE($1, status_id),
        pickup_date = COALESCE($2::date, pickup_date)
      WHERE id = $3
      RETURNING *
    `
      : `
      UPDATE shipments
      SET 
        destination_port = COALESCE($1, destination_port),
        departure_port = COALESCE($2, departure_port),
        fsl_type = COALESCE($3, fsl_type),
        status_id = COALESCE($4, status_id),
        actual_time_departure = COALESCE($5, actual_time_departure),
        pickup_date = COALESCE($6::date, pickup_date),
        amount = COALESCE($7, amount)
      WHERE id = $8
      RETURNING *
    `;

    const result = await query(sql, isOperator
      ? [status_id || null, pickup_date || null, shipmentId]
      : [
          destination_port || null,
          departure_port || null,
          fsl_type || null,
          status_id || null,
          actual_time_departure || null,
          pickup_date || null,
          amount != null ? amount : null,
          shipmentId,
        ]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Shipment not found' });
    return res.json({ shipment: result.rows[0] });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get dashboard metrics for a specific year (admin only)
router.get('/metrics', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.query.year as string, 10);
    if (!year || isNaN(year)) {
      return res.status(400).json({ error: 'Year parameter required and must be a number' });
    }

    // Get total bookings and distinct days with bookings
    const sql = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(DISTINCT DATE(book_date)) as days_with_bookings
      FROM shipments
      WHERE EXTRACT(YEAR FROM book_date) = $1
    `;
    const result = await query(sql, [year]);
    const { total_bookings, days_with_bookings } = result.rows[0];

    // Calculate daily average (total / days with bookings)
    const daily_bookings = days_with_bookings > 0 ? Math.round((total_bookings / days_with_bookings) * 100) / 100 : 0;

    return res.json({
      total_bookings: parseInt(total_bookings, 10),
      daily_bookings,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get monthly booking breakdown for a specific year (admin only)
router.get('/monthly', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const year = parseInt(req.query.year as string, 10);
    if (!year || isNaN(year)) {
      return res.status(400).json({ error: 'Year parameter required and must be a number' });
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Get monthly requests count
    const requestsSQL = `
      SELECT 
        EXTRACT(MONTH FROM book_date)::int as month,
        COUNT(*) as requests
      FROM shipments
      WHERE EXTRACT(YEAR FROM book_date) = $1
      GROUP BY EXTRACT(MONTH FROM book_date)
      ORDER BY month
    `;
    const requestsResult = await query(requestsSQL, [year]);

    // Get monthly accepted count (status NOT IN 1, 3, 9)
    const acceptedSQL = `
      SELECT 
        EXTRACT(MONTH FROM book_date)::int as month,
        COUNT(*) as accepted
      FROM shipments
      WHERE EXTRACT(YEAR FROM book_date) = $1
        AND status_id NOT IN (1, 3, 9)
      GROUP BY EXTRACT(MONTH FROM book_date)
      ORDER BY month
    `;
    const acceptedResult = await query(acceptedSQL, [year]);

    // Build a map for quick lookup
    const requestsMap = new Map(requestsResult.rows.map((r: any) => [r.month, parseInt(r.requests, 10)]));
    const acceptedMap = new Map(acceptedResult.rows.map((r: any) => [r.month, parseInt(r.accepted, 10)]));

    // Build 12-month array with 0 values for missing months
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      month_name: monthNames[i],
      requests: requestsMap.get(i + 1) || 0,
      accepted: acceptedMap.get(i + 1) || 0,
    }));

    return res.json(monthlyData);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get available years from shipments data (admin only)
router.get('/years', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const sql = `
      SELECT DISTINCT EXTRACT(YEAR FROM book_date)::int as year
      FROM shipments
      ORDER BY year DESC
    `;
    const result = await query(sql);
    const years = result.rows.map((r: any) => r.year);
    return res.json(years);
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
