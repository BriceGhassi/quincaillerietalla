/**
 * server.js — Serveur Express principal / Main Express server
 * Démarre le serveur API REST avec tous les middlewares de sécurité
 */
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { testConnection } = require('./config/database');
const routes     = require('./routes/index');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Sécurité: En-têtes HTTP / HTTP Security headers ──
app.use(helmet());

// ── CORS: Autoriser le frontend / Allow frontend ──
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parsing JSON ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting: Protection brute force ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      200,              // Max 200 requêtes par fenêtre
  message:  { success: false, message_fr: 'Trop de requêtes. Réessayez dans 15 minutes.' },
});
app.use('/api/', limiter);

// ── Rate limiting plus strict pour le login ──
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message_fr: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});
app.use('/api/auth/login', loginLimiter);

// ── Toutes les routes API ──
app.use('/api', routes);

// ── Route de santé / Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Gestion des routes inconnues / 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable / Route not found' });
});

// ── Gestion globale des erreurs / Global error handler ──
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({ success: false, message_fr: 'Erreur interne du serveur.', message_en: 'Internal server error.' });
});

// ── Démarrage du serveur / Start server ──
async function startServer() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('❌  Impossible de se connecter à MySQL. Vérifiez votre fichier .env');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀  Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📋  API disponible sur http://localhost:${PORT}/api`);
    console.log(`🌍  Environnement: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer();
