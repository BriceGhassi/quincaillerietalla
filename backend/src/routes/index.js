/**
 * routes/index.js — Toutes les routes de l'API
 */
const express = require('express');
const { body } = require('express-validator');
const { authenticate, requireRole } = require('../middleware/auth');

const authCtrl      = require('../controllers/authController');
const inventoryCtrl = require('../controllers/inventoryController');
const salesCtrl     = require('../controllers/salesController');
const supplierCtrl  = require('../controllers/supplierController');
const dashCtrl      = require('../controllers/dashboardController');

const router = express.Router();

// ══════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════
router.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], authCtrl.login);

router.get('/auth/me',          authenticate, authCtrl.getMe);
router.put('/auth/langue',      authenticate, authCtrl.updateLangue);
router.get('/auth/users',       authenticate, requireRole('admin'), authCtrl.listUsers);
router.post('/auth/users',      authenticate, requireRole('admin'), [
  body('nom').notEmpty(),
  body('prenom').notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').isIn(['admin', 'employee']),
], authCtrl.createUser);
router.put('/auth/users/:id',   authenticate, requireRole('admin'), authCtrl.updateUser);

// ══════════════════════════════════
//  INVENTORY ROUTES
// ══════════════════════════════════
router.get('/inventory/produits',          authenticate, inventoryCtrl.getProduits);
router.get('/inventory/produits/:id',      authenticate, inventoryCtrl.getProduit);
router.post('/inventory/produits',         authenticate, requireRole('admin'), [
  body('reference').notEmpty(),
  body('nom_fr').notEmpty(),
  body('prix_vente').isFloat({ min: 0 }),
], inventoryCtrl.createProduit);
router.put('/inventory/produits/:id',      authenticate, requireRole('admin'), inventoryCtrl.updateProduit);
router.delete('/inventory/produits/:id',   authenticate, requireRole('admin'), inventoryCtrl.deleteProduit);
router.post('/inventory/produits/:id/ajuster', authenticate, requireRole('admin'), inventoryCtrl.ajusterStock);

router.get('/inventory/categories',        authenticate, inventoryCtrl.getCategories);
router.get('/inventory/mouvements',        authenticate, inventoryCtrl.getMouvements);

// ══════════════════════════════════
//  SALES ROUTES
// ══════════════════════════════════
router.get('/sales',              authenticate, salesCtrl.getVentes);
router.get('/sales/:id',          authenticate, salesCtrl.getVente);
router.post('/sales',             authenticate, salesCtrl.createVente);
router.put('/sales/:id/valider',  authenticate, salesCtrl.validerVente);
router.put('/sales/:id/annuler',  authenticate, salesCtrl.annulerVente);

// ══════════════════════════════════
//  SUPPLIER ROUTES
// ══════════════════════════════════
router.get('/suppliers',          authenticate, supplierCtrl.getFournisseurs);
router.get('/suppliers/:id',      authenticate, supplierCtrl.getFournisseur);
router.post('/suppliers',         authenticate, requireRole('admin'), [
  body('nom').notEmpty(),
], supplierCtrl.createFournisseur);
router.put('/suppliers/:id',      authenticate, requireRole('admin'), supplierCtrl.updateFournisseur);
router.delete('/suppliers/:id',   authenticate, requireRole('admin'), supplierCtrl.deleteFournisseur);

// ══════════════════════════════════
//  DASHBOARD & REPORTS ROUTES
// ══════════════════════════════════
router.get('/dashboard/metrics',  authenticate, dashCtrl.getMetrics);
router.get('/dashboard/rapport',  authenticate, requireRole('admin'), dashCtrl.getRapport);

module.exports = router;
