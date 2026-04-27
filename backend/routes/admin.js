// ============================================================
//  routes/admin.js  —  Admin-only account management
//  All accounts created here are immediately active (status=active).
//  Only an existing admin should call these endpoints.
// ============================================================

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const db      = require('../config/db');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// ------------------------------------------------------------
//  POST /api/admin/users
//  Body: { name, email, password, role, department?, phone? }
//  role: 'admin' | 'professor' | 'student'
//  Creates user immediately active. Also creates the matching
//  profile row (professors or students) when relevant.
// ------------------------------------------------------------
router.post('/users', async (req, res) => {
  const { name, email, password, role, department, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Nom, email, mot de passe et rôle sont obligatoires.'
    });
  }
  if (!['admin', 'professor', 'student'].includes(role)) {
    return res.status(400).json({ success: false, message: "Rôle invalide. Utilisez 'admin', 'professor' ou 'student'." });
  }
  if (role === 'professor' && !department) {
    return res.status(400).json({ success: false, message: 'Département requis pour un professeur.' });
  }

  try {
    const [[existing]] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé.' });
    }

    // Create user — immediately active because an admin is doing this directly
    const [userResult] = await db.query(
      'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, sha256(password), role, 'active']
    );
    const userId = userResult.insertId;

    // Create matching profile row
    if (role === 'professor') {
      await db.query(
        "INSERT INTO professors (user_id, department, phone, status) VALUES (?, ?, ?, 'active')",
        [userId, department, phone || null]
      );
    }

    if (role === 'student') {
      const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM students');
      const year         = new Date().getFullYear();
      const seq          = String(Number(total) + 1).padStart(3, '0');
      const student_code = `UPH-${year}-${seq}`;
      await db.query(
        'INSERT INTO students (user_id, student_code, faculty, phone) VALUES (?, ?, ?, ?)',
        [userId, student_code, department || 'Général', phone || null]
      );
    }

    console.log(`[admin/users] created user=${userId}, role=${role}, email=${email}`);
    res.status(201).json({
      success: true,
      message: `Compte ${role} créé avec succès.`,
      userId
    });

  } catch (err) {
    console.error('[admin/users] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  GET /api/admin/activity?limit=N
//  Returns recent activity log entries from MySQL.
// ------------------------------------------------------------
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const [rows] = await db.query(
      'SELECT * FROM activity_log ORDER BY logged_at DESC LIMIT ?',
      [limit]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  POST /api/admin/activity
//  Body: { action, user_email?, details? }
//  Logs an activity entry to MySQL.
// ------------------------------------------------------------
router.post('/activity', async (req, res) => {
  try {
    const { action, user_email, details } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, message: 'action requis.' });
    }
    await db.query(
      'INSERT INTO activity_log (user_email, action, details) VALUES (?, ?, ?)',
      [user_email || null, action, details || null]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
