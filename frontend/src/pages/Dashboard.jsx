/**
 * pages/Dashboard.jsx — Tableau de bord principal
 * Métriques temps réel, graphique CA 7 jours, alertes, top produits
 */
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const fmt = n => new Intl.NumberFormat('fr-FR').format(Math.round(n || 0));

// Icônes dashboard
const ico = {
  box:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  alert:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  ban:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  dollar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  cart:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  star:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  bell:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  clock:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  arrowU: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>,
  arrowD: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
};

export default function Dashboard() {
  const { t, lang } = useLang();
  const { isAdmin }  = useAuth();
  const D = t.dashboard;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/metrics')
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loader"><span className="spinner"/>{t.global.loading}</div>;
  if (!data)   return <div className="loader">—</div>;

  const { produits, ventes_jour, ventes_mois, ca_par_jour, top_produits, alertes, mouvements_recents } = data;

  // Formater les données du graphique / Format chart data
  const chartData = ca_par_jour.map(d => ({
    jour: new Date(d.jour).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { weekday: 'short', day: 'numeric' }),
    ca:   parseFloat(d.ca) || 0,
    nb:   d.nb,
  }));

  const metrics = [
    { label: D.totalProducts, value: produits.total_produits, sub: `${produits.en_rupture} rupture(s)`, accent: 'var(--orange)', accentBg: 'var(--orange-muted)', icon: ico.box },
    { label: D.outOfStock,    value: produits.en_rupture,     sub: `/ ${produits.total_produits}`,      accent: 'var(--danger)',  accentBg: 'var(--danger-bg)',  icon: ico.ban },
    { label: D.lowStock,      value: produits.stock_faible,   sub: lang==='fr'?'sous le seuil min':'below min threshold', accent: 'var(--warning)', accentBg: 'var(--warning-bg)', icon: ico.alert },
    { label: D.stockValue,    value: `${fmt(produits.valeur_stock_vente)} FCFA`, sub: lang==='fr'?'valeur vente estimée':'estimated sell value', accent: 'var(--success)', accentBg: 'var(--success-bg)', icon: ico.dollar, sm: true },
  ];

  if (isAdmin) {
    // Ligne 2 pour admin: métriques ventes
    metrics.push(
      { label: D.salesToday,   value: ventes_jour.nb_ventes,  sub: lang==='fr'?'transactions':'transactions', accent: 'var(--info)',    accentBg: 'var(--info-bg)',    icon: ico.cart },
      { label: D.revenueToday, value: `${fmt(ventes_jour.ca_jour)} FCFA`, sub: lang==='fr'?`aujourd'hui`:'today', accent: 'var(--orange)', accentBg: 'var(--orange-muted)', icon: ico.dollar, sm: true },
      { label: D.salesMonth,   value: ventes_mois.nb_ventes,  sub: lang==='fr'?'ce mois':'this month', accent: 'var(--success)', accentBg: 'var(--success-bg)', icon: ico.cart },
      { label: D.revenueMonth, value: `${fmt(ventes_mois.ca_mois)} FCFA`, sub: lang==='fr'?'ce mois':'this month', accent: 'var(--info)', accentBg: 'var(--info-bg)', icon: ico.dollar, sm: true },
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{D.title}</h1>
        <p>{D.subtitle}</p>
      </div>

      {/* ── Métriques stock ── */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {metrics.slice(0,4).map((m,i) => (
          <MetricCard key={i} {...m} />
        ))}
      </div>

      {/* ── Métriques ventes (admin seulement) ── */}
      {isAdmin && metrics.length > 4 && (
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          {metrics.slice(4).map((m,i) => (
            <MetricCard key={i} {...m} />
          ))}
        </div>
      )}

      {/* ── Graphique CA + Alertes ── */}
      {isAdmin && (
        <div className="dash-grid" style={{ marginBottom: 20 }}>
          <div className="card">
            <div className="card-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>{D.revenueChart}</div>
            {chartData.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{D.noData || t.global.noData}</p>
              : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#E8560A" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#E8560A" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                    <XAxis dataKey="jour" tick={{ fill: '#8A8FA8', fontSize: 11 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: '#8A8FA8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmt(v/1000)}k`}/>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'var(--text)', fontWeight: 700 }}
                      formatter={v => [`${fmt(v)} FCFA`, 'CA']}
                    />
                    <Area type="monotone" dataKey="ca" stroke="#E8560A" strokeWidth={2} fill="url(#caGrad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Alertes stock */}
          <div className="card">
            <div className="card-title">{ico.bell}{D.alerts}</div>
            {alertes.length === 0
              ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{D.noAlerts}</p>
              : alertes.slice(0, 7).map(p => (
                <div key={p.id} className={`alert-bar ${p.quantite === 0 ? 'danger' : 'warning'}`}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lang === 'fr' ? p.nom_fr : (p.nom_en || p.nom_fr)}</div>
                    <div style={{ fontSize: 11, opacity: .7 }}>
                      {p.quantite === 0
                        ? (lang === 'fr' ? 'Rupture totale' : 'Out of stock')
                        : `${p.quantite} / min ${p.quantite_min}`}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Top produits + Mouvements récents ── */}
      <div className="dash-grid-wide">
        <div className="card">
          <div className="card-title">{ico.clock}{D.recentMovements}</div>
          {mouvements_recents.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{D.noMovements}</p>
            : mouvements_recents.map((mv, i) => {
                const isIn = mv.type_mouvement === 'entree' || mv.type_mouvement === 'retour';
                return (
                  <div key={i} className="movement-row">
                    <div className={`mv-icon ${isIn ? 'in' : 'out'}`}>
                      {isIn ? ico.arrowD : ico.arrowU}
                    </div>
                    <div className="mv-info">
                      <div className="mv-name">{lang === 'fr' ? mv.nom_fr : (mv.nom_en || mv.nom_fr)}</div>
                      <div className="mv-meta">{mv.reference} · {mv.user_prenom} · {new Date(mv.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className={`mv-qty ${isIn ? 'in' : 'out'}`}>
                      {isIn ? '+' : '-'}{mv.quantite}
                    </div>
                  </div>
                );
              })
          }
        </div>

        {isAdmin && (
          <div className="card">
            <div className="card-title">{ico.star}{D.topProducts}</div>
            {(top_produits || []).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: i === 0 ? 'var(--orange)' : 'var(--text-dim)', width: 24, textAlign: 'center' }}>{i+1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nom_fr}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.reference}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600 }}>{p.total_qty} {t.global.units}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{fmt(p.total_ca)} FCFA</div>
                </div>
              </div>
            ))}
            {(!top_produits || top_produits.length === 0) && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t.global.noData}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, accent, accentBg, icon, sm }) {
  return (
    <div className="metric-card" style={{ '--accent': accent, '--accent-bg': accentBg }}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value${sm?' sm':''}`}>{value}</div>
      <div className="metric-sub">{sub}</div>
      <div className="metric-icon">{icon}</div>
    </div>
  );
}
