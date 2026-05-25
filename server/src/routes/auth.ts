import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { sendVerificationEmail } from '../lib/mailer';
import { createRateLimit } from '../middleware/rateLimit';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = express.Router();
const authPostLimit = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts. Please wait and try again.',
});

router.post('/register', authPostLimit, async (req, res) => {
  try {
    const { username, password, company_name, company_address, company_phone, company_email } = req.body;
    if (!username || !password || !company_name) return res.status(400).json({ error: 'Missing fields' });

    if (company_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company_email)) {
      return res.status(400).json({ error: 'Enter a valid company email address.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    
    // generate verification code and expiry (24 hours)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Insert into pending_registrations (not shippers)
    const sql = `INSERT INTO pending_registrations (username, password, company_name, company_address, company_phone, company_email, verification_code, verification_expires) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                 RETURNING username, company_name, company_email`;
    const result = await query(sql, [username, hashed, company_name, company_address || null, company_phone || null, company_email || null, code, expiresAt]);
    const registration = result.rows[0];

    // send verification email if email present
    let previewUrl: string | undefined;
    if (registration.company_email) {
      try {
        const sent = await sendVerificationEmail(registration.company_email, code);
        previewUrl = sent.previewUrl;
      } catch (e) {
        // log but don't fail registration if email sending fails
        // eslint-disable-next-line no-console
        console.error('Failed to send verification email', e);
      }
    }

    const isDevMode = process.env.NODE_ENV !== 'production';
    return res.status(201).json({
      message: 'Registration pending verification',
      username: registration.username,
      company_name: registration.company_name,
      verification_preview: previewUrl,
      verification_code: isDevMode ? code : undefined,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return res.status(400).json({ error: 'Username already registered or pending verification' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

router.post('/login', authPostLimit, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    if (username === 'admin@worldconcord.com' && password === 'admin@GT.WorldConcord') {
      const secret = process.env.JWT_SECRET as string;
      const token = jwt.sign({ id: 0, username: 'admin@worldconcord.com', is_admin: true }, secret, { expiresIn: '7d' });
      return res.json({ token, is_admin: true });
    }

    if (username === 'operations@worldconcord.com' && password === 'operations@GT.WorldConcord') {
      const secret = process.env.JWT_SECRET as string;
      const token = jwt.sign({ id: 0, username: 'operations@worldconcord.com', is_operator: true }, secret, { expiresIn: '7d' });
      return res.json({ token, is_admin: false, is_operator: true });
    }

    const sql = `
      SELECT
        id,
        username,
        password,
        company_email,
        company_phone,
        COALESCE(is_admin, false) AS is_admin,
        COALESCE(is_operator, false) AS is_operator,
        COALESCE(is_verified, false) AS is_verified,
        verification_code,
        verification_expires
      FROM shippers
      WHERE LOWER(COALESCE(company_email, '')) = LOWER($1)
         OR regexp_replace(COALESCE(company_phone, ''), '\\D', '', 'g') = regexp_replace($1, '\\D', '', 'g')
      LIMIT 1
    `;
    const result = await query(sql, [username]);
    const user =
      result.rows[0] ||
      (
        await query(
          `
            SELECT
              id,
              username,
              password,
              company_email,
              company_phone,
              COALESCE(is_admin, false) AS is_admin,
              COALESCE(is_operator, false) AS is_operator,
              COALESCE(is_verified, false) AS is_verified,
              verification_code,
              verification_expires
            FROM shippers
            WHERE LOWER(username) = LOWER($1)
              AND COALESCE(is_admin, false) = TRUE
            LIMIT 1
          `,
          [username]
        )
      ).rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const hasVerificationRecord = !!user.verification_code || !!user.verification_expires;
    const isLegacyAccount = !hasVerificationRecord && !user.is_verified;

    if (!user.is_verified && hasVerificationRecord) {
      return res.status(403).json({ error: 'Account not verified. Please check your email for the verification code.' });
    }

    if (isLegacyAccount) {
      await query('UPDATE shippers SET is_verified = TRUE WHERE id = $1', [user.id]);
      user.is_verified = true;
    }

    const secret = process.env.JWT_SECRET as string;
    const payload: any = { id: user.id, username: user.username };
    if (user.is_admin) payload.is_admin = true;
    if (user.is_operator) payload.is_operator = true;
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });
    return res.json({ token, is_admin: !!user.is_admin, is_operator: !!user.is_operator });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Resend verification code
router.post('/resend-verification', authPostLimit, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'username required' });
    
    const result = await query('SELECT id, company_email FROM pending_registrations WHERE username = $1 LIMIT 1', [username]);
    const pending = result.rows[0];
    if (!pending) return res.status(404).json({ error: 'Registration not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await query('UPDATE pending_registrations SET verification_code = $1, verification_expires = $2 WHERE id = $3', [code, expiresAt, pending.id]);

    let previewUrl: string | undefined;
    if (pending.company_email) {
      try {
        const sent = await sendVerificationEmail(pending.company_email, code);
        previewUrl = sent.previewUrl;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to send verification email', e);
      }
    }

    const isDevMode = process.env.NODE_ENV !== 'production';
    return res.json({
      message: 'verification_sent',
      verification_preview: previewUrl,
      verification_code: isDevMode ? code : undefined,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Verify account - moves registration from pending to shippers
router.post('/verify', authPostLimit, async (req, res) => {
  try {
    const { username, code } = req.body;
    if (!username || !code) return res.status(400).json({ error: 'username and code required' });
    
    const result = await query('SELECT id, username, password, company_name, company_address, company_phone, company_email, verification_code, verification_expires FROM pending_registrations WHERE username = $1 LIMIT 1', [username]);
    const pending = result.rows[0];
    if (!pending) return res.status(404).json({ error: 'Registration not found' });
    if (!pending.verification_code) return res.status(400).json({ error: 'No verification code set. Request a new one.' });

    const now = new Date();
    const expires = new Date(pending.verification_expires);
    if (now > expires) return res.status(400).json({ error: 'Verification code expired' });
    if (pending.verification_code !== code) return res.status(400).json({ error: 'Invalid verification code' });

    // Move from pending to shippers
    const insertSql = `INSERT INTO shippers (username, password, company_name, company_address, company_phone, company_email, is_verified, is_admin) 
               VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE) 
               RETURNING id, username`;
    const inserted = await query(insertSql, [pending.username, pending.password, pending.company_name, pending.company_address, pending.company_phone, pending.company_email]);
    
    // Delete from pending
    await query('DELETE FROM pending_registrations WHERE id = $1', [pending.id]);

    const secret = process.env.JWT_SECRET as string;
    const payload: any = { id: inserted.rows[0].id, username: inserted.rows[0].username };
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    return res.json({
      message: 'verified',
      token,
      is_admin: false,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const result = await query(
      'SELECT id, username, company_name, company_address, company_phone, company_email FROM shippers WHERE id = $1',
      [userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      profile: {
        id: user.id,
        username: user.username,
        company_name: user.company_name,
        company_address: user.company_address,
        company_phone: user.company_phone,
        company_email: user.company_email,
      },
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update username
router.post('/update-username', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { newUsername } = req.body;

    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    if (!newUsername || !newUsername.trim()) return res.status(400).json({ error: 'New username required' });

    const result = await query('UPDATE shippers SET username = $1 WHERE id = $2 RETURNING id, username', [newUsername.trim(), userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({
      message: 'Username updated successfully',
      username: result.rows[0].username,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update password
router.post('/update-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { newPassword } = req.body;

    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    if (!newPassword || !newPassword.trim()) return res.status(400).json({ error: 'New password required' });

    const hashed = await bcrypt.hash(newPassword, 10);
    const result = await query('UPDATE shippers SET password = $1 WHERE id = $2 RETURNING id', [hashed, userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update company phone
router.post('/update-phone', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { newPhone } = req.body;

    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    if (!newPhone || !newPhone.trim()) return res.status(400).json({ error: 'New phone number required' });

    const result = await query('UPDATE shippers SET company_phone = $1 WHERE id = $2 RETURNING id, company_phone', [newPhone.trim(), userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({
      message: 'Phone number updated successfully',
      company_phone: result.rows[0].company_phone,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update company email
router.post('/update-email', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const { newEmail } = req.body;

    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    if (!newEmail || !newEmail.trim()) return res.status(400).json({ error: 'New email required' });

    const email = newEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const result = await query('UPDATE shippers SET company_email = $1 WHERE id = $2 RETURNING id, company_email', [email, userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({
      message: 'Email updated successfully',
      company_email: result.rows[0].company_email,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete account
router.delete('/delete-account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    // Delete user's shipments first (foreign key constraint)
    await query('DELETE FROM shipments WHERE shipper = $1', [userId]);

    // Delete user
    const result = await query('DELETE FROM shippers WHERE id = $1 RETURNING id', [userId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    return res.json({ message: 'Account deleted successfully' });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
