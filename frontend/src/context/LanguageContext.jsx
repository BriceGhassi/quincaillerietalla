/**
 * context/LanguageContext.jsx — Contexte de langue FR/EN
 * Persistance via localStorage + synchronisation avec le profil serveur
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import translations from '../utils/translations';
import api from '../utils/api';

const LanguageContext = createContext(null);

export function LanguageProvider({ children, userLangue }) {
  const [lang, setLang] = useState(() => {
    // Priorité: préférence serveur > localStorage > 'fr'
    return userLangue || localStorage.getItem('lang') || 'fr';
  });

  // Synchroniser si la langue utilisateur change (après login)
  useEffect(() => {
    if (userLangue && userLangue !== lang) {
      setLang(userLangue);
    }
  }, [userLangue]);

  const toggle = useCallback(async () => {
    const next = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    localStorage.setItem('lang', next);
    // Persister côté serveur si connecté
    try { await api.put('/auth/langue', { langue: next }); } catch {}
  }, [lang]);

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
