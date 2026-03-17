/**
 * middleware/auth.js — Middleware d'authentification JWT
 * Vérifie le token JWT et injecte l'utilisateur dans req.user
 */
const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Middleware principal d'authentification
 * Vérifie la présence et la validité du token Bearer
 */
function authenticate(req, res, next) {
  // Extraire le token du header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({
      success: false,
      message_fr: 'Accès refusé. Veuillez vous connecter.',
      message_en: 'Access denied. Please log in.',
    });
  }

  try {
    // Vérifier et décoder le token / Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, nom, prenom }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message_fr: 'Session expirée. Reconnectez-vous.',
        message_en: 'Session expired. Please log in again.',
      });
    }
    return res.status(403).json({
      success: false,
      message_fr: 'Token invalide.',
      message_en: 'Invalid token.',
    });
  }
}

/**
 * Middleware de restriction par rôle / Role restriction middleware
 * Usage: requireRole('admin') ou requireRole('admin', 'employee')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message_fr: 'Accès interdit. Droits insuffisants.',
        message_en: 'Forbidden. Insufficient permissions.',
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
