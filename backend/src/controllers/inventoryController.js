/**
 * controllers/inventoryController.js — Contrôleur inventaire complet
 * Gère produits, catégories, mouvements de stock
 */
const { pool } = require('../config/database');
const { validationResult } = require('express-validator');

// ═══════════════════════════════════════════
//  PRODUITS / PRODUCTS
// ═══════════════════════════════════════════

/**
 * GET /api/inventory/produits
 * Liste tous les produits avec filtres optionnels
 */
async function getProduits(req, res) {
  try {
    const { search, categorie, fournisseur, stock, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where  = ['p.actif = 1'];
    let params = [];

    // Filtre texte / Text search
    if (search) {
      where.push('(p.nom_fr LIKE ? OR p.nom_en LIKE ? OR p.reference LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    // Filtre catégorie
    if (categorie) { where.push('p.categorie_id = ?'); params.push(categorie); }
    // Filtre fournisseur
    if (fournisseur) { where.push('p.fournisseur_id = ?'); params.push(fournisseur); }
    // Filtre niveau de stock
    if (stock === 'out')  { where.push('p.quantite = 0'); }
    if (stock === 'low')  { where.push('p.quantite > 0 AND p.quantite <= p.quantite_min'); }
    if (stock === 'ok')   { where.push('p.quantite > p.quantite_min'); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await pool.query(`
      SELECT p.*,
             c.nom_fr AS categorie_fr, c.nom_en AS categorie_en,
             f.nom    AS fournisseur_nom,
             CASE
               WHEN p.quantite = 0               THEN 'rupture'
               WHEN p.quantite <= p.quantite_min THEN 'faible'
               ELSE 'ok'
             END AS statut_stock
      FROM produits p
      LEFT JOIN categories  c ON p.categorie_id   = c.id
      LEFT JOIN fournisseurs f ON p.fournisseur_id = f.id
      ${whereClause}
      ORDER BY p.nom_fr ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Compter le total pour la pagination
    const [countRow] = await pool.query(
      `SELECT COUNT(*) as total FROM produits p ${whereClause}`, params
    );

    res.json({
      success: true,
      data:    rows,
      total:   countRow[0].total,
      page:    parseInt(page),
      limit:   parseInt(limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message_fr: 'Erreur serveur.' });
  }
}

/**
 * GET /api/inventory/produits/:id
 * Obtenir un produit par son ID
 */
async function getProduit(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, c.nom_fr AS categorie_fr, c.nom_en AS categorie_en, f.nom AS fournisseur_nom
      FROM produits p
      LEFT JOIN categories  c ON p.categorie_id   = c.id
      LEFT JOIN fournisseurs f ON p.fournisseur_id = f.id
      WHERE p.id = ? AND p.actif = 1
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ success: false });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

/**
 * POST /api/inventory/produits — ADMIN ONLY
 * Créer un nouveau produit
 */
async function createProduit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { reference, nom_fr, nom_en, description_fr, description_en,
          categorie_id, fournisseur_id, quantite, quantite_min,
          unite, prix_achat, prix_vente } = req.body;
  try {
    // Vérifier l'unicité de la référence
    const [existing] = await pool.query('SELECT id FROM produits WHERE reference = ?', [reference]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message_fr: 'Cette référence existe déjà.',
        message_en: 'This reference already exists.',
      });
    }

    const [result] = await pool.query(`
      INSERT INTO produits
        (reference, nom_fr, nom_en, description_fr, description_en,
         categorie_id, fournisseur_id, quantite, quantite_min,
         unite, prix_achat, prix_vente)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `, [reference, nom_fr, nom_en || null, description_fr || null, description_en || null,
        categorie_id || null, fournisseur_id || null,
        parseInt(quantite) || 0, parseInt(quantite_min) || 0,
        unite || 'pièce', parseFloat(prix_achat) || 0, parseFloat(prix_vente) || 0]);

    // Enregistrer le mouvement initial si quantité > 0
    if (parseInt(quantite) > 0) {
      await pool.query(`
        INSERT INTO mouvements_stock
          (produit_id, user_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif)
        VALUES (?, ?, 'entree', ?, 0, ?, 'Stock initial')
      `, [result.insertId, req.user.id, parseInt(quantite), parseInt(quantite)]);
    }

    res.status(201).json({ success: true, id: result.insertId,
      message_fr: 'Produit créé avec succès.', message_en: 'Product created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
}

/**
 * PUT /api/inventory/produits/:id — ADMIN ONLY
 * Mettre à jour un produit
 */
async function updateProduit(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { id } = req.params;
  const { nom_fr, nom_en, description_fr, description_en,
          categorie_id, fournisseur_id, quantite_min,
          unite, prix_achat, prix_vente, actif } = req.body;
  try {
    await pool.query(`
      UPDATE produits SET
        nom_fr=?, nom_en=?, description_fr=?, description_en=?,
        categorie_id=?, fournisseur_id=?, quantite_min=?,
        unite=?, prix_achat=?, prix_vente=?, actif=?
      WHERE id=?
    `, [nom_fr, nom_en || null, description_fr || null, description_en || null,
        categorie_id || null, fournisseur_id || null, parseInt(quantite_min) || 0,
        unite, parseFloat(prix_achat), parseFloat(prix_vente),
        actif !== undefined ? actif : 1, id]);

    res.json({ success: true, message_fr: 'Produit mis à jour.', message_en: 'Product updated.' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

/**
 * DELETE /api/inventory/produits/:id — ADMIN ONLY
 * Désactiver un produit (soft delete)
 */
async function deleteProduit(req, res) {
  try {
    await pool.query('UPDATE produits SET actif = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message_fr: 'Produit supprimé.', message_en: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

/**
 * POST /api/inventory/produits/:id/ajuster — ADMIN ONLY
 * Ajuster manuellement le stock avec enregistrement du mouvement
 */
async function ajusterStock(req, res) {
  const { id } = req.params;
  const { type_mouvement, quantite, motif, note } = req.body;
  const qty = parseInt(quantite);

  if (!qty || qty <= 0) {
    return res.status(400).json({ success: false, message_fr: 'Quantité invalide.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verrouiller la ligne produit / Lock product row
    const [prodRows] = await conn.query('SELECT quantite FROM produits WHERE id = ? FOR UPDATE', [id]);
    if (prodRows.length === 0) throw new Error('Produit introuvable');

    const qAvant = prodRows[0].quantite;
    let   qApres;

    if (type_mouvement === 'entree' || type_mouvement === 'retour') {
      qApres = qAvant + qty;
    } else if (type_mouvement === 'sortie' || type_mouvement === 'ajustement') {
      qApres = Math.max(0, qAvant - qty);
    } else {
      // Ajustement direct (mettre la valeur exacte)
      qApres = qty;
    }

    // Mettre à jour le stock
    await conn.query('UPDATE produits SET quantite = ? WHERE id = ?', [qApres, id]);

    // Enregistrer le mouvement
    await conn.query(`
      INSERT INTO mouvements_stock
        (produit_id, user_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, req.user.id, type_mouvement, qty, qAvant, qApres, motif || '', note || '']);

    await conn.commit();
    res.json({ success: true, quantite_avant: qAvant, quantite_apres: qApres,
      message_fr: 'Stock ajusté avec succès.', message_en: 'Stock adjusted successfully.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message_fr: err.message });
  } finally {
    conn.release();
  }
}

// ═══════════════════════════════════════════
//  CATÉGORIES / CATEGORIES
// ═══════════════════════════════════════════

async function getCategories(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY nom_fr');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

// ═══════════════════════════════════════════
//  MOUVEMENTS / MOVEMENTS
// ═══════════════════════════════════════════

/**
 * GET /api/inventory/mouvements
 * Liste les mouvements de stock avec filtres
 */
async function getMouvements(req, res) {
  try {
    const { produit, type, date_debut, date_fin, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where  = [];
    let params = [];

    if (produit)    { where.push('ms.produit_id = ?');          params.push(produit); }
    if (type)       { where.push('ms.type_mouvement = ?');      params.push(type); }
    if (date_debut) { where.push('ms.created_at >= ?');         params.push(date_debut); }
    if (date_fin)   { where.push('ms.created_at <= ?');         params.push(date_fin + ' 23:59:59'); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await pool.query(`
      SELECT ms.*, p.reference, p.nom_fr, p.nom_en,
             u.nom AS user_nom, u.prenom AS user_prenom
      FROM mouvements_stock ms
      JOIN produits p ON ms.produit_id = p.id
      JOIN users    u ON ms.user_id    = u.id
      ${whereClause}
      ORDER BY ms.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countRow] = await pool.query(
      `SELECT COUNT(*) as total FROM mouvements_stock ms ${whereClause}`, params
    );

    res.json({ success: true, data: rows, total: countRow[0].total });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

module.exports = {
  getProduits, getProduit, createProduit, updateProduit, deleteProduit,
  ajusterStock, getCategories, getMouvements,
};
