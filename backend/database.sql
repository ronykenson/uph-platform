-- ============================================================
--  database.sql  —  UPH Database Schema  (v1.0 — production)
--  Safe to run on a fresh database OR an existing one.
--  All tables use CREATE TABLE IF NOT EXISTS.
--  All inserts use INSERT IGNORE.
--
--  First-time setup:
--    mysql -u root -p < database.sql
--
--  On VPS:
--    mysql -u uph_user -p uph_database < database.sql
-- ============================================================

-- Create the database
CREATE DATABASE IF NOT EXISTS uph_database
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE uph_database;

-- ------------------------------------------------------------
-- USERS  (authentication for all roles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,          -- SHA-256 hex
  role        ENUM('admin','professor','student') NOT NULL DEFAULT 'student',
  status      ENUM('pending','active','rejected') NOT NULL DEFAULT 'active',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- STUDENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  student_code VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. UPH-2025-001
  faculty      VARCHAR(100) NOT NULL,
  level        VARCHAR(50)  DEFAULT NULL,      -- e.g. Licence, Master
  diploma      VARCHAR(100) DEFAULT NULL,      -- diploma from application
  school       VARCHAR(150) DEFAULT NULL,      -- previous school
  motivation   TEXT         DEFAULT NULL,      -- motivation letter
  semester     VARCHAR(10)  NOT NULL DEFAULT 'S1',
  phone        VARCHAR(20),
  address      VARCHAR(200),
  dob          DATE,
  photo        VARCHAR(500) DEFAULT NULL,
  status       ENUM('active','inactive') DEFAULT 'active',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- PROFESSORS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS professors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NOT NULL,
  department VARCHAR(100) NOT NULL,
  title      VARCHAR(100) DEFAULT 'Professeur',
  phone      VARCHAR(20),
  status     ENUM('active','inactive','pending','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- COURSES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(20)  NOT NULL UNIQUE,   -- e.g. INFO-301
  name         VARCHAR(150) NOT NULL,
  faculty      VARCHAR(100) NOT NULL,
  professor_id INT,
  credits      INT          NOT NULL DEFAULT 3,
  max_students INT          NOT NULL DEFAULT 35,
  status       ENUM('active','inactive') DEFAULT 'active',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (professor_id) REFERENCES professors(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- ENROLLMENTS  (student ↔ course)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  student_id   INT NOT NULL,
  course_id    INT NOT NULL,
  semester     VARCHAR(20) NOT NULL,           -- e.g. S3-2025
  enrolled_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_enrollment (student_id, course_id, semester),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- GRADES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grades (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  student_id  INT            NOT NULL,
  course_id   INT            NOT NULL,
  grade       DECIMAL(4, 2)  NOT NULL,         -- e.g. 15.50
  comment     VARCHAR(255),
  graded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_grade (student_id, course_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- SCHEDULES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  course_id   INT         NOT NULL,
  day         ENUM('Lundi','Mardi','Mercredi','Jeudi','Vendredi') NOT NULL,
  start_time  VARCHAR(10) NOT NULL,            -- e.g. "08:00"
  room        VARCHAR(50),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- APPLICATIONS  (prospective students)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(80)  NOT NULL,
  last_name   VARCHAR(80)  NOT NULL,
  email       VARCHAR(150) NOT NULL,
  phone       VARCHAR(20),
  faculty     VARCHAR(100) NOT NULL,
  level       VARCHAR(50)  NOT NULL DEFAULT 'Licence',
  diploma     VARCHAR(100),
  school      VARCHAR(150),
  motivation  TEXT,
  status      ENUM('pending','approved','rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- MESSAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  from_user   INT         NOT NULL,
  to_user     INT,                             -- NULL = to Administration
  subject     VARCHAR(200) NOT NULL,
  body        TEXT         NOT NULL,
  is_read     BOOLEAN      DEFAULT FALSE,
  sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT         NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL,
  type        ENUM('info','success','warning','error') DEFAULT 'info',
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- ACTIVITY LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_email VARCHAR(150),
  action     VARCHAR(100) NOT NULL,
  details    VARCHAR(255),
  logged_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  DEFAULT ADMIN ACCOUNT
--  Email:    admin@uph
--  Password: UPH@2026  (SHA-256)
-- ============================================================
INSERT IGNORE INTO users (name, email, password, role, status)
VALUES (
  'Administrateur Principal',
  'admin@uph',
  'e9b50b5919643a4f871f7f3b7e813665fded980f65bf6cd4e858440d8b5f0725',
  'admin',
  'active'
);

-- ============================================================
--  SEED COURSES  —  run once to populate the course catalogue
-- ============================================================
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('INFO-101', 'Introduction à la Programmation',          'Sciences et Technologies',  3, 35, 'active'),
('INFO-201', 'Algorithmique et Structures de Données',   'Sciences et Technologies',  3, 30, 'active'),
('INFO-301', 'Bases de Données Relationnelles',          'Sciences et Technologies',  3, 30, 'active'),
('INFO-401', 'Développement Web',                        'Sciences et Technologies',  3, 30, 'active'),
('INFO-501', 'Réseaux et Systèmes',                      'Sciences et Technologies',  3, 25, 'active'),
('MATH-101', 'Mathématiques Discrètes',                  'Sciences et Technologies',  3, 40, 'active'),
('MATH-201', 'Probabilités et Statistiques',             'Sciences et Technologies',  3, 40, 'active'),
('GEST-101', 'Principes de Management',                  'Sciences de Gestion',       3, 45, 'active'),
('GEST-201', 'Comptabilité Générale',                    'Sciences de Gestion',       3, 40, 'active'),
('GEST-301', 'Marketing et Communication',               'Sciences de Gestion',       3, 40, 'active'),
('DROIT-101','Introduction au Droit',                    'Droit',                     3, 50, 'active'),
('DROIT-201','Droit Commercial',                         'Droit',                     3, 45, 'active'),
('MED-101',  'Anatomie Générale',                        'Sciences de la Santé',      4, 25, 'active'),
('MED-201',  'Physiologie Humaine',                      'Sciences de la Santé',      4, 25, 'active'),
('EDU-101',  'Psychologie de l\'Éducation',              'Sciences de l\'Éducation',  3, 45, 'active');

-- ============================================================
--  SAFE MIGRATION — adds columns that may be missing on older
--  installs. Each block runs only if the column is absent.
--  Safe to re-run at any time.
-- ============================================================

-- students: extended profile columns (added in v1.0)
SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'level');
SET @sql = IF(@col = 0, 'ALTER TABLE students ADD COLUMN level VARCHAR(50) DEFAULT NULL AFTER faculty', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'diploma');
SET @sql = IF(@col = 0, 'ALTER TABLE students ADD COLUMN diploma VARCHAR(100) DEFAULT NULL AFTER level', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'school');
SET @sql = IF(@col = 0, 'ALTER TABLE students ADD COLUMN school VARCHAR(150) DEFAULT NULL AFTER diploma', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'motivation');
SET @sql = IF(@col = 0, 'ALTER TABLE students ADD COLUMN motivation TEXT DEFAULT NULL AFTER school', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'photo');
SET @sql = IF(@col = 0, 'ALTER TABLE students ADD COLUMN photo VARCHAR(500) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Schema up to date.' AS status;
-- ============================================================