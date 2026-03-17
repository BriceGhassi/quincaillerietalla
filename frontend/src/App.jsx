/**
 * App.jsx — Routeur principal et garde d'authentification
 * Gère la navigation entre les pages via état React (pas de router externe)
 */
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useLang } from './context/LanguageContext';
import Sidebar from './components/layout/Sidebar';
import Topbar  from './components/layout/Topbar';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales     from './pages/Sales';
import Suppliers from './pages/Suppliers';
import Reports   from './pages/Reports';
import Users     from './pages/Users';

export default function App() {
  const { isLoggedIn, loading, isAdmin } = useAuth();
  const { t } = useLang();
  const [page, setPage] = useState('dashboard');

  // Afficher un loader pendant la vérification du token sauvegardé
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:12, color:'var(--text-muted)', fontSize:14 }}>
        <span className="spinner"/>
        {t.global.loading}
      </div>
    );
  }

  // Non connecté → Page de connexion
  if (!isLoggedIn) return <Login />;

  // Rediriger les employés hors de leurs pages non autorisées
  const adminPages = ['suppliers','reports','users'];
  const activePage = (!isAdmin && adminPages.includes(page)) ? 'dashboard' : page;

  // Titre de la page active
  const pageTitles = {
    dashboard: t.nav.dashboard,
    inventory: t.nav.inventory,
    sales:     t.nav.sales,
    suppliers: t.nav.suppliers,
    reports:   t.nav.reports,
    users:     t.nav.users,
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'inventory': return <Inventory />;
      case 'sales':     return <Sales />;
      case 'suppliers': return <Suppliers />;
      case 'reports':   return <Reports />;
      case 'users':     return <Users />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar page={activePage} setPage={setPage}/>
      <div className="app-content">
        <Topbar title={pageTitles[activePage]}/>
        <div className="page-body">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
