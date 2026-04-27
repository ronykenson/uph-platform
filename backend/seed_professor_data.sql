-- ============================================================
--  seed_professor_data.sql
--  Assigns courses to professors and creates sample enrollments.
--
--  STEP 1 — Run this to see your current IDs:
--    mysql -u root -p uph_database < seed_professor_data.sql
--
--  STEP 2 — Fill in the UPDATE/INSERT statements below with
--            real IDs from the SELECT output, then run again.
-- ============================================================

USE uph_database;

-- ── Diagnostics ────────────────────────────────────────────
SELECT '=== PROFESSORS ===' AS info;
SELECT id, department, status,
       (SELECT name FROM users WHERE id = p.user_id) AS name
FROM professors p
ORDER BY id;

SELECT '=== COURSES (first 15) ===' AS info;
SELECT id, code, name, professor_id FROM courses ORDER BY id LIMIT 15;

SELECT '=== STUDENTS (first 5) ===' AS info;
SELECT id, student_code,
       (SELECT name FROM users WHERE id = s.user_id) AS name
FROM students s ORDER BY id LIMIT 5;

-- ── Assign courses to professors by code (safe — uses code, not id) ──
-- Courses from seed_courses.sql are assigned here.
-- Edit professor_id values to match your actual professor IDs.

-- Example: assign INFO/MATH courses to professor id=1
--   UPDATE courses SET professor_id = 1
--   WHERE code IN ('INFO-101','INFO-201','INFO-301','INFO-401','INFO-501','MATH-101','MATH-201');

-- Example: assign GEST/DROIT courses to professor id=2
--   UPDATE courses SET professor_id = 2
--   WHERE code IN ('GEST-101','GEST-201','GEST-301','DROIT-101','DROIT-201');

-- Example: assign MED/EDU courses to professor id=3
--   UPDATE courses SET professor_id = 3
--   WHERE code IN ('MED-101','MED-201','EDU-101');


-- ── Quick single-professor assignment (uncomment & edit) ──
-- This assigns the first 4 seeded courses to the first active professor.
-- Replace '1' in professor_id with your actual professor id.
--
-- UPDATE courses SET professor_id = 1
-- WHERE code IN ('INFO-101','INFO-201','INFO-301','INFO-401');


-- ── Sample enrollments (uncomment & edit) ──
-- Replace student_id and course_id with real IDs.
-- INSERT IGNORE INTO enrollments (student_id, course_id, semester) VALUES
-- (1, 1, 'S1-2026'),
-- (1, 2, 'S1-2026'),
-- (1, 3, 'S1-2026'),
-- (2, 1, 'S1-2026'),
-- (2, 2, 'S1-2026'),
-- (3, 1, 'S1-2026'),
-- (3, 3, 'S1-2026'),
-- (3, 4, 'S1-2026');


-- ── Verify result ───────────────────────────────────────────
SELECT '=== COURSES WITH PROFESSORS (after update) ===' AS info;
SELECT c.id, c.code, c.name,
       p.id   AS professor_id,
       u.name AS professor_name
FROM   courses c
LEFT JOIN professors p ON p.id = c.professor_id
LEFT JOIN users      u ON u.id = p.user_id
ORDER  BY c.id;

SELECT '=== ENROLLMENTS ===' AS info;
SELECT e.id, s.student_code, u.name AS student_name,
       c.code AS course_code, e.semester
FROM   enrollments e
JOIN   students s ON s.id = e.student_id
JOIN   users    u ON u.id = s.user_id
JOIN   courses  c ON c.id = e.course_id
ORDER  BY e.id;
