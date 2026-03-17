/**
 * pages/Login.jsx — Page de connexion unique (Admin + Employé)
 * Détecte automatiquement le rôle après authentification
 */
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';

export default function Login() {
  const { login }       = useAuth();
  const { t, lang, toggle } = useLang();
  const T = t.auth;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (!res.success) {
      setError(lang === 'fr' ? res.message_fr : res.message_en);
    }
    // Si succès → App.jsx redirige automatiquement via isLoggedIn
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 60% 40% at 80% 10%, rgba(232,86,10,.05) 0%, transparent 60%)',
      padding: 20,
    }}>
      {/* Bouton langue flottant */}
      <button className="lang-btn" onClick={toggle}
        style={{ position: 'fixed', top: 20, right: 20 }}>
        <span>{lang === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
        <span>{lang === 'fr' ? 'FR' : 'EN'}</span>
      </button>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--orange)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 26,
          }}>🔧</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 800 }}>
            {lang === 'fr' ? 'Quincaillerie' : 'Hardware'}<span style={{ color: 'var(--orange)' }}>TALLA</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{T.subtitle}</p>
        </div>

        {/* Formulaire */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '28px 28px 24px',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
            {T.title}
          </h2>

          {error && (
            <div className="alert-bar danger" style={{ marginBottom: 16 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">{T.email}</label>
              <input className="form-input" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@quincaillerie.cm"
                required autoFocus autoComplete="email" />
            </div>

            <div className="form-group" style={{ marginBottom: 22, position: 'relative' }}>
              <label className="form-label">{T.password}</label>
              <input className="form-input" type={showPwd ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password"
                style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPwd(p => !p)}
                style={{ position: 'absolute', right: 10, top: 28, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                {showPwd
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px 20px', fontSize: 15 }}>
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }}/> {T.loggingIn}</>
              ) : T.login}
            </button>
          </form>

          {/* Comptes de test */}
          {/*<div style={{ marginTop: 22, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.8px' }}>
              {lang === 'fr' ? 'Comptes des tests' : 'Test accounts'}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span>
                <span className="role-badge admin" style={{ marginRight: 5 }}>{T.adminBadge}</span>
                admin@quincaillerie.cm / Admin@1234
              </span>
            </div>
            <div style={{ marginTop: 5 }}>
              <span>
                <span className="role-badge employee" style={{ marginRight: 5 }}>{T.employeeBadge}</span>
                employe@quincaillerie.cm / Employe@1234
              </span>
            </div>
          </div>*/}
        </div>
      </div>
    </div>
  );
}
