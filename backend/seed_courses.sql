-- ============================================================
--  seed_courses.sql  —  Populate the course catalogue
--  Run: mysql -u root -p uph_database < seed_courses.sql
--  Safe to re-run (INSERT IGNORE skips duplicates by code).
-- ============================================================

USE uph_database;

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

SELECT CONCAT('✓ ', COUNT(*), ' cours dans la base.') AS result FROM courses;
