import express from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createRateLimit } from '../middleware/rateLimit';

const router = express.Router();
const bookingPostLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many booking requests. Please try again later.',
});

const baseSelect = `
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
  s.pickup_location,
  s.dropoff_location,
  s.pickup_date,
  s.actual_time_departure,
  s.book_date,
  s.status_id,
  s.amount,
  dp.port_name AS departure_port_name,
  dtp.port_name AS destination_port_name,
  st.status_label
`;

// List shipments for the authenticated shipper
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const shipperId = req.user?.id;
    const sql = `
      SELECT ${baseSelect}
      FROM shipments s
      LEFT JOIN ports dp ON s.departure_port = dp.id
      LEFT JOIN ports dtp ON s.destination_port = dtp.id
      LEFT JOIN status st ON s.status_id = st.id
      WHERE s.shipper = $1
      ORDER BY s.id DESC
    `;
    const result = await query(sql, [shipperId]);
    return res.json({ shipments: result.rows });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get a single shipment
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const shipperId = req.user?.id;
    const shipmentId = req.params.id;
    const sql = `
      SELECT ${baseSelect}
      FROM shipments s
      LEFT JOIN ports dp ON s.departure_port = dp.id
      LEFT JOIN ports dtp ON s.destination_port = dtp.id
      LEFT JOIN status st ON s.status_id = st.id
      WHERE s.id = $1 AND s.shipper = $2
    `;
    const result = await query(sql, [shipmentId, shipperId]);
    const shipment = result.rows[0];
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    return res.json({ shipment });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

const createShipmentHandler = async (req: AuthRequest, res: express.Response) => {
  try {
    const shipperId = req.user?.id;
    const {
      destination_port,
      departure_port,
      transport_number,
      mbl_number,
      fsl_type,
      container_20,
      container_40,
      type_of_goods_id,
      pickup_location,
      dropoff_location,
      pickup_date,
      actual_time_departure,
    } = req.body;
    const sql = `
      INSERT INTO shipments 
        (shipper, destination_port, departure_port, transport_number, mbl_number, fsl_type, container_20, container_40, type_of_goods_id, pickup_location, dropoff_location, pickup_date, actual_time_departure, book_date, status_id, amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13, NOW(), 1, NULL)
      RETURNING *
    `;
    const result = await query(sql, [
      shipperId,
      destination_port,
      departure_port,
      transport_number || null,
      mbl_number || null,
      fsl_type || null,
      container_20 || 0,
      container_40 || 0,
      type_of_goods_id ?? null,
      pickup_location || null,
      dropoff_location || null,
      pickup_date || null,
      actual_time_departure || null,
    ]);
    const shipment = result.rows[0];
    return res.status(201).json({ shipment });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

// Create a shipment
router.post('/', requireAuth, bookingPostLimit, createShipmentHandler);

// Dedicated booking endpoint
router.post('/bookings', requireAuth, bookingPostLimit, createShipmentHandler);

// Update a user shipment pickup date and status for the authenticated shipper
router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const shipperId = req.user?.id;
    const shipmentId = req.params.id;
    const { pickup_date, status_label } = req.body;

    const sql = `
      UPDATE shipments
      SET
        pickup_date = COALESCE($1::date, pickup_date),
        status_id = COALESCE(
          (SELECT id FROM status WHERE status_label = $2::text),
          status_id
        )
      WHERE id = $3 AND shipper = $4
      RETURNING *
    `;

    const updateResult = await query(sql, [pickup_date || null, status_label || null, shipmentId, shipperId]);
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const selectSql = `
      SELECT ${baseSelect}
      FROM shipments s
      LEFT JOIN ports dp ON s.departure_port = dp.id
      LEFT JOIN ports dtp ON s.destination_port = dtp.id
      LEFT JOIN status st ON s.status_id = st.id
      WHERE s.id = $1
    `;
    const selectResult = await query(selectSql, [shipmentId]);
    const shipment = selectResult.rows[0];

    return res.json({ shipment });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
