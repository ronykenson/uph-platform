// ============================================================
//  routes/professors.js  —  Professor Routes
//  ROUTE ORDER MATTERS: literal paths (/pending) before param paths (/:id)
// ============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET /api/professors  —  all active professors
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, u.name, u.email
      FROM   professors p
      JOIN   users u ON u.id = p.user_id
      WHERE  p.status = 'active'
      ORDER  BY u.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/professors/pending  —  professor requests awaiting admin approval
// Must be declared BEFORE /:id so Express does not treat "pending" as an id.
router.get('/pending', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.department, p.phone, p.title, p.status, p.created_at,
             u.id    AS user_id,
             u.name,
             u.email
      FROM   professors p
      JOIN   users      u ON u.id = p.user_id
      WHERE  p.status = 'pending'
      ORDER  BY p.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[professors/pending] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/professors/by-user/:user_id  —  resolve professor record by users.id
// Must be declared BEFORE /:id so Express does not treat "by-user" as a numeric id.
router.get('/by-user/:user_id', async (req, res) => {
  try {
    const [[prof]] = await db.query(`
      SELECT p.*, u.name, u.email
      FROM   professors p
      JOIN   users u ON u.id = p.user_id
      WHERE  p.user_id = ?
    `, [req.params.user_id]);
    if (!prof) {
      return res.status(404).json({ success: false, message: 'Aucun profil professeur pour cet utilisateur.' });
    }
    console.log(`[professors/by-user] user_id=${req.params.user_id} → prof_id=${prof.id}, status=${prof.status}`);
    res.json({ success: true, data: prof });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/professors/:id  —  single professor profile
router.get('/:id', async (req, res) => {
  try {
    const [[prof]] = await db.query(`
      SELECT p.*, u.name, u.email
      FROM   professors p
      JOIN   users u ON u.id = p.user_id
      WHERE  p.id = ?
    `, [req.params.id]);
    if (!prof) {
      return res.status(404).json({ success: false, message: 'Professeur introuvable.' });
    }
    res.json({ success: true, data: prof });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/professors/:id/courses  —  courses assigned to this professor
router.get('/:id/courses', async (req, res) => {
  try {
    const [courses] = await db.query(`
      SELECT c.*,
             COUNT(e.id) AS enrolled_count
      FROM   courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      WHERE  c.professor_id = ?
      GROUP  BY c.id
    `, [req.params.id]);
    res.json({ success: true, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/professors/:id/students  —  all students in this professor's courses
// Each row is one (student × course) pair for easy filtering on the frontend.
router.get('/:id/students', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.id         AS student_id,
             s.student_code,
             s.faculty,
             s.semester,
             u.name,
             u.email,
             c.id         AS course_id,
             c.name       AS course_name,
             c.code       AS course_code,
             g.grade
      FROM   courses     c
      JOIN   enrollments e ON e.course_id = c.id
      JOIN   students    s ON s.id = e.student_id
      JOIN   users       u ON u.id = s.user_id
      LEFT JOIN grades   g ON g.student_id = s.id AND g.course_id = c.id
      WHERE  c.professor_id = ?
      ORDER  BY u.name ASC
    `, [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/professors/:id/stats  —  aggregate stats for the professor dashboard
router.get('/:id/stats', async (req, res) => {
  const id = req.params.id;
  try {
    const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*)
         FROM   courses
         WHERE  professor_id = ?)                              AS courses,
        (SELECT COUNT(*)
         FROM   enrollments e
         JOIN   courses c ON c.id = e.course_id
         WHERE  c.professor_id = ?)                           AS students,
        (SELECT COUNT(*)
         FROM   grades g
         JOIN   courses c ON c.id = g.course_id
         WHERE  c.professor_id = ?)                           AS grades_entered
    `, [id, id, id]);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[professors/stats] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/professors/:id/approve
router.patch('/:id/approve', async (req, res) => {
  const { id } = req.params;
  try {
    const [[prof]] = await db.query('SELECT * FROM professors WHERE id = ?', [id]);
    if (!prof) {
      return res.status(404).json({ success: false, message: 'Professeur introuvable.' });
    }
    await db.query("UPDATE professors SET status = 'active' WHERE id = ?", [id]);
    await db.query("UPDATE users      SET status = 'active' WHERE id = ?", [prof.user_id]);
    console.log(`[prof-approve] prof=${id}, user=${prof.user_id} → active`);
    res.json({ success: true, message: 'Compte professeur approuvé.' });
  } catch (err) {
    console.error('[prof-approve] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/professors/:id/reject
router.patch('/:id/reject', async (req, res) => {
  const { id } = req.params;
  try {
    const [[prof]] = await db.query('SELECT * FROM professors WHERE id = ?', [id]);
    if (!prof) {
      return res.status(404).json({ success: false, message: 'Professeur introuvable.' });
    }
    await db.query("UPDATE professors SET status = 'rejected' WHERE id = ?", [id]);
    await db.query("UPDATE users      SET status = 'rejected' WHERE id = ?", [prof.user_id]);
    console.log(`[prof-reject] prof=${id}, user=${prof.user_id} → rejected`);
    res.json({ success: true, message: 'Demande de compte refusée.' });
  } catch (err) {
    console.error('[prof-reject] error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/professors/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM professors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Professeur supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
