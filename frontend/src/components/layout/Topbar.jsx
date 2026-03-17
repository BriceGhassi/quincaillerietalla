/**
 * components/layout/Topbar.jsx — Barre supérieure avec titre et actions
 */
import { useLang } from '../../context/LanguageContext';

const globeIco = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;

export default function Topbar({ title }) {
  const { lang, toggle } = useLang();
  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      <div className="topbar-actions">
        <button className="lang-btn" onClick={toggle} title="Switch language / Changer de langue">
          {globeIco}
          <span>{lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}</span>
        </button>
      </div>
    </div>
  );
}
