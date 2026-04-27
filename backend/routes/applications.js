// ============================================================
//  routes/applications.js  —  Student Application Routes
// ============================================================

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();
const db      = require('../config/db');

// ------------------------------------------------------------
//  GET /api/applications
//  Returns all applications (admin only in production)
// ------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { status } = req.query; // optional filter: ?status=pending

    let query  = 'SELECT * FROM applications';
    let params = [];

    if (status) {
      query  += ' WHERE status = ?';
      params  = [status];
    }

    query += ' ORDER BY submitted_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  POST /api/applications
//  Submit a new application
// ------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone,
      faculty, level, diploma, school, motivation
    } = req.body;

    // Basic validation
    if (!first_name || !last_name || !email || !faculty) {
      return res.status(400).json({
        success: false,
        message: 'Les champs prénom, nom, email et faculté sont obligatoires.'
      });
    }

    const [result] = await db.query(
      `INSERT INTO applications
         (first_name, last_name, email, phone, faculty, level, diploma, school, motivation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, phone, faculty, level, diploma, school, motivation]
    );

    res.status(201).json({
      success: true,
      message: 'Candidature soumise avec succès!',
      applicationId: result.insertId
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  PATCH /api/applications/:id/status
//  Approve or reject an application
// ------------------------------------------------------------
router.patch('/:id/status', async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'approved' or 'rejected'."
      });
    }

    await db.query(
      'UPDATE applications SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({
      success: true,
      message: `Candidature ${status === 'approved' ? 'approuvée' : 'refusée'}.`
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  PATCH /api/applications/:id/approve
//  1. Validate application exists and is pending
//  2. Generate student_code (UPH-YYYY-NNN)
//  3. Create users row (role=student)
//  4. Create students row linked to that user
//  5. Mark application approved
//  Returns generated credentials so admin can hand them to student
// ------------------------------------------------------------
router.patch('/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Fetch application
    const [[app]] = await db.query('SELECT * FROM applications WHERE id = ?', [id]);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Candidature introuvable.' });
    }
    if (app.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cette candidature a déjà été traitée.' });
    }

    // 2. Guard against duplicate email in users
    const [[existing]] = await db.query('SELECT id FROM users WHERE email = ?', [app.email]);
    if (existing) {
      return res.status(409).json({ success: false, message: 'Un compte existe déjà avec cet email.' });
    }

    // 3. Generate student_code: UPH-YYYY-NNN
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM students');
    const year         = new Date().getFullYear();
    const seq          = String(Number(total) + 1).padStart(3, '0');
    const student_code = `UPH-${year}-${seq}`;

    // 4. Generate temp password and hash with SHA-256 (built-in, no extra package)
    const tempPass = 'uph' + crypto.randomBytes(4).toString('hex'); // e.g. uph3f8a2c1d
    const passHash = crypto.createHash('sha256').update(tempPass).digest('hex');

    // 5. Create user account — status=active immediately (admin already approved)
    const fullName    = `${app.first_name} ${app.last_name}`;
    const [userResult] = await db.query(
      'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [fullName, app.email, passHash, 'student', 'active']
    );
    const userId = userResult.insertId;

    // 6. Create student profile — try full schema first, fall back to base columns
    //    (handles databases created from older schema without level/diploma/school/motivation)
    try {
      await db.query(
        'INSERT INTO students (user_id, student_code, faculty, level, diploma, school, motivation, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, student_code, app.faculty, app.level || null, app.diploma || null, app.school || null, app.motivation || null, app.phone || null]
      );
    } catch (insertErr) {
      if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
        // Old schema missing extended columns — fall back to base columns only.
        // Run backend/migrate_students.sql to permanently fix the schema.
        console.warn('[approve] ER_BAD_FIELD_ERROR — inserting with base columns only. Run migrate_students.sql to fix schema.');
        await db.query(
          'INSERT INTO students (user_id, student_code, faculty, phone) VALUES (?, ?, ?, ?)',
          [userId, student_code, app.faculty, app.phone || null]
        );
      } else {
        // Any other insert error: roll back user row and re-throw
        await db.query('DELETE FROM users WHERE id = ?', [userId]).catch(() => {});
        throw insertErr;
      }
    }

    // 7. Mark application approved
    await db.query('UPDATE applications SET status = ? WHERE id = ?', ['approved', id]);

    console.log(`[approve] app=${id} → user=${userId}, code=${student_code}`);

    res.json({
      success: true,
      message: 'Candidature approuvée. Compte étudiant créé.',
      credentials: {
        name:         fullName,
        email:        app.email,
        password:     tempPass,
        student_code: student_code
      }
    });

  } catch (err) {
    console.error('[approve] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------------------------------------------------
//  PATCH /api/applications/:id/reject
//  Mark application rejected (no side effects)
// ------------------------------------------------------------
router.patch('/:id/reject', async (req, res) => {
  const { id } = req.params;

  try {
    const [[app]] = await db.query('SELECT id, status FROM applications WHERE id = ?', [id]);
    if (!app) {
      return res.status(404).json({ success: false, message: 'Candidature introuvable.' });
    }
    if (app.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Cette candidature a déjà été traitée.' });
    }

    await db.query('UPDATE applications SET status = ? WHERE id = ?', ['rejected', id]);

    console.log(`[reject] app=${id} rejected`);

    res.json({ success: true, message: 'Candidature refusée.' });

  } catch (err) {
    console.error('[reject] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;