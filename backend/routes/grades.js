// ============================================================
//  routes/grades.js  —  Grade Routes
// ============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET /api/grades?course_id=X
//   Returns all enrolled students for a course with their current grade.
//   Used by professor grade-input panel.
//
// GET /api/grades?student_id=X
//   Returns all grades for a student with course info.
//   Used by student grades panel (supplementary — /students/me already includes grades).
router.get('/', async (req, res) => {
  try {
    const { course_id, student_id } = req.query;

    if (course_id) {
      // All students enrolled in this course + their current grade
      const [rows] = await db.query(`
        SELECT s.id          AS student_id,
               s.student_code,
               u.name,
               u.email,
               g.id          AS grade_id,
               g.grade,
               g.comment,
               g.graded_at
        FROM   enrollments e
        JOIN   students    s ON s.id = e.student_id
        JOIN   users       u ON u.id = s.user_id
        LEFT JOIN grades   g ON g.student_id = s.id AND g.course_id = ?
        WHERE  e.course_id = ?
        ORDER  BY u.name ASC
      `, [course_id, course_id]);
      return res.json({ success: true, data: rows });
    }

    if (student_id) {
      const [rows] = await db.query(`
        SELECT g.*, c.name AS course_name, c.code AS course_code
        FROM   grades  g
        JOIN   courses c ON c.id = g.course_id
        WHERE  g.student_id = ?
        ORDER  BY g.graded_at DESC
      `, [student_id]);
      return res.json({ success: true, data: rows });
    }

    return res.status(400).json({ success: false, message: 'course_id ou student_id requis.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/grades  —  upsert a grade
//   Body: { student_id, course_id, grade, comment? }
//   Uses INSERT ... ON DUPLICATE KEY UPDATE (UNIQUE KEY on student_id+course_id)
router.put('/', async (req, res) => {
  try {
    const { student_id, course_id, grade, comment } = req.body;

    if (student_id == null || course_id == null || grade == null) {
      return res.status(400).json({ success: false, message: 'student_id, course_id et grade requis.' });
    }
    const g = parseFloat(grade);
    if (isNaN(g) || g < 0 || g > 20) {
      return res.status(400).json({ success: false, message: 'La note doit être entre 0 et 20.' });
    }

    // Security: if professor_id is supplied, verify this course belongs to them
    const { professor_id } = req.body;
    if (professor_id) {
      const [[course]] = await db.query('SELECT professor_id FROM courses WHERE id = ?', [course_id]);
      if (!course || String(course.professor_id) !== String(professor_id)) {
        return res.status(403).json({ success: false, message: 'Non autorisé : ce cours ne vous est pas assigné.' });
      }
    }

    await db.query(
      `INSERT INTO grades (student_id, course_id, grade, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE grade = VALUES(grade), comment = VALUES(comment), graded_at = CURRENT_TIMESTAMP`,
      [student_id, course_id, g, comment || null]
    );

    console.log(`[grades PUT] student=${student_id} course=${course_id} grade=${g}`);
    res.json({ success: true, message: 'Note sauvegardée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
