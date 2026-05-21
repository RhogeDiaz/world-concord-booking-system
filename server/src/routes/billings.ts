import express from 'express';
import { query } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// List billings for the authenticated shipper
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const shipperId = req.user?.id;
    const sql = `
      SELECT 
        b.id, b.shipper, b.shipment, b.billing_type,
        b.amounts_payable, b.currency,
        s.transport_number, s.mbl_number
      FROM billings b
      LEFT JOIN shipments s ON b.shipment = s.id
      WHERE b.shipper = $1
      ORDER BY b.id DESC
    `;
    const result = await query(sql, [shipperId]);
    return res.json({ billings: result.rows });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get a single billing
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const shipperId = req.user?.id;
    const billingId = req.params.id;
    const sql = `
      SELECT 
        b.id, b.shipper, b.shipment, b.billing_type,
        b.amounts_payable, b.currency,
        s.transport_number, s.mbl_number
      FROM billings b
      LEFT JOIN shipments s ON b.shipment = s.id
      WHERE b.id = $1 AND b.shipper = $2
    `;
    const result = await query(sql, [billingId, shipperId]);
    const billing = result.rows[0];
    if (!billing) return res.status(404).json({ error: 'Billing not found' });
    return res.json({ billing });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Create a billing
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const shipperId = req.user?.id;
    const { shipment, billing_type, amounts_payable, currency } = req.body;
    if (!shipment || !billing_type || !amounts_payable) return res.status(400).json({ error: 'Missing required fields' });

    // Validate billing_type is one of the enum values
    const validTypes = ['TO_SHIPPER', 'FROM_FSL', 'FROM_CBR'];
    if (!validTypes.includes(billing_type)) return res.status(400).json({ error: 'Invalid billing_type' });

    const sql = `
      INSERT INTO billings 
        (shipper, shipment, billing_type, amounts_payable, currency)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await query(sql, [
      shipperId,
      shipment,
      billing_type,
      amounts_payable,
      currency || 'PHP'
    ]);
    const billing = result.rows[0];
    return res.status(201).json({ billing });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
