// ============================================================
//  routes/enrollments.js  —  Enrollment Resource
// ============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET /api/enrollments?student_id=X
router.get('/', async (req, res) => {
  try {
    const { student_id } = req.query;
    if (!student_id) {
      return res.status(400).json({ success: false, message: 'student_id requis.' });
    }
    const [rows] = await db.query(
      `SELECT e.*,
              c.name    AS course_name,
              c.code,
              c.credits,
              c.faculty,
              u.name    AS professor_name
       FROM   enrollments e
       JOIN   courses     c ON c.id = e.course_id
       LEFT JOIN professors p ON p.id = c.professor_id
       LEFT JOIN users      u ON u.id = p.user_id
       WHERE  e.student_id = ?
       ORDER  BY e.enrolled_at DESC`,
      [student_id]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/enrollments  —  enroll a student in a course
router.post('/', async (req, res) => {
  try {
    const { student_id, course_id, semester } = req.body;
    if (!student_id || !course_id || !semester) {
      return res.status(400).json({
        success: false,
        message: 'student_id, course_id et semester sont requis.'
      });
    }

    // Verify course exists
    const [[course]] = await db.query('SELECT * FROM courses WHERE id = ?', [course_id]);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Cours introuvable.' });
    }

    // Check capacity
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM enrollments WHERE course_id = ?',
      [course_id]
    );
    if (Number(count) >= Number(course.max_students)) {
      return res.status(400).json({ success: false, message: 'Ce cours est complet.' });
    }

    await db.query(
      'INSERT INTO enrollments (student_id, course_id, semester) VALUES (?, ?, ?)',
      [student_id, course_id, semester]
    );

    console.log(`[enrollments POST] student=${student_id} course=${course_id} sem=${semester}`);
    res.status(201).json({ success: true, message: 'Inscription réussie!' });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Vous êtes déjà inscrit à ce cours.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/enrollments/:id  —  unenroll
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM enrollments WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Inscription introuvable.' });
    }
    console.log(`[enrollments DELETE] id=${req.params.id}`);
    res.json({ success: true, message: 'Désinscription effectuée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
