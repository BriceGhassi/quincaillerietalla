/**
 * controllers/authController.js — Contrôleur d'authentification
 * Gère la connexion, déconnexion, et gestion des utilisateurs
 */
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
require('dotenv').config();

/**
 * POST /api/auth/login
 * Authentifie un utilisateur et retourne un token JWT
 */
async function login(req, res) {
  // Valider les entrées / Validate inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Rechercher l'utilisateur par email / Find user by email
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND actif = 1',
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message_fr: 'Email ou mot de passe incorrect.',
        message_en: 'Incorrect email or password.',
      });
    }

    const user = rows[0];

    // Vérifier le mot de passe / Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message_fr: 'Email ou mot de passe incorrect.',
        message_en: 'Incorrect email or password.',
      });
    }

    // Générer le token JWT / Generate JWT token
    const payload = {
      id:     user.id,
      uuid:   user.uuid,
      email:  user.email,
      role:   user.role,
      nom:    user.nom,
      prenom: user.prenom,
      langue: user.langue,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.json({
      success: true,
      token,
      user: {
        id:     user.id,
        email:  user.email,
        nom:    user.nom,
        prenom: user.prenom,
        role:   user.role,
        langue: user.langue,
      },
      message_fr: `Bienvenue, ${user.prenom} !`,
      message_en: `Welcome, ${user.prenom}!`,
    });

  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ success: false, message_fr: 'Erreur serveur.', message_en: 'Server error.' });
  }
}

/**
 * GET /api/auth/me
 * Retourne le profil de l'utilisateur connecté
 */
async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, uuid, nom, prenom, email, role, langue, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message_fr: 'Erreur serveur.' });
  }
}

/**
 * PUT /api/auth/langue
 * Met à jour la préférence de langue de l'utilisateur
 */
async function updateLangue(req, res) {
  const { langue } = req.body;
  if (!['fr', 'en'].includes(langue)) {
    return res.status(400).json({ success: false });
  }
  try {
    await pool.query('UPDATE users SET langue = ? WHERE id = ?', [langue, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

/**
 * GET /api/auth/users — ADMIN ONLY
 * Liste tous les utilisateurs
 */
async function listUsers(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, uuid, nom, prenom, email, role, actif, langue, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

/**
 * POST /api/auth/users — ADMIN ONLY
 * Crée un nouvel utilisateur
 */
async function createUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { nom, prenom, email, password, role } = req.body;
  try {
    // Vérifier si l'email existe / Check email uniqueness
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message_fr: 'Cet email est déjà utilisé.',
        message_en: 'This email is already taken.',
      });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (uuid, nom, prenom, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), nom, prenom, email.toLowerCase(), hash, role || 'employee']
    );

    res.status(201).json({ success: true, id: result.insertId,
      message_fr: 'Utilisateur créé avec succès.', message_en: 'User created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

/**
 * PUT /api/auth/users/:id — ADMIN ONLY
 * Met à jour un utilisateur (y compris réinitialiser le mot de passe)
 */
async function updateUser(req, res) {
  const { id } = req.params;
  const { nom, prenom, email, role, actif, password } = req.body;
  try {
    let query = 'UPDATE users SET nom=?, prenom=?, email=?, role=?, actif=? WHERE id=?';
    let params = [nom, prenom, email, role, actif, id];

    // Si nouveau mot de passe fourni / If new password provided
    if (password && password.length >= 8) {
      const hash = await bcrypt.hash(password, 12);
      query = 'UPDATE users SET nom=?, prenom=?, email=?, role=?, actif=?, password=? WHERE id=?';
      params = [nom, prenom, email, role, actif, hash, id];
    }

    await pool.query(query, params);
    res.json({ success: true, message_fr: 'Utilisateur mis à jour.', message_en: 'User updated.' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

module.exports = { login, getMe, updateLangue, listUsers, createUser, updateUser };
