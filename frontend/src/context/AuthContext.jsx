/**
 * context/AuthContext.jsx — Contexte d'authentification JWT
 * Gère l'état de connexion, le token et les infos utilisateur
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true); // true pendant la vérification initiale

  // ── Charger le token/user depuis localStorage au démarrage ──
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  /**
   * Connexion utilisateur / User login
   * @returns {{ success, message_fr, message_en }}
   */
  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user',  JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      return err.response?.data || { success: false, message_fr: 'Erreur réseau.', message_en: 'Network error.' };
    }
  }, []);

  /**
   * Déconnexion / Logout
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Mettre à jour la langue dans le contexte local
   * Update language in local context
   */
  const updateUserLangue = useCallback((langue) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, langue };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isAdmin    = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';
  const isLoggedIn = !!token && !!user;

  return (
    <AuthContext.Provider value={{
      user, token, loading, isLoggedIn, isAdmin, isEmployee,
      login, logout, updateUserLangue,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
