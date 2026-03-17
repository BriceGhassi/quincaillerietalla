/**
 * main.jsx — Point d'entrée React
 * Assemble tous les providers dans le bon ordre
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

import { AuthProvider, useAuth }         from './context/AuthContext';
import { LanguageProvider }              from './context/LanguageContext';
import { ToastProvider }                 from './context/ToastContext';
import App                               from './App';

/**
 * LanguageWrapper — permet de lire la langue préférée de l'utilisateur
 * depuis l'AuthContext avant d'initialiser le LanguageProvider
 */
function LanguageWrapper({ children }) {
  const { user } = useAuth();
  return (
    <LanguageProvider userLangue={user?.langue}>
      {children}
    </LanguageProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LanguageWrapper>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LanguageWrapper>
    </AuthProvider>
  </StrictMode>
);
