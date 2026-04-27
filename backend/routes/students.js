// ============================================================
//  routes/students.js  —  Student CRUD + Photo Upload Routes
// ============================================================

const express = require('express');
const path    = require('path');
const multer  = require('multer');
const router  = express.Router();
const db      = require('../config/db');

// ── Multer: store files in backend/uploads/, timestamped filenames ──
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext     = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Format invalide. Utilisez JPG, PNG, GIF ou WEBP.'));
  }
});

// GET /api/students  —  list all students
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, u.name, u.email
      FROM   students s
      JOIN   users u ON u.id = s.user_id
      ORDER  BY s.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/me?user_id=X  —  logged-in student's full profile
// Declared BEFORE /:id so Express doesn't treat "me" as an id.
router.get('/me', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id query param requis.' });
  }
  try {
    const [[student]] = await db.query(
      `SELECT s.*, u.name, u.email
       FROM   students s
       JOIN   users    u ON u.id = s.user_id
       WHERE  s.user_id = ?`,
      [user_id]
    );
    if (!student) {
      return res.status(404).json({ success: false, message: 'Profil étudiant introuvable.' });
    }

    const [grades] = await db.query(
      `SELECT g.*, c.name AS course_name, c.code AS course_code
       FROM   grades  g
       JOIN   courses c ON c.id = g.course_id
       WHERE  g.student_id = ?`,
      [student.id]
    );

    const [enrollments] = await db.query(
      `SELECT e.*, c.name AS course_name, c.code, c.credits, c.faculty,
              u.name AS professor_name
       FROM   enrollments e
       JOIN   courses     c ON c.id = e.course_id
       LEFT JOIN professors p ON p.id = c.professor_id
       LEFT JOIN users      u ON u.id = p.user_id
       WHERE  e.student_id = ?`,
      [student.id]
    );

    console.log(`[students/me] user_id=${user_id} → student=${student.id}`);
    res.json({ success: true, data: { ...student, grades, enrollments } });
  } catch (err) {
    console.error('[students/me] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/students/me  —  update phone and address only
// Photo is updated exclusively via POST /upload-photo to avoid nulling it on every save.
router.patch('/me', async (req, res) => {
  try {
    const { user_id, phone, address } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id requis.' });
    }
    await db.query(
      'UPDATE students SET phone = ?, address = ? WHERE user_id = ?',
      [phone || null, address || null, user_id]
    );
    console.log(`[students/me PATCH] user_id=${user_id}`);
    res.json({ success: true, message: 'Profil mis à jour.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/students/upload-photo
// multipart/form-data: { photo: <file>, user_id: <number> }
// Declared BEFORE /:id to avoid route conflicts.
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier reçu.' });
    }
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id requis.' });
    }

    const photoUrl = '/uploads/' + req.file.filename;

    await db.query(
      'UPDATE students SET photo = ? WHERE user_id = ?',
      [photoUrl, user_id]
    );

    console.log(`[upload-photo] user_id=${user_id} → ${photoUrl}`);
    res.json({ success: true, message: 'Photo mise à jour.', photoUrl });
  } catch (err) {
    console.error('[upload-photo] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/students/:id  —  single student + grades + enrollments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [[student]] = await db.query(`
      SELECT s.*, u.name, u.email
      FROM   students s JOIN users u ON u.id = s.user_id
      WHERE  s.id = ?
    `, [id]);

    if (!student) return res.status(404).json({ success: false, message: 'Étudiant introuvable.' });

    const [grades] = await db.query(`
      SELECT g.*, c.name AS course_name, c.code AS course_code
      FROM   grades g JOIN courses c ON c.id = g.course_id
      WHERE  g.student_id = ?
    `, [id]);

    const [enrollments] = await db.query(`
      SELECT e.*, c.name AS course_name, c.code, c.credits, c.faculty,
             u.name AS professor_name
      FROM   enrollments e
      JOIN   courses     c ON c.id = e.course_id
      LEFT JOIN professors p ON p.id = c.professor_id
      LEFT JOIN users      u ON u.id = p.user_id
      WHERE  e.student_id = ?
    `, [id]);

    res.json({ success: true, data: { ...student, grades, enrollments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/students/:id  —  update phone and address (admin use)
router.put('/:id', async (req, res) => {
  try {
    const { phone, address } = req.body;
    await db.query(
      'UPDATE students SET phone = ?, address = ? WHERE id = ?',
      [phone || null, address || null, req.params.id]
    );
    res.json({ success: true, message: 'Profil mis à jour.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Étudiant supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
