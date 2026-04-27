// ============================================================
//  routes/courses.js  —  Course CRUD + Enrollment Routes
// ============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET /api/courses  —  all courses with professor name
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*,
             u.name         AS professor_name,
             COUNT(e.id)    AS enrolled_count
      FROM   courses c
      LEFT JOIN professors p ON p.id = c.professor_id
      LEFT JOIN users      u ON u.id = p.user_id
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP  BY c.id
      ORDER  BY c.code ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/courses  —  create a new course
router.post('/', async (req, res) => {
  try {
    const { code, name, faculty, professor_id, credits, max_students } = req.body;
    if (!code || !name || !faculty) {
      return res.status(400).json({ success: false, message: 'code, name et faculty sont requis.' });
    }
    const [result] = await db.query(
      'INSERT INTO courses (code, name, faculty, professor_id, credits, max_students) VALUES (?, ?, ?, ?, ?, ?)',
      [code, name, faculty, professor_id || null, credits || 3, max_students || 35]
    );
    res.status(201).json({ success: true, message: 'Cours créé.', courseId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/courses/:id  —  update course fields (assign professor, rename, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const { professor_id, name, credits, max_students, status } = req.body;
    const fields = [];
    const vals   = [];
    if (professor_id !== undefined) { fields.push('professor_id = ?'); vals.push(professor_id || null); }
    if (name         !== undefined) { fields.push('name = ?');         vals.push(name); }
    if (credits      !== undefined) { fields.push('credits = ?');      vals.push(Number(credits)); }
    if (max_students !== undefined) { fields.push('max_students = ?'); vals.push(Number(max_students)); }
    if (status       !== undefined) { fields.push('status = ?');       vals.push(status); }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: 'Aucun champ à mettre à jour.' });
    }
    vals.push(req.params.id);
    await db.query(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, vals);
    console.log(`[courses PATCH] id=${req.params.id} fields: ${fields.join(', ')}`);
    res.json({ success: true, message: 'Cours mis à jour.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/courses/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Cours supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/courses/:id/enroll  —  enroll a student in a course
router.post('/:id/enroll', async (req, res) => {
  try {
    const { student_id, semester } = req.body;
    if (!student_id || !semester) {
      return res.status(400).json({ success: false, message: 'student_id et semester requis.' });
    }

    // Check capacity
    const [[course]] = await db.query('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM enrollments WHERE course_id = ?', [req.params.id]
    );
    if (count >= course.max_students) {
      return res.status(400).json({ success: false, message: 'Ce cours est complet.' });
    }

    await db.query(
      'INSERT INTO enrollments (student_id, course_id, semester) VALUES (?, ?, ?)',
      [student_id, req.params.id, semester]
    );
    res.status(201).json({ success: true, message: 'Inscription réussie!' });
  } catch (err) {
    // Duplicate entry = already enrolled
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Étudiant déjà inscrit à ce cours.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;