-- ═══════════════════════════════════════════════════════════════════════
-- schema.sql — Schéma complet de la base de données QuincaillerPro
-- Complete database schema for QuincaillerPro
-- Exécutez ce fichier dans MySQL Workbench ou via la CLI
-- Run this file in MySQL Workbench or via CLI
-- ═══════════════════════════════════════════════════════════════════════

-- Créer et sélectionner la base de données
-- Create and select the database
CREATE DATABASE IF NOT EXISTS quincaillerie_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quincaillerie_db;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: users — Utilisateurs du système (Admins et Employés)
-- System users (Admins and Employees)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  uuid        VARCHAR(36)  NOT NULL UNIQUE,
  nom         VARCHAR(100) NOT NULL,
  prenom      VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,              -- Bcrypt hash
  role        ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  actif       TINYINT(1)  NOT NULL DEFAULT 1,    -- 1=actif, 0=désactivé
  langue      ENUM('fr', 'en') NOT NULL DEFAULT 'fr',
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: categories — Catégories de produits
-- Product categories
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nom_fr      VARCHAR(100) NOT NULL,
  nom_en      VARCHAR(100) NOT NULL,
  description_fr TEXT,
  description_en TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: fournisseurs — Fournisseurs / Suppliers
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fournisseurs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nom         VARCHAR(200) NOT NULL,
  contact     VARCHAR(150),
  telephone   VARCHAR(30),
  email       VARCHAR(150),
  adresse     TEXT,
  ville       VARCHAR(100),
  notes       TEXT,
  actif       TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: produits — Produits en stock / Stock products
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produits (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reference       VARCHAR(50)  NOT NULL UNIQUE,
  nom_fr          VARCHAR(200) NOT NULL,
  nom_en          VARCHAR(200),
  description_fr  TEXT,
  description_en  TEXT,
  categorie_id    INT,
  fournisseur_id  INT,
  quantite        INT          NOT NULL DEFAULT 0,
  quantite_min    INT          NOT NULL DEFAULT 0, -- Seuil d'alerte
  unite           VARCHAR(30)  NOT NULL DEFAULT 'pièce',
  prix_achat      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  prix_vente      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  actif           TINYINT(1)   NOT NULL DEFAULT 1,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (categorie_id)   REFERENCES categories(id)   ON DELETE SET NULL,
  FOREIGN KEY (fournisseur_id) REFERENCES fournisseurs(id) ON DELETE SET NULL,
  INDEX idx_reference    (reference),
  INDEX idx_categorie    (categorie_id),
  INDEX idx_fournisseur  (fournisseur_id),
  INDEX idx_quantite     (quantite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: mouvements_stock — Historique de tous les mouvements de stock
-- Stock movement history (entries, sales, adjustments)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  produit_id      INT         NOT NULL,
  user_id         INT         NOT NULL,
  type_mouvement  ENUM('entree','sortie','ajustement','retour') NOT NULL,
  quantite        INT         NOT NULL,
  quantite_avant  INT         NOT NULL,  -- Qty avant le mouvement
  quantite_apres  INT         NOT NULL,  -- Qty après le mouvement
  motif           VARCHAR(100),          -- Raison du mouvement
  note            TEXT,
  created_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE RESTRICT,
  INDEX idx_produit    (produit_id),
  INDEX idx_user       (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_type       (type_mouvement)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: ventes — Transactions de vente / Sales transactions
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero_vente    VARCHAR(30)  NOT NULL UNIQUE, -- ex: VTE-2025-001
  employee_id     INT          NOT NULL,
  client_nom      VARCHAR(200),                 -- Optionnel
  client_tel      VARCHAR(30),
  statut          ENUM('en_cours','validee','annulee') NOT NULL DEFAULT 'en_cours',
  montant_total   DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  notes           TEXT,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_numero     (numero_vente),
  INDEX idx_employee   (employee_id),
  INDEX idx_statut     (statut),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─────────────────────────────────────────────────────────────────────
-- TABLE: vente_lignes — Lignes de chaque vente / Sale line items
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vente_lignes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  vente_id        INT           NOT NULL,
  produit_id      INT           NOT NULL,
  quantite        INT           NOT NULL,
  prix_unitaire   DECIMAL(12,2) NOT NULL,
  sous_total      DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (vente_id)   REFERENCES ventes(id)   ON DELETE CASCADE,
  FOREIGN KEY (produit_id) REFERENCES produits(id) ON DELETE RESTRICT,
  INDEX idx_vente   (vente_id),
  INDEX idx_produit (produit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════════════════
-- DONNÉES INITIALES / INITIAL DATA
-- ═══════════════════════════════════════════════════════════════════════

-- Catégories de quincaillerie / Hardware categories
INSERT INTO categories (nom_fr, nom_en) VALUES
  ('Visserie & Fixation',     'Fasteners & Fixings'),
  ('Outils à main',           'Hand Tools'),
  ('Outils électroportatifs', 'Power Tools'),
  ('Plomberie',               'Plumbing'),
  ('Électricité',             'Electrical'),
  ('Peinture & Revêtements',  'Paint & Coatings'),
  ('Bois & Matériaux',        'Wood & Materials'),
  ('Sécurité & EPI',          'Safety & PPE'),
  ('Quincaillerie générale',  'General Hardware');

-- Fournisseurs / Suppliers
INSERT INTO fournisseurs (nom, contact, telephone, email, adresse, ville, notes) VALUES
  ('Quincaillerie Centrale SARL', 'M. Koffi Amédée',  '+237 677 123 456', 'koffi@qc-sarl.cm',    'Marché Central, Bastos',       'Yaoundé',  'Fournisseur principal'),
  ('Matériaux du Cameroun',       'Mme Ngo Biyong',   '+237 699 234 567', 'contact@mat-cam.cm',  'Zone Industrielle de Bassa',   'Douala',   'Bois et métaux'),
  ('ElecPro Distribution',        'M. Mbarga Théodore','+237 655 345 678', 'theo@elecpro.cm',     'Rue des Artisans, Akwa',       'Douala',   'Matériel électrique'),
  ('BuildMax Import-Export',      'M. Eto Eric',       '+237 691 456 789', 'eric@buildmax.cm',    'Boulevard du 20 Mai',          'Yaoundé',  'Importations Europe');

-- Produits initiaux / Initial products
INSERT INTO produits (reference, nom_fr, nom_en, categorie_id, fournisseur_id, quantite, quantite_min, unite, prix_achat, prix_vente) VALUES
  ('VIS-M6-001',    'Vis M6 acier inox 30mm',           'M6 Stainless screw 30mm',       1, 1, 450,  100, 'pièce',   50,    75),
  ('VIS-M8-002',    'Vis M8 zinguée 50mm',              'M8 Zinc-plated screw 50mm',     1, 1, 280,   80, 'pièce',   80,   120),
  ('ECROU-M6',      'Écrou hexagonal M6',               'M6 hex nut',                    1, 1, 600,  150, 'pièce',   25,    40),
  ('RONDE-M6',      'Rondelle plate M6',                'M6 flat washer',                1, 1,  45,  200, 'pièce',   15,    25),
  ('MARTI-001',     'Marteau 500g manche bois',         '500g wood handle hammer',       2, 4,  12,    5, 'pièce', 2800,  4500),
  ('TOURN-001',     'Jeu tournevis 8 pièces',           '8-piece screwdriver set',       2, 4,   0,    3, 'pièce', 5200,  8500),
  ('MARTI-PIQUEUR', 'Marteau piqueur 1500W',            '1500W jackhammer',              3, 4,   3,    2, 'pièce',115000,185000),
  ('PERCE-13',      'Perceuse à percussion 750W 13mm',  '750W impact drill 13mm',        3, 4,   7,    3, 'pièce', 38000, 62000),
  ('TUBE-PVC-32',   'Tube PVC pression 32mm (3m)',      'PVC pressure pipe 32mm (3m)',   4, 2,  85,   20, 'pièce', 1700,  2800),
  ('COUDE-PVC-32',  'Coude PVC 32mm 90°',              'PVC 90° elbow 32mm',            4, 2, 120,   30, 'pièce',  220,   350),
  ('CABLE-2.5',     'Câble électrique 2.5mm² 100m',    '2.5mm² cable 100m',             5, 3,   8,    5, 'rouleau',38000, 62000),
  ('DISC-30MA',     'Disjoncteur différentiel 30mA',   '30mA RCCB',                     5, 3,  24,   10, 'pièce', 11000, 18500),
  ('PEIN-BL-5L',    'Peinture acrylique blanc 5L',     'White acrylic paint 5L',        6, 4,  18,    8, 'litre',  7800, 12500),
  ('PEIN-PRIMER',   'Primaire accrochage universel 1L','Universal primer 1L',            6, 4,   5,    6, 'litre',  2900,  4800),
  ('PLANCH-SAPIN',  'Planche sapin 27x150mm (3m)',     'Fir board 27x150mm (3m)',        7, 2, 200,   50, 'pièce',  1100,  1800),
  ('CIMENT-50KG',   'Ciment Portland CEM II 50kg',     'Portland cement CEM II 50kg',   9, 2, 160,   40, 'sac',    4500,  7500),
  ('CASQUE-EN397',  'Casque de chantier EN397',        'EN397 construction helmet',      8, 4,  15,    5, 'pièce',  3300,  5500),
  ('GANT-CUIR-L',   'Gants de travail cuir taille L',  'Leather work gloves size L',    8, 4,   0,   10, 'paire',   720,  1200);

-- ─────────────────────────────────────────────────────────────────────
-- Utilisateurs par défaut / Default users
-- Mots de passe (à changer) / Passwords (change these):
--   Admin:    admin@quincaillerie.cm  /  Admin@1234
--   Employee: employe@quincaillerie.cm / Employe@1234
-- Les hashes sont générés via bcrypt rounds=12
-- ─────────────────────────────────────────────────────────────────────
-- NOTE: Le script seed.js génère ces hash automatiquement
-- The seed.js script generates these hashes automatically
