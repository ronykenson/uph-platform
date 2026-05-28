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
--  REAL COURSE CATALOGUE — Session II (DSE, DSI, DSA, GC, ADM)
-- ============================================================
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
-- DSE I
('DSE1-ANALYSE',   'Analyse de l\'Action et du Discours en Éducation', 'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-PHILO',     'Philosophie de l\'Éducation',                       'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-HIST-ED',   'Histoire de l\'Éducation',                          'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-STATISTIQ', 'Statistique',                                        'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-PSYCH-SOC', 'Psychologie Sociale',                               'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-SOCIO-ED',  'Sociologie de l\'Éducation',                        'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
-- DSE II
('DSE2-MICRO',     'Micro-Économie',                  'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-EDUC-COMP', 'Éducation Comparée',              'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-SYS-EDUC',  'Système Éducatif Haïtien',        'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-PROBL-ED',  'Problématique Éducative',         'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-GEST-CL',   'Gestion de Classe',               'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-GRH',       'Gestion des Ressources Humaines', 'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
-- DSE III
('DSE3-DIDACT-SS', 'Didactique des Sciences Sociales', 'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-HIST-MOND', 'Histoire du Monde',                'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-GEO-PHYS',  'Géographie Physique',              'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-ECOLOGIE',  'Écologie',                         'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-LITT-FR',   'Littérature Française',            'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-GRH',       'Gestion des Ressources Humaines',  'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
-- DSI I
('DSI1-BIOCHIMIE',  'Biochimie',        'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-POSOLOGIE',  'Posologie',        'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-COMMUNIC',   'Communication',    'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-PUERICULTU', 'Puériculture',     'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-METHODOL',   'Méthodologie',     'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-NURSING-B',  'Nursing de Base',  'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-SOCIOLOGIE', 'Sociologie',       'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-NURS-PRAT',  'Nursing Pratique', 'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI1-ANATOMIE',   'Anatomie',         'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-HANDICAP',   'Concept Handicap', 'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-PRE-DESAT',  'Pré Désastre',     'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI1-NUTRITION',  'Nutrition',        'Faculté des Sciences Infirmières', 3, 30, 'active'),
-- DSI II
('DSI2-GENETIQUE',  'Génétique',                       'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-ENDOCRINOL', 'Endocrinologie',                  'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-NURSING-B',  'Nursing de Base II',              'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-TUBE-DIG',   'Tube Digestif',                   'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-NURS-FOIE',  'Nursing Foie et Voies Biliaires', 'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-NURS-CARD',  'Nursing Cardiologie',             'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-NURS-TUBE',  'Nursing Tube Digestif',           'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-PRATIQUE',   'Pratique Clinique II',            'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI2-FOIE-VB',    'Foie et Voie Biliaire',           'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-DIABETO',    'Diabétologie',                    'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-PHARMACO',   'Pharmacologie',                   'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI2-NURS-ENDO',  'Nursing Endocrinologie',          'Faculté des Sciences Infirmières', 3, 30, 'active'),
-- DSI III
('DSI3-NURS-GYN',   'Nursing Gynécologie',         'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PCIME',      'PCIME',                       'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PLAN-FAM',   'Planification Familiale',     'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-STATISTIQ',  'Statistique',                 'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-NURS-OBST',  'Nursing Obstétrique',         'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-NURS-HEMAT', 'Nursing Hématologique',       'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PRAT-BIBL',  'Pratique et Bibliothèque',    'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI3-NEUROLOG',   'Neurologie',                  'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PRATIQUE',   'Pratique Clinique III',       'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI3-PEDIATRIE',  'Pédiatrie',                   'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-ANGLAIS',    'Anglais',                     'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-NURS-ORTH',  'Nursing Orthopédie',          'Faculté des Sciences Infirmières', 3, 30, 'active'),
-- DSI IV
('DSI4-MORALE-MED', 'Morale Médicale',            'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-SANTE-COMM', 'Santé Communautaire',        'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-DEV-COMM',   'Développement Communautaire','Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-SANTE-GLOB', 'Santé Globale',              'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-DROIT-MED',  'Droit Médical',              'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-PRATIQUE',   'Pratique Clinique IV',       'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI4-AUTO-CLIN',  'Autonomie Clinique',         'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI4-LEADERSHIP', 'Leadership',                 'Faculté des Sciences Infirmières', 3, 30, 'active'),
-- DSA I
('DSA1-ZOOLOGIE',   'Zoologie',         'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-DESSIN-T',   'Dessin Technique', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-TAXONOMIE',  'Taxonomie',        'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-GEOLOGIE',   'Géologie',         'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-TOPOGRAPH',  'Topographie',      'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-CHIMIE-ORG', 'Chimie Organique', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-PHYSIQUE',   'Physique',         'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-TPA2',       'TPA II',           'Faculté des Sciences Agronomiques', 3, 35, 'active'),
-- DSA II
('DSA2-DEV-COMM',  'Développement Communautaire',     'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-PHYSIO-AN', 'Physiologie Animale',             'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-AGRON1',    'Agronomie I',                     'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-MICROBIOL', 'Microbiologie',                   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-GEO-ECON',  'Géographie Économique',           'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-PATHOLOG',  'Pathologie',                      'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-MACRO',     'Macro-Économie',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-INFORMAT',  'Informatique',                    'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-ECOLOGIE',  'Écologie',                        'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-BIOSTAT',   'Biostatistique',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-ANATOMIE',  'Anatomie Animale et Physiologie', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
-- DSA III
('DSA3-AMEN-BV',   'Aménagement des Bassins Versants',    'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-TECHNO-PR', 'Technologie de la Production Rurale', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-SCI-HORT',  'Sciences Horticoles',                 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-IRRIGATIO', 'Irrigation',                          'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-BIO-AQUAT', 'Biologie Aquatique',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-HYDROGEO',  'Hydrogéologie',                       'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-GEST-RN',   'Gestion des Ressources Naturelles',   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-PROD-VEG',  'Production Végétale',                 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-INFORMAT',  'Informatique',                        'Faculté des Sciences Agronomiques', 3, 35, 'active'),
-- DSA IV
('DSA4-CARTOGRAP', 'Cartographie',                     'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-GEST-AGRI', 'Gestion des Entreprises Agricoles','Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-GDE-CULTU', 'Grande Culture',                   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-NUTR-HUM',  'Nutrition Humaine',                'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-EDUC-ENV',  'Éducation Environnementale',       'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-AGROFORET', 'Agroforesterie',                   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-BIOMETRIE', 'Biométrie',                        'Faculté des Sciences Agronomiques', 3, 35, 'active'),
-- DSA V
('DSA5-TECHNO-B',  'Technologie du Bois',                   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-GEST-DECH', 'Gestion des Déchets',                   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-EXPLOIT-F', 'Exploitation Forestière',               'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-MECAN-AG',  'Mécanisation Agricole',                 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-AMEN-GP',   'Aménagement et Gestion des Pâturages',  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-AQUACULT',  'Aquaculture et Pêche',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-INFORMAT',  'Informatique',                          'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-FINANCE',   'Finance des Affaires',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
-- GC I
('GC1-GEO-PLANE',  'Géométrie Plane',       'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-PROBABILIT', 'Probabilité',           'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-STATISTIQ',  'Statistique',           'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-GEO-ANAL',   'Géométrie Analytique',  'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-STATIQUE',   'Statique',              'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-DESSIN-T',   'Dessin Technique',      'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-TOPO1',      'Topographie I',         'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-PHYSIQUE2',  'Physique II',           'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-CALCUL2',    'Calcul II',             'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-GEOLOGIE',   'Géologie',              'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC1-VAR-COMPL',  'Variable Complexe',     'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
-- GC II
('GC2-INFORMAT',   'Informatique',             'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-TECHNO-BET', 'Technologie Béton',        'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-DESSIN-BAT', 'Dessin Bâtiment',          'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-GEO-DIFF',   'Géométrie Différentielle', 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-STAT-DYN',   'Statique Dynamique',       'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-MAQUETTE',   'Maquette',                 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-ELECTROMAG', 'Électromagnétisme',        'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
-- GC III
('GC3-AUTOCAD',    'AutoCAD',                  'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-HYDRAULIQ',  'Hydraulique',              'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-CONST-CIV',  'Construction Civile',      'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-MACONN',     'Maçonnerie',               'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-ROUTE',      'Route',                    'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-BETON',      'Béton',                    'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-RDM',        'Résistance des Matériaux', 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
-- GC IV
('GC4-BETON',      'Béton Armé',               'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-DRAINAGE',   'Drainage',                 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-TRANSPORT',  'Transport et Circulation', 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-FONDATION',  'Fondation',                'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-METRES',     'Mètres et Devis',          'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-ROUTE',      'Route II',                 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-ANAL-STR',   'Analyses des Structures',  'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
-- GC V
('GC5-STR-BOIS',   'Structure du Bois',        'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
-- ADM I
('ADM1-PRINCIPE2', 'Principe de Comptabilité II',       'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-MARKET2',   'Marketing II',                      'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-MICRO',     'Micro-Économie',                    'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-FISCALITE', 'Fiscalité',                         'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-TP-COMPT',  'Travaux Pratiques de Comptabilité', 'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-MACRO',     'Macro-Économie',                    'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-DROIT-AFF', 'Droit des Affaires',                'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-ANGLAIS',   'Anglais',                           'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-PRIX-REV',  'Prix de Revient',                   'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-SOCIO-GEN', 'Sociologie Générale',               'Faculté des Sciences Administratives', 3, 45, 'active'),
-- ADM II
('ADM2-INFORMAT',  'Informatique',                  'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-INTERMED2', 'Comptabilité Intermédiaire II', 'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-BUDGET',    'Budgétisation',                 'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-FIN-PUBL',  'Finance Publique',              'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-DROIT-SOC', 'Droit Social',                  'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-FISCALIT2', 'Fiscalité II',                  'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-DROIT-INT', 'Droit International Privé',     'Faculté des Sciences Administratives', 3, 45, 'active'),
-- ADM III
('ADM3-ANAL-ECON', 'Analyse Économique',            'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-SPECIAL2',  'Comptabilité Spécialisée II',   'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-QUICKBK',   'Quick Books',                   'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-CORRESP',   'Correspondance Administrative', 'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-DROIT-INT', 'Droit International Privé II',  'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-ANAL-FIN',  'Analyse Financière',            'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-VERIFIC',   'Vérification Comptable',        'Faculté des Sciences Administratives', 3, 45, 'active');

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