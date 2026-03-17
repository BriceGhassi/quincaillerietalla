/**
 * utils/seed.js — Script d'initialisation de la base de données
 * Crée les tables et insère les données de démarrage (users, produits, etc.)
 * Run: node src/utils/seed.js
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  console.log('\n🌱  Démarrage du seeding / Starting seed...\n');
  const conn = await pool.getConnection();

  try {
    // ── Exécuter le schéma SQL / Execute SQL schema ──
    const schemaPath = path.join(__dirname, '../config/schema.sql');
    const schemaSql  = fs.readFileSync(schemaPath, 'utf8');

    // Séparer les requêtes SQL / Split SQL statements
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      if (stmt.toUpperCase().startsWith('USE') || stmt.toUpperCase().startsWith('CREATE') ||
          stmt.toUpperCase().startsWith('INSERT') || stmt.toUpperCase().startsWith('ALTER')) {
        await conn.query(stmt);
      }
    }
    console.log('✅  Schéma SQL exécuté / SQL schema executed');

    // ── Créer les utilisateurs avec mots de passe hachés ──
    // Create users with hashed passwords
    const SALT_ROUNDS = 12;

    const adminHash    = await bcrypt.hash('Admin@1234',   SALT_ROUNDS);
    const employeeHash = await bcrypt.hash('Employe@1234', SALT_ROUNDS);

    const { v4: uuidv4 } = require('uuid');

    // Vérifier si les users existent déjà / Check if users already exist
    const [existing] = await conn.query('SELECT COUNT(*) as cnt FROM users');
    if (existing[0].cnt === 0) {
      await conn.query(`
        INSERT INTO users (uuid, nom, prenom, email, password, role, langue) VALUES
        (?, 'Administrateur', 'Système',  'admin@quincaillerie.cm',   ?, 'admin',    'fr'),
        (?, 'Dupont',         'Jean',     'employe@quincaillerie.cm', ?, 'employee', 'fr')
      `, [uuidv4(), adminHash, uuidv4(), employeeHash]);
      console.log('✅  Utilisateurs créés / Users created');
      console.log('   👤 admin@quincaillerie.cm    / Admin@1234');
      console.log('   👤 employe@quincaillerie.cm  / Employe@1234');
    } else {
      console.log('ℹ️   Utilisateurs déjà existants / Users already exist');
    }

    // ── Ajouter quelques ventes de démonstration / Add sample sales ──
    const [users] = await conn.query('SELECT id, role FROM users');
    const employee = users.find(u => u.role === 'employee') || users[0];
    const [ventes] = await conn.query('SELECT COUNT(*) as cnt FROM ventes');

    if (ventes[0].cnt === 0 && employee) {
      // Créer 3 ventes de démo / Create 3 demo sales
      const salesData = [
        { num: 'VTE-2025-001', client: 'Chantier Omnisport', lignes: [[1, 50, 75], [3, 100, 40]] },
        { num: 'VTE-2025-002', client: 'Client anonyme',     lignes: [[5,  2, 4500], [17, 3, 5500]] },
        { num: 'VTE-2025-003', client: 'M. Essomba',         lignes: [[11, 2, 62000]] },
      ];

      for (const sale of salesData) {
        const total = sale.lignes.reduce((s, [,q,p]) => s + q*p, 0);
        const [res] = await conn.query(
          'INSERT INTO ventes (numero_vente, employee_id, client_nom, statut, montant_total) VALUES (?, ?, ?, "validee", ?)',
          [sale.num, employee.id, sale.client, total]
        );
        const venteId = res.insertId;
        for (const [prodId, qty, prix] of sale.lignes) {
          await conn.query(
            'INSERT INTO vente_lignes (vente_id, produit_id, quantite, prix_unitaire, sous_total) VALUES (?, ?, ?, ?, ?)',
            [venteId, prodId, qty, prix, qty * prix]
          );
        }
      }
      console.log('✅  Ventes de démonstration créées / Demo sales created');
    }

    console.log('\n🎉  Seeding terminé avec succès! / Seeding completed successfully!');
    console.log('    Lancez le backend avec: npm run dev\n');

  } catch (err) {
    console.error('❌  Erreur seeding:', err.message);
    throw err;
  } finally {
    conn.release();
    process.exit(0);
  }
}

seed();
