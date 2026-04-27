-- ============================================================
--  migrate_students.sql
--  Compatible with MySQL 5.x and 8.x (no IF NOT EXISTS syntax).
--
--  ── VERSION A ── Fresh schema / columns definitely missing
--  Run this if the students table was just created and these
--  columns do not exist at all:
--
--    mysql -u root -p uph_database < backend/migrate_students.sql
--
--  ── VERSION B ── One column at a time (manual, safe)
--  If some columns already exist, run only the ones you need
--  from the individual statements at the bottom of this file.
-- ============================================================

USE uph_database;

-- ── Diagnostic: see what columns exist right now ─────────────
SELECT 'BEFORE migration — current students columns:' AS status;
DESCRIBE students;

-- ============================================================
--  VERSION A — Run all at once (only if ALL columns are missing)
--  Comment this block out and use Version B if you get
--  "Duplicate column name" errors.
-- ============================================================

ALTER TABLE students
  ADD COLUMN level       VARCHAR(50)   DEFAULT NULL AFTER faculty,
  ADD COLUMN diploma     VARCHAR(100)  DEFAULT NULL AFTER level,
  ADD COLUMN school      VARCHAR(150)  DEFAULT NULL AFTER diploma,
  ADD COLUMN motivation  TEXT          DEFAULT NULL AFTER school,
  ADD COLUMN photo       VARCHAR(255)  DEFAULT NULL;

-- ============================================================
--  VERSION B — One column at a time
--  Run only the lines for columns that are actually missing.
--  Safe to skip any that already exist.
-- ============================================================

--  ALTER TABLE students ADD COLUMN level       VARCHAR(50)  DEFAULT NULL AFTER faculty;
--  ALTER TABLE students ADD COLUMN diploma     VARCHAR(100) DEFAULT NULL AFTER level;
--  ALTER TABLE students ADD COLUMN school      VARCHAR(150) DEFAULT NULL AFTER diploma;
--  ALTER TABLE students ADD COLUMN motivation  TEXT         DEFAULT NULL AFTER school;
--  ALTER TABLE students ADD COLUMN photo       VARCHAR(255) DEFAULT NULL;

-- ── Diagnostic: confirm result ───────────────────────────────
SELECT 'AFTER migration — updated students columns:' AS status;
DESCRIBE students;

SELECT 'Migration complete.' AS status;
