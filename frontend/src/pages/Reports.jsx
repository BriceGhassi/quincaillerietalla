/**
 * pages/Reports.jsx — Rapports journalier, hebdomadaire, mensuel, personnalisé
 * Génération dynamique, impression, résumé complet
 */
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useLang } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const fmt  = n => new Intl.NumberFormat('fr-FR').format(Math.round(Number(n)||0));
const fmtD = d => new Date(d).toLocaleDateString('fr-FR');

const ico = {
  chart:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  print:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  refresh:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
};

const PERIODS = ['jour', 'semaine', 'mois', 'custom'];

export default function Reports() {
  const { t, lang } = useLang();
  const { show }    = useToast();
  const R = t.reports;

  const [periode,    setPeriode]    = useState('jour');
  const [dateDebut,  setDateDebut]  = useState('');
  const [dateFin,    setDateFin]    = useState('');
  const [rapport,    setRapport]    = useState(null);
  const [loading,    setLoading]    = useState(false);

  const generate = async () => {
    if (periode==='custom' && (!dateDebut||!dateFin)) {
      show(lang==='fr'?'Sélectionnez les deux dates.':'Select both dates.', 'error'); return;
    }
    setLoading(true);
    try {
      const params = { periode };
      if (periode==='custom') { params.date_debut = dateDebut; params.date_fin = dateFin; }
      const { data } = await api.get('/dashboard/rapport', { params });
      setRapport(data.data);
    } catch { show(t.global.serverError, 'error'); }
    finally  { setLoading(false); }
  };

  const periodLabel = {
    jour:    R.day, semaine: R.week, mois: R.month, custom: R.custom
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>{R.title}</h1><p>{R.subtitle}</p></div>
          {rapport && (
            <button className="btn btn-secondary" onClick={() => window.print()}>
              {ico.print} {R.print}
            </button>
          )}
        </div>
      </div>

      {/* Sélecteur de période */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div className="form-group" style={{ margin:0 }}>
            <label className="form-label">{R.period}</label>
            <div style={{ display:'flex', gap:6 }}>
              {PERIODS.map(p => (
                <button key={p}
                  className={`btn ${periode===p?'btn-primary':'btn-secondary'} btn-sm`}
                  onClick={() => setPeriode(p)}>
                  {periodLabel[p]}
                </button>
              ))}
            </div>
          </div>

          {periode==='custom' && (<>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">{R.from}</label>
              <input className="form-input" type="date" value={dateDebut} onChange={e=>setDateDebut(e.target.value)}
                style={{ minWidth:140 }}/>
            </div>
            <div className="form-group" style={{ margin:0 }}>
              <label className="form-label">{R.to}</label>
              <input className="form-input" type="date" value={dateFin} onChange={e=>setDateFin(e.target.value)}
                style={{ minWidth:140 }}/>
            </div>
          </>)}

          <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ marginBottom:0 }}>
            {loading ? <><span className="spinner" style={{width:14,height:14}}/>{t.global.loading}</> : <>{ico.refresh} {R.generate}</>}
          </button>
        </div>
      </div>

      {/* Contenu du rapport */}
      {!rapport && !loading && (
        <div className="empty-state" style={{ paddingTop:80 }}>
          {ico.chart}
          <h3>{lang==='fr'?'Cliquez sur "Générer" pour afficher le rapport':'Click "Generate" to display the report'}</h3>
          <p>{lang==='fr'?'Sélectionnez une période ci-dessus.':'Select a period above.'}</p>
        </div>
      )}

      {loading && <div className="loader"><span className="spinner"/>{t.global.loading}</div>}

      {rapport && !loading && (
        <div id="report-content">
          {/* En-tête d'impression */}
          <div style={{ marginBottom:20 }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800 }}>
              QuincaillerieTALLA — {periodLabel[rapport.periode]}
            </h2>
            <p style={{ color:'var(--text-muted)', fontSize:13 }}>
              {lang==='fr'?'Période':'Period'}: {fmtD(rapport.date_debut)} → {fmtD(rapport.date_fin)}
            </p>
          </div>

          {/* Résumé ventes */}
          <div className="report-section">
            <h3>{R.summary}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
              {[
                [R.nbSales,      rapport.resume.nb_ventes,                 ''],
                [R.totalRevenue, `${fmt(rapport.resume.ca_total)} FCFA`,   ''],
                [R.avgSale,      `${fmt(rapport.resume.ca_moyen)} FCFA`,   ''],
              ].map(([label, val]) => (
                <div key={label} style={{ background:'var(--bg-elevated)', borderRadius:8, padding:'14px 16px' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:5 }}>{label}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'var(--orange)' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ventes par employé */}
          {rapport.par_employe?.length > 0 && (
            <div className="report-section">
              <h3>{R.byEmployee}</h3>
              {rapport.par_employe.map((e,i) => {
                const maxCa = Math.max(...rapport.par_employe.map(x=>parseFloat(x.ca)||0));
                const pct = maxCa > 0 ? ((parseFloat(e.ca)||0) / maxCa) * 100 : 0;
                return (
                  <div key={i} className="bar-item">
                    <div className="bar-label">
                      <span>{e.prenom} {e.nom} <span style={{color:'var(--text-dim)',fontSize:11}}>({e.nb_ventes} {lang==='fr'?'vente(s)':'sale(s)'})</span></span>
                      <strong>{fmt(e.ca)} FCFA</strong>
                    </div>
                    <div className="bar-track"><div className="bar-fill" style={{ width:`${pct}%` }}/></div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top produits */}
          {rapport.top_produits?.length > 0 && (
            <div className="report-section">
              <h3>{R.topProducts}</h3>
              <div style={{ height: 200, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rapport.top_produits.slice(0,8)} margin={{ top:0, right:10, left:0, bottom:30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)"/>
                    <XAxis dataKey="nom_fr" tick={{ fill:'#8A8FA8', fontSize:10 }} angle={-25} textAnchor="end" axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill:'#8A8FA8', fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip
                      contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}
                      formatter={(v, n) => [v, n==='qty_vendue'?'Qté vendue':'CA']}
                    />
                    <Bar dataKey="qty_vendue" fill="#E8560A" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, marginTop:10 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['#', lang==='fr'?'Produit':'Product', lang==='fr'?'Référence':'Reference', lang==='fr'?'Qté vendue':'Qty Sold', 'CA FCFA'].map((h,i) => (
                      <th key={i} style={{ textAlign:i>2?'right':'left', padding:'7px 4px', fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rapport.top_produits.map((p,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                      <td style={{ padding:'7px 4px', color:'var(--text-muted)', fontWeight:700 }}>{i+1}</td>
                      <td style={{ padding:'7px 4px', fontWeight:600, fontSize:13 }}>{p.nom_fr}</td>
                      <td style={{ padding:'7px 4px', fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>{p.reference}</td>
                      <td style={{ padding:'7px 4px', textAlign:'right', fontFamily:'var(--font-mono)' }}>{p.qty_vendue}</td>
                      <td style={{ padding:'7px 4px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:600 }}>{fmt(p.ca)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* État stock */}
          <div className="report-section">
            <h3>{R.stockStatus}</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
              {[
                [lang==='fr'?'Total produits':'Total products', rapport.stock_actuel.total,           'var(--text)'],
                [lang==='fr'?'En rupture':'Out of stock',      rapport.stock_actuel.ruptures,         'var(--danger)'],
                [lang==='fr'?'Stock faible':'Low stock',       rapport.stock_actuel.faibles,          'var(--warning)'],
                [lang==='fr'?'Valeur totale':'Total value',    `${fmt(rapport.stock_actuel.valeur_totale)} FCFA`, 'var(--success)'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background:'var(--bg-elevated)', borderRadius:8, padding:'12px 14px' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:4 }}>{label}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Liste des ventes */}
          {rapport.ventes?.length > 0 && (
            <div className="report-section">
              <h3>{R.salesList} ({rapport.ventes.length})</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['N° Vente', lang==='fr'?'Client':'Client', lang==='fr'?'Employé':'Employee', 'Date', 'Total FCFA'].map((h,i) => (
                      <th key={i} style={{ textAlign:i===4?'right':'left', padding:'7px 4px', fontSize:10, color:'var(--text-muted)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rapport.ventes.map((v,i) => (
                    <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                      <td style={{ padding:'7px 4px', fontFamily:'var(--font-mono)', fontWeight:600, color:'var(--orange)', fontSize:11 }}>{v.numero_vente}</td>
                      <td style={{ padding:'7px 4px' }}>{v.client_nom||'—'}</td>
                      <td style={{ padding:'7px 4px', color:'var(--text-muted)' }}>{v.employe_prenom} {v.employe_nom}</td>
                      <td style={{ padding:'7px 4px', color:'var(--text-muted)', whiteSpace:'nowrap' }}>{fmtD(v.created_at)}</td>
                      <td style={{ padding:'7px 4px', textAlign:'right', fontFamily:'var(--font-mono)', fontWeight:600 }}>{fmt(v.montant_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rapport.resume.nb_ventes === 0 && (
            <div className="empty-state"><h3>{R.noData}</h3></div>
          )}
        </div>
      )}
    </div>
  );
}
