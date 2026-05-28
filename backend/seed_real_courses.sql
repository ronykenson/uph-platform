-- ============================================================
--  seed_real_courses.sql  —  UPH Official Course Catalogue
--  Source: PDFs officiels — Session II (DSE, DSI, DSA, GC, ADM)
--
--  Run locally:
--    mysql -u root -p uph_database < backend/seed_real_courses.sql
--
--  Run on VPS:
--    mysql -u uph_user -p'UPHStrongPass2026!' uph_database < backend/seed_real_courses.sql
--
--  Safe to re-run: INSERT IGNORE skips existing codes.
-- ============================================================

USE uph_database;

-- ============================================================
--  FACULTÉ DES SCIENCES DE L'ÉDUCATION (DSE)
-- ============================================================

-- DSE Niveau I
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSE1-ANALYSE',   'Analyse de l\'Action et du Discours en Éducation', 'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-PHILO',     'Philosophie de l\'Éducation',                       'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-HIST-ED',   'Histoire de l\'Éducation',                          'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-STATISTIQ', 'Statistique',                                        'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-PSYCH-SOC', 'Psychologie Sociale',                               'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE1-SOCIO-ED',  'Sociologie de l\'Éducation',                        'Faculté des Sciences de l\'Éducation', 3, 40, 'active');

-- DSE Niveau II
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSE2-MICRO',     'Micro-Économie',                  'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-EDUC-COMP', 'Éducation Comparée',              'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-SYS-EDUC',  'Système Éducatif Haïtien',        'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-PROBL-ED',  'Problématique Éducative',         'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-GEST-CL',   'Gestion de Classe',               'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE2-GRH',       'Gestion des Ressources Humaines', 'Faculté des Sciences de l\'Éducation', 3, 40, 'active');

-- DSE Niveau III
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSE3-DIDACT-SS', 'Didactique des Sciences Sociales', 'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-HIST-MOND', 'Histoire du Monde',                'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-GEO-PHYS',  'Géographie Physique',              'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-ECOLOGIE',  'Écologie',                         'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-LITT-FR',   'Littérature Française',            'Faculté des Sciences de l\'Éducation', 3, 40, 'active'),
('DSE3-GRH',       'Gestion des Ressources Humaines',  'Faculté des Sciences de l\'Éducation', 3, 40, 'active');

-- ============================================================
--  FACULTÉ DES SCIENCES INFIRMIÈRES (DSI)
-- ============================================================

-- DSI Niveau I (groupes I-A et I-B — mêmes matières)
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
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
('DSI1-NUTRITION',  'Nutrition',        'Faculté des Sciences Infirmières', 3, 30, 'active');

-- DSI Niveau II
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
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
('DSI2-NURS-ENDO',  'Nursing Endocrinologie',          'Faculté des Sciences Infirmières', 3, 30, 'active');

-- DSI Niveau III
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSI3-NURS-GYN',   'Nursing Gynécologie',          'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PCIME',      'PCIME',                        'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PLAN-FAM',   'Planification Familiale',      'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-STATISTIQ',  'Statistique',                  'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-NURS-OBST',  'Nursing Obstétrique',          'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-NURS-HEMAT', 'Nursing Hématologique',        'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PRAT-BIBL',  'Pratique et Bibliothèque',     'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI3-NEUROLOG',   'Neurologie',                   'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-PRATIQUE',   'Pratique Clinique III',         'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI3-PEDIATRIE',  'Pédiatrie',                    'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-ANGLAIS',    'Anglais',                      'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI3-NURS-ORTH',  'Nursing Orthopédie',           'Faculté des Sciences Infirmières', 3, 30, 'active');

-- DSI Niveau IV
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSI4-MORALE-MED', 'Morale Médicale',           'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-SANTE-COMM', 'Santé Communautaire',       'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-DEV-COMM',   'Développement Communautaire','Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-SANTE-GLOB', 'Santé Globale',             'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-DROIT-MED',  'Droit Médical',             'Faculté des Sciences Infirmières', 3, 30, 'active'),
('DSI4-PRATIQUE',   'Pratique Clinique IV',      'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI4-AUTO-CLIN',  'Autonomie Clinique',        'Faculté des Sciences Infirmières', 4, 30, 'active'),
('DSI4-LEADERSHIP', 'Leadership',               'Faculté des Sciences Infirmières', 3, 30, 'active');

-- ============================================================
--  FACULTÉ DES SCIENCES AGRONOMIQUES (DSA)
-- ============================================================

-- DSA Niveau I (groupes I-A, I-B, I-C, I-Médian, I-W — mêmes matières)
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSA1-ZOOLOGIE',   'Zoologie',         'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-DESSIN-T',   'Dessin Technique', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-TAXONOMIE',  'Taxonomie',        'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-GEOLOGIE',   'Géologie',         'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-TOPOGRAPH',  'Topographie',      'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-CHIMIE-ORG', 'Chimie Organique', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-PHYSIQUE',   'Physique',         'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA1-TPA2',       'TPA II',           'Faculté des Sciences Agronomiques', 3, 35, 'active');

-- DSA Niveau II (union Semaine + W)
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSA2-DEV-COMM',  'Développement Communautaire',       'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-PHYSIO-AN', 'Physiologie Animale',               'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-AGRON1',    'Agronomie I',                       'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-MICROBIOL', 'Microbiologie',                     'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-GEO-ECON',  'Géographie Économique',             'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-PATHOLOG',  'Pathologie',                        'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-MACRO',     'Macro-Économie',                    'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-INFORMAT',  'Informatique',                      'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-ECOLOGIE',  'Écologie',                          'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-BIOSTAT',   'Biostatistique',                    'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA2-ANATOMIE',  'Anatomie Animale et Physiologie',   'Faculté des Sciences Agronomiques', 3, 35, 'active');

-- DSA Niveau III (union Semaine + W)
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSA3-AMEN-BV',   'Aménagement des Bassins Versants',    'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-TECHNO-PR', 'Technologie de la Production Rurale', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-SCI-HORT',  'Sciences Horticoles',                 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-IRRIGATIO', 'Irrigation',                          'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-BIO-AQUAT', 'Biologie Aquatique',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-HYDROGEO',  'Hydrogéologie',                       'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-GEST-RN',   'Gestion des Ressources Naturelles',   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-PROD-VEG',  'Production Végétale',                 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA3-INFORMAT',  'Informatique',                        'Faculté des Sciences Agronomiques', 3, 35, 'active');

-- DSA Niveau IV
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSA4-CARTOGRAP', 'Cartographie',                     'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-GEST-AGRI', 'Gestion des Entreprises Agricoles','Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-GDE-CULTU', 'Grande Culture',                   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-NUTR-HUM',  'Nutrition Humaine',                'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-EDUC-ENV',  'Éducation Environnementale',       'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-AGROFORET', 'Agroforesterie',                   'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA4-BIOMETRIE', 'Biométrie',                        'Faculté des Sciences Agronomiques', 3, 35, 'active');

-- DSA Niveau V
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('DSA5-TECHNO-B',  'Technologie du Bois',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-GEST-DECH', 'Gestion des Déchets',                  'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-EXPLOIT-F', 'Exploitation Forestière',              'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-MECAN-AG',  'Mécanisation Agricole',                'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-AMEN-GP',   'Aménagement et Gestion des Pâturages', 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-AQUACULT',  'Aquaculture et Pêche',                 'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-INFORMAT',  'Informatique',                         'Faculté des Sciences Agronomiques', 3, 35, 'active'),
('DSA5-FINANCE',   'Finance des Affaires',                 'Faculté des Sciences Agronomiques', 3, 35, 'active');

-- ============================================================
--  FACULTÉ DE L'INGÉNIERIE ET DE L'ARCHITECTURE (GC)
-- ============================================================

-- GC Niveau I
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
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
('GC1-VAR-COMPL',  'Variable Complexe',     'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active');

-- GC Niveau II
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('GC2-INFORMAT',   'Informatique',             'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-TECHNO-BET', 'Technologie Béton',        'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-DESSIN-BAT', 'Dessin Bâtiment',          'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-GEO-DIFF',   'Géométrie Différentielle', 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-STAT-DYN',   'Statique Dynamique',       'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-MAQUETTE',   'Maquette',                 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC2-ELECTROMAG', 'Électromagnétisme',        'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active');

-- GC Niveau III
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('GC3-AUTOCAD',    'AutoCAD',                  'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-HYDRAULIQ',  'Hydraulique',              'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-CONST-CIV',  'Construction Civile',      'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-MACONN',     'Maçonnerie',               'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-ROUTE',      'Route',                    'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-BETON',      'Béton',                    'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC3-RDM',        'Résistance des Matériaux', 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active');

-- GC Niveau IV
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('GC4-BETON',      'Béton Armé',               'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-DRAINAGE',   'Drainage',                 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-TRANSPORT',  'Transport et Circulation', 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-FONDATION',  'Fondation',                'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-METRES',     'Mètres et Devis',          'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-ROUTE',      'Route II',                 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active'),
('GC4-ANAL-STR',   'Analyses des Structures',  'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active');

-- GC Niveau V
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('GC5-STR-BOIS',   'Structure du Bois', 'Faculté de l\'Ingénierie et de l\'Architecture', 3, 35, 'active');

-- ============================================================
--  FACULTÉ DES SCIENCES ADMINISTRATIVES (ADM)
-- ============================================================

-- ADM Niveau I (groupes Matin, Médian, W — ensemble unique)
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('ADM1-PRINCIPE2', 'Principe de Comptabilité II',       'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-MARKET2',   'Marketing II',                      'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-MICRO',     'Micro-Économie',                    'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-FISCALITE', 'Fiscalité',                         'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-TP-COMPT',  'Travaux Pratiques de Comptabilité', 'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-MACRO',     'Macro-Économie',                    'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-DROIT-AFF', 'Droit des Affaires',                'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-ANGLAIS',   'Anglais',                           'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-PRIX-REV',  'Prix de Revient',                   'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM1-SOCIO-GEN', 'Sociologie Générale',               'Faculté des Sciences Administratives', 3, 45, 'active');

-- ADM Niveau II
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('ADM2-INFORMAT',  'Informatique',                  'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-INTERMED2', 'Comptabilité Intermédiaire II', 'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-BUDGET',    'Budgétisation',                 'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-FIN-PUBL',  'Finance Publique',              'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-DROIT-SOC', 'Droit Social',                  'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-FISCALIT2', 'Fiscalité II',                  'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM2-DROIT-INT', 'Droit International Privé',     'Faculté des Sciences Administratives', 3, 45, 'active');

-- ADM Niveau III
INSERT IGNORE INTO courses (code, name, faculty, credits, max_students, status) VALUES
('ADM3-ANAL-ECON', 'Analyse Économique',              'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-SPECIAL2',  'Comptabilité Spécialisée II',     'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-QUICKBK',   'Quick Books',                     'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-CORRESP',   'Correspondance Administrative',   'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-DROIT-INT', 'Droit International Privé II',    'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-ANAL-FIN',  'Analyse Financière',              'Faculté des Sciences Administratives', 3, 45, 'active'),
('ADM3-VERIFIC',   'Vérification Comptable',          'Faculté des Sciences Administratives', 3, 45, 'active');

-- ============================================================
SELECT CONCAT('✓ Catalogue UPH : ', COUNT(*), ' cours actifs au total.') AS result
FROM courses WHERE status = 'active';
-- ============================================================
