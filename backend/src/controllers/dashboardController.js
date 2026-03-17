/**
 * controllers/dashboardController.js — Tableau de bord et rapports
 * Métriques temps réel, statistiques, rapports journalier/hebdo/mensuel
 */
const { pool } = require('../config/database');

/**
 * GET /api/dashboard/metrics
 * Métriques clés pour le tableau de bord
 */
async function getMetrics(req, res) {
  try {
    // ── Produits ──
    const [[prodStats]] = await pool.query(`
      SELECT
        COUNT(*)                                                     AS total_produits,
        SUM(CASE WHEN quantite = 0               THEN 1 ELSE 0 END) AS en_rupture,
        SUM(CASE WHEN quantite > 0 AND quantite <= quantite_min THEN 1 ELSE 0 END) AS stock_faible,
        SUM(quantite * prix_achat)                                   AS valeur_stock_achat,
        SUM(quantite * prix_vente)                                   AS valeur_stock_vente
      FROM produits WHERE actif = 1
    `);

    // ── Ventes du jour ──
    const [[ventesJour]] = await pool.query(`
      SELECT COUNT(*) AS nb_ventes, COALESCE(SUM(montant_total),0) AS ca_jour
      FROM ventes WHERE statut = 'validee' AND DATE(created_at) = CURDATE()
    `);

    // ── Ventes du mois ──
    const [[ventesMois]] = await pool.query(`
      SELECT COUNT(*) AS nb_ventes, COALESCE(SUM(montant_total),0) AS ca_mois
      FROM ventes WHERE statut = 'validee'
        AND MONTH(created_at) = MONTH(CURDATE())
        AND YEAR(created_at)  = YEAR(CURDATE())
    `);

    // ── CA des 7 derniers jours (pour le graphique) ──
    const [caParJour] = await pool.query(`
      SELECT DATE(created_at) AS jour, COUNT(*) AS nb, SUM(montant_total) AS ca
      FROM ventes WHERE statut = 'validee' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at) ORDER BY jour ASC
    `);

    // ── Top 5 produits vendus ce mois ──
    const [topProduits] = await pool.query(`
      SELECT p.nom_fr, p.reference, SUM(vl.quantite) AS total_qty, SUM(vl.sous_total) AS total_ca
      FROM vente_lignes vl
      JOIN ventes  v ON vl.vente_id   = v.id
      JOIN produits p ON vl.produit_id = p.id
      WHERE v.statut = 'validee'
        AND MONTH(v.created_at) = MONTH(CURDATE())
        AND YEAR(v.created_at)  = YEAR(CURDATE())
      GROUP BY vl.produit_id
      ORDER BY total_qty DESC LIMIT 5
    `);

    // ── Produits en alerte ──
    const [alertes] = await pool.query(`
      SELECT id, reference, nom_fr, nom_en, quantite, quantite_min
      FROM produits
      WHERE actif = 1 AND quantite <= quantite_min
      ORDER BY quantite ASC LIMIT 10
    `);

    // ── Mouvements récents (10 derniers) ──
    const [mouvements] = await pool.query(`
      SELECT ms.type_mouvement, ms.quantite, ms.created_at,
             p.nom_fr, p.reference,
             u.prenom AS user_prenom
      FROM mouvements_stock ms
      JOIN produits p ON ms.produit_id = p.id
      JOIN users    u ON ms.user_id    = u.id
      ORDER BY ms.created_at DESC LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        produits:    prodStats,
        ventes_jour: ventesJour,
        ventes_mois: ventesMois,
        ca_par_jour: caParJour,
        top_produits: topProduits,
        alertes,
        mouvements_recents: mouvements,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
}

/**
 * GET /api/dashboard/rapport
 * Rapport journalier / hebdomadaire / mensuel
 * Query params: periode = 'jour' | 'semaine' | 'mois' | 'custom'
 *               date_debut, date_fin (pour custom)
 */
async function getRapport(req, res) {
  const { periode = 'jour', date_debut, date_fin } = req.query;

  let dateStart, dateEnd;
  const now = new Date();

  switch (periode) {
    case 'jour':
      dateStart = new Date(now); dateStart.setHours(0,0,0,0);
      dateEnd   = new Date(now); dateEnd.setHours(23,59,59,999);
      break;
    case 'semaine':
      const day = now.getDay() || 7;
      dateStart = new Date(now); dateStart.setDate(now.getDate() - day + 1); dateStart.setHours(0,0,0,0);
      dateEnd   = new Date(now); dateEnd.setHours(23,59,59,999);
      break;
    case 'mois':
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd   = new Date(now); dateEnd.setHours(23,59,59,999);
      break;
    case 'custom':
      if (!date_debut || !date_fin) {
        return res.status(400).json({ success: false, message_fr: 'Dates requises pour période personnalisée.' });
      }
      dateStart = new Date(date_debut);
      dateEnd   = new Date(date_fin); dateEnd.setHours(23,59,59,999);
      break;
    default:
      return res.status(400).json({ success: false });
  }

  const ds = dateStart.toISOString().slice(0, 19).replace('T', ' ');
  const de = dateEnd.toISOString().slice(0, 19).replace('T', ' ');

  try {
    // Résumé des ventes / Sales summary
    const [[resume]] = await pool.query(`
      SELECT COUNT(*) AS nb_ventes,
             COALESCE(SUM(montant_total),0) AS ca_total,
             COALESCE(AVG(montant_total),0) AS ca_moyen
      FROM ventes WHERE statut='validee' AND created_at BETWEEN ? AND ?
    `, [ds, de]);

    // Ventes par employé
    const [parEmploye] = await pool.query(`
      SELECT u.nom, u.prenom, COUNT(v.id) AS nb_ventes, SUM(v.montant_total) AS ca
      FROM ventes v JOIN users u ON v.employee_id = u.id
      WHERE v.statut='validee' AND v.created_at BETWEEN ? AND ?
      GROUP BY v.employee_id ORDER BY ca DESC
    `, [ds, de]);

    // Top produits vendus
    const [topProduits] = await pool.query(`
      SELECT p.reference, p.nom_fr, SUM(vl.quantite) AS qty_vendue, SUM(vl.sous_total) AS ca
      FROM vente_lignes vl
      JOIN ventes   v ON vl.vente_id   = v.id
      JOIN produits p ON vl.produit_id = p.id
      WHERE v.statut='validee' AND v.created_at BETWEEN ? AND ?
      GROUP BY vl.produit_id ORDER BY qty_vendue DESC LIMIT 10
    `, [ds, de]);

    // Liste des ventes
    const [ventes] = await pool.query(`
      SELECT v.numero_vente, v.client_nom, v.montant_total, v.created_at,
             u.prenom AS employe_prenom, u.nom AS employe_nom
      FROM ventes v JOIN users u ON v.employee_id = u.id
      WHERE v.statut='validee' AND v.created_at BETWEEN ? AND ?
      ORDER BY v.created_at DESC
    `, [ds, de]);

    // Mouvements de stock sur la période
    const [mouvements] = await pool.query(`
      SELECT ms.type_mouvement, SUM(ms.quantite) AS total_qty, COUNT(*) AS nb
      FROM mouvements_stock ms
      WHERE ms.created_at BETWEEN ? AND ?
      GROUP BY ms.type_mouvement
    `, [ds, de]);

    // État du stock actuel
    const [[stockActuel]] = await pool.query(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN quantite=0 THEN 1 ELSE 0 END) AS ruptures,
             SUM(CASE WHEN quantite>0 AND quantite<=quantite_min THEN 1 ELSE 0 END) AS faibles,
             SUM(quantite*prix_vente) AS valeur_totale
      FROM produits WHERE actif=1
    `);

    res.json({
      success: true,
      data: {
        periode,
        date_debut: ds,
        date_fin:   de,
        resume,
        par_employe:  parEmploye,
        top_produits: topProduits,
        ventes,
        mouvements_stock: mouvements,
        stock_actuel: stockActuel,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
}

module.exports = { getMetrics, getRapport };
