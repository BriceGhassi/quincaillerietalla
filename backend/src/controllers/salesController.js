/**
 * controllers/salesController.js — Contrôleur des ventes
 * Enregistrement des ventes, validation, annulation, historique
 */
const { pool } = require('../config/database');

/**
 * Générer un numéro de vente unique / Generate unique sale number
 * Format: VTE-YYYY-NNNN
 */
async function genererNumeroVente() {
  const year = new Date().getFullYear();
  const [rows] = await pool.query(
    "SELECT COUNT(*) as cnt FROM ventes WHERE numero_vente LIKE ?",
    [`VTE-${year}-%`]
  );
  const num = String(rows[0].cnt + 1).padStart(4, '0');
  return `VTE-${year}-${num}`;
}

/**
 * GET /api/sales
 * Liste les ventes avec filtres
 */
async function getVentes(req, res) {
  try {
    const { statut, employe, date_debut, date_fin, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where  = [];
    let params = [];

    // Les employés ne voient que leurs propres ventes
    if (req.user.role === 'employee') {
      where.push('v.employee_id = ?');
      params.push(req.user.id);
    } else if (employe) {
      where.push('v.employee_id = ?');
      params.push(employe);
    }

    if (statut)     { where.push('v.statut = ?');         params.push(statut); }
    if (date_debut) { where.push('v.created_at >= ?');    params.push(date_debut); }
    if (date_fin)   { where.push('v.created_at <= ?');    params.push(date_fin + ' 23:59:59'); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await pool.query(`
      SELECT v.*, u.nom AS employe_nom, u.prenom AS employe_prenom,
             COUNT(vl.id) AS nb_lignes
      FROM ventes v
      JOIN users u ON v.employee_id = u.id
      LEFT JOIN vente_lignes vl ON vl.vente_id = v.id
      ${whereClause}
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    const [countRow] = await pool.query(
      `SELECT COUNT(*) as total FROM ventes v ${whereClause}`, params
    );

    res.json({ success: true, data: rows, total: countRow[0].total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
}

/**
 * GET /api/sales/:id
 * Détail d'une vente avec ses lignes
 */
async function getVente(req, res) {
  try {
    const [vente] = await pool.query(`
      SELECT v.*, u.nom AS employe_nom, u.prenom AS employe_prenom
      FROM ventes v JOIN users u ON v.employee_id = u.id
      WHERE v.id = ?
    `, [req.params.id]);

    if (vente.length === 0) return res.status(404).json({ success: false });

    // Restreindre les employés à leurs ventes / Employees only see own sales
    if (req.user.role === 'employee' && vente[0].employee_id !== req.user.id) {
      return res.status(403).json({ success: false });
    }

    const [lignes] = await pool.query(`
      SELECT vl.*, p.reference, p.nom_fr, p.nom_en
      FROM vente_lignes vl JOIN produits p ON vl.produit_id = p.id
      WHERE vl.vente_id = ?
    `, [req.params.id]);

    res.json({ success: true, data: { ...vente[0], lignes } });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

/**
 * POST /api/sales
 * Créer une nouvelle vente (débit du stock automatique lors de la validation)
 */
async function createVente(req, res) {
  const { client_nom, client_tel, lignes, notes } = req.body;

  if (!lignes || lignes.length === 0) {
    return res.status(400).json({
      success: false,
      message_fr: 'La vente doit contenir au moins un article.',
      message_en: 'Sale must contain at least one item.',
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const numero = await genererNumeroVente();

    // Calculer le total / Calculate total
    let total = 0;
    for (const ligne of lignes) {
      total += parseFloat(ligne.prix_unitaire) * parseInt(ligne.quantite);
    }

    // Créer l'en-tête de vente / Create sale header
    const [res1] = await conn.query(`
      INSERT INTO ventes (numero_vente, employee_id, client_nom, client_tel, statut, montant_total, notes)
      VALUES (?, ?, ?, ?, 'en_cours', ?, ?)
    `, [numero, req.user.id, client_nom || null, client_tel || null, total, notes || null]);

    const venteId = res1.insertId;

    // Insérer les lignes / Insert line items
    for (const ligne of lignes) {
      await conn.query(`
        INSERT INTO vente_lignes (vente_id, produit_id, quantite, prix_unitaire, sous_total)
        VALUES (?, ?, ?, ?, ?)
      `, [venteId, ligne.produit_id, ligne.quantite,
          ligne.prix_unitaire, ligne.quantite * ligne.prix_unitaire]);
    }

    await conn.commit();
    res.status(201).json({
      success: true, id: venteId, numero_vente: numero,
      message_fr: `Vente ${numero} créée.`, message_en: `Sale ${numero} created.`,
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message_fr: err.message });
  } finally {
    conn.release();
  }
}

/**
 * PUT /api/sales/:id/valider
 * Valider une vente → débit du stock pour chaque ligne
 */
async function validerVente(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [venteRows] = await conn.query('SELECT * FROM ventes WHERE id = ? FOR UPDATE', [req.params.id]);
    if (venteRows.length === 0) throw new Error('Vente introuvable');
    const vente = venteRows[0];

    if (vente.statut !== 'en_cours') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message_fr: 'Cette vente ne peut pas être validée.',
        message_en: 'This sale cannot be validated.',
      });
    }

    // Récupérer les lignes / Get line items
    const [lignes] = await conn.query(
      'SELECT * FROM vente_lignes WHERE vente_id = ?', [req.params.id]
    );

    // Vérifier et déduire le stock pour chaque ligne
    for (const ligne of lignes) {
      const [prodRows] = await conn.query(
        'SELECT quantite, nom_fr FROM produits WHERE id = ? FOR UPDATE', [ligne.produit_id]
      );
      if (prodRows.length === 0) throw new Error(`Produit ${ligne.produit_id} introuvable`);

      const qAvant = prodRows[0].quantite;
      if (qAvant < ligne.quantite) {
        throw new Error(`Stock insuffisant pour "${prodRows[0].nom_fr}" (disponible: ${qAvant})`);
      }

      const qApres = qAvant - ligne.quantite;
      await conn.query('UPDATE produits SET quantite = ? WHERE id = ?', [qApres, ligne.produit_id]);

      // Enregistrer le mouvement de sortie
      await conn.query(`
        INSERT INTO mouvements_stock
          (produit_id, user_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, note)
        VALUES (?, ?, 'sortie', ?, ?, ?, 'Vente', ?)
      `, [ligne.produit_id, req.user.id, ligne.quantite, qAvant, qApres, `Vente ${vente.numero_vente}`]);
    }

    // Marquer la vente comme validée
    await conn.query('UPDATE ventes SET statut = "validee" WHERE id = ?', [req.params.id]);
    await conn.commit();

    res.json({
      success: true,
      message_fr: 'Vente validée et stock débité.',
      message_en: 'Sale validated and stock debited.',
    });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message_fr: err.message, message_en: err.message });
  } finally {
    conn.release();
  }
}

/**
 * PUT /api/sales/:id/annuler
 * Annuler une vente (et recréditer le stock si déjà validée)
 */
async function annulerVente(req, res) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [venteRows] = await conn.query('SELECT * FROM ventes WHERE id = ? FOR UPDATE', [req.params.id]);
    if (venteRows.length === 0) throw new Error('Vente introuvable');
    const vente = venteRows[0];

    // Seul un admin peut annuler une vente validée
    if (vente.statut === 'validee' && req.user.role !== 'admin') {
      await conn.rollback();
      return res.status(403).json({
        success: false,
        message_fr: 'Seul un administrateur peut annuler une vente validée.',
        message_en: 'Only an admin can cancel a validated sale.',
      });
    }

    // Si vente validée → recréditer le stock
    if (vente.statut === 'validee') {
      const [lignes] = await conn.query('SELECT * FROM vente_lignes WHERE vente_id = ?', [req.params.id]);
      for (const ligne of lignes) {
        const [prodRows] = await conn.query('SELECT quantite FROM produits WHERE id = ?', [ligne.produit_id]);
        const qAvant = prodRows[0].quantite;
        const qApres = qAvant + ligne.quantite;

        await conn.query('UPDATE produits SET quantite = ? WHERE id = ?', [qApres, ligne.produit_id]);
        await conn.query(`
          INSERT INTO mouvements_stock
            (produit_id, user_id, type_mouvement, quantite, quantite_avant, quantite_apres, motif, note)
          VALUES (?, ?, 'retour', ?, ?, ?, 'Annulation vente', ?)
        `, [ligne.produit_id, req.user.id, ligne.quantite, qAvant, qApres, `Annulation ${vente.numero_vente}`]);
      }
    }

    await conn.query('UPDATE ventes SET statut = "annulee" WHERE id = ?', [req.params.id]);
    await conn.commit();

    res.json({ success: true, message_fr: 'Vente annulée.', message_en: 'Sale cancelled.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message_fr: err.message });
  } finally {
    conn.release();
  }
}

module.exports = { getVentes, getVente, createVente, validerVente, annulerVente };
