import express from 'express';
import { query } from '../db';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT id, port_name FROM ports ORDER BY port_name');
    return res.json({ ports: result.rows });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
