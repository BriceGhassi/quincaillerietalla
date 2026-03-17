/**
 * components/layout/Sidebar.jsx — Barre de navigation latérale
 * Navigation adaptée au rôle (admin vs employé)
 */
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LanguageContext';

const ico = {
  dash:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  box:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  cart:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  truck:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  chart:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  users:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  logout:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

export default function Sidebar({ page, setPage }) {
  const { user, isAdmin, logout } = useAuth();
  const { t } = useLang();
  const N = t.nav;

  // Items visibles selon le rôle
  const navItems = [
    { key: 'dashboard', label: N.dashboard, icon: ico.dash, roles: ['admin', 'employee'] },
    { key: 'inventory', label: N.inventory, icon: ico.box,  roles: ['admin', 'employee'] },
    { key: 'sales',     label: N.sales,     icon: ico.cart, roles: ['admin', 'employee'] },
    { key: 'suppliers', label: N.suppliers, icon: ico.truck,roles: ['admin'] },
    { key: 'reports',   label: N.reports,   icon: ico.chart,roles: ['admin'] },
    { key: 'users',     label: N.users,     icon: ico.users,roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role));

  const initials = user ? (user.prenom[0] + user.nom[0]).toUpperCase() : '?';

  return (
    <aside className="app-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">QP</div>
        <span className="brand-name">
          Quincaillerie<span>TALLA</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            {item.icon}
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer: User + Logout */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.prenom} {user?.nom}</div>
            <div className="user-role">
              <span className={`role-badge ${user?.role}`}>
                {user?.role === 'admin' ? t.auth.adminBadge : t.auth.employeeBadge}
              </span>
            </div>
          </div>
        </div>
        <button className="nav-item" onClick={logout} style={{ marginTop: 4, color: 'var(--danger)' }}>
          {ico.logout}
          <span className="nav-label">{N.logout}</span>
        </button>
      </div>
    </aside>
  );
}
