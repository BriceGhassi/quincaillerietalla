/**
 * controllers/supplierController.js — Contrôleur fournisseurs
 */
const { pool } = require('../config/database');
const { validationResult } = require('express-validator');

async function getFournisseurs(req, res) {
  try {
    const { search } = req.query;
    let where = ['f.actif = 1'], params = [];
    if (search) { where.push('(f.nom LIKE ? OR f.contact LIKE ? OR f.ville LIKE ?)'); const s = `%${search}%`; params.push(s,s,s); }
    const [rows] = await pool.query(`
      SELECT f.*, COUNT(p.id) AS nb_produits
      FROM fournisseurs f
      LEFT JOIN produits p ON p.fournisseur_id = f.id AND p.actif = 1
      WHERE ${where.join(' AND ')}
      GROUP BY f.id ORDER BY f.nom
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false }); }
}

async function getFournisseur(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM fournisseurs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false });
    const [produits] = await pool.query(
      'SELECT id, reference, nom_fr, quantite, prix_vente FROM produits WHERE fournisseur_id = ? AND actif = 1',
      [req.params.id]
    );
    res.json({ success: true, data: { ...rows[0], produits } });
  } catch (err) { res.status(500).json({ success: false }); }
}

async function createFournisseur(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  const { nom, contact, telephone, email, adresse, ville, notes } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO fournisseurs (nom, contact, telephone, email, adresse, ville, notes) VALUES (?,?,?,?,?,?,?)',
      [nom, contact||null, telephone||null, email||null, adresse||null, ville||null, notes||null]
    );
    res.status(201).json({ success: true, id: result.insertId,
      message_fr: 'Fournisseur ajouté.', message_en: 'Supplier added.' });
  } catch (err) { res.status(500).json({ success: false }); }
}

async function updateFournisseur(req, res) {
  const { nom, contact, telephone, email, adresse, ville, notes, actif } = req.body;
  try {
    await pool.query(
      'UPDATE fournisseurs SET nom=?,contact=?,telephone=?,email=?,adresse=?,ville=?,notes=?,actif=? WHERE id=?',
      [nom, contact||null, telephone||null, email||null, adresse||null, ville||null, notes||null, actif!==undefined?actif:1, req.params.id]
    );
    res.json({ success: true, message_fr: 'Fournisseur mis à jour.', message_en: 'Supplier updated.' });
  } catch (err) { res.status(500).json({ success: false }); }
}

async function deleteFournisseur(req, res) {
  try {
    await pool.query('UPDATE fournisseurs SET actif = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message_fr: 'Fournisseur supprimé.', message_en: 'Supplier deleted.' });
  } catch (err) { res.status(500).json({ success: false }); }
}

module.exports = { getFournisseurs, getFournisseur, createFournisseur, updateFournisseur, deleteFournisseur };
