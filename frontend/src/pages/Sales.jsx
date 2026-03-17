/**
 * pages/Sales.jsx — Gestion des ventes
 * Créer une vente, valider (débit stock), annuler, historique
 */
import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal, ico as sharedIco } from './Inventory';
import api from '../utils/api';

const fmt = n => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);

const ico = {
  ...sharedIco,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  eye:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

const STATUS_CLASS = { en_cours: 'pending', validee: 'validated', annulee: 'cancelled' };

export default function Sales() {
  const { t, lang }    = useLang();
  const { isAdmin }    = useAuth();
  const { show }       = useToast();
  const S = t.sales;

  const [ventes,   setVentes]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [modal,    setModal]   = useState(null); // 'new'|'detail'|'validate'|'cancel'
  const [selected, setSelected]= useState(null);
  const [detail,   setDetail]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sales', { params: { limit: 100 } });
      setVentes(data.data || []);
    } catch { show(t.global.serverError, 'error'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async () => {
    try {
      await api.put(`/sales/${selected.id}/valider`);
      show(lang==='fr'?'Vente validée et stock débité.':'Sale validated and stock debited.', 'success');
      setModal(null); load();
    } catch (err) {
      show(err.response?.data?.message_fr || t.global.serverError, 'error');
    }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/sales/${selected.id}/annuler`);
      show(lang==='fr'?'Vente annulée.':'Sale cancelled.', 'success');
      setModal(null); load();
    } catch (err) {
      show(err.response?.data?.message_fr || t.global.serverError, 'error');
    }
  };

  const openDetail = async (v) => {
    try {
      const { data } = await api.get(`/sales/${v.id}`);
      setDetail(data.data);
      setSelected(v);
      setModal('detail');
    } catch { show(t.global.serverError, 'error'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>{S.title}</h1><p>{S.subtitle}</p></div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            {ico.plus} {S.newSale}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          {loading ? (
            <div className="loader"><span className="spinner"/>{t.global.loading}</div>
          ) : ventes.length === 0 ? (
            <div className="empty-state">
              {ico.cart}<h3>{S.noSales}</h3>
            </div>
          ) : (
            <table>
              <thead><tr>
                <th>{S.saleNumber}</th>
                <th>{S.client}</th>
                <th>{S.employee}</th>
                <th style={{textAlign:'right'}}>{S.total}</th>
                <th>{S.date}</th>
                <th>{S.status}</th>
                <th style={{textAlign:'center'}}>{S.actions}</th>
              </tr></thead>
              <tbody>
                {ventes.map(v => (
                  <tr key={v.id}>
                    <td><span style={{fontFamily:'var(--font-mono)',fontWeight:600,color:'var(--orange)',fontSize:13}}>{v.numero_vente}</span></td>
                    <td style={{fontSize:13}}>{v.client_nom || '—'}</td>
                    <td style={{fontSize:13,color:'var(--text-muted)'}}>{v.employe_prenom} {v.employe_nom}</td>
                    <td className="td-num" style={{textAlign:'right'}}>{fmt(v.montant_total)} <span style={{fontSize:10,color:'var(--text-muted)'}}>FCFA</span></td>
                    <td style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{new Date(v.created_at).toLocaleDateString(lang==='fr'?'fr-FR':'en-GB')}</td>
                    <td>
                      <span className={`badge ${STATUS_CLASS[v.statut]}`}>
                        <span className="badge-dot"/>
                        {S.statuses[v.statut]}
                      </span>
                    </td>
                    <td>
                      <div className="td-actions">
                        <button className="btn btn-ghost" title={S.detail} onClick={() => openDetail(v)}>{ico.eye}</button>
                        {v.statut === 'en_cours' && (
                          <button className="btn btn-success-ghost" title={S.validate}
                            onClick={() => { setSelected(v); setModal('validate'); }}>{ico.check}</button>
                        )}
                        {(v.statut === 'en_cours' || (v.statut === 'validee' && isAdmin)) && (
                          <button className="btn btn-danger-ghost" title={S.cancel}
                            onClick={() => { setSelected(v); setModal('cancel'); }}>{ico.trash}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="table-footer">
          <span><b>{ventes.length}</b> {lang==='fr'?'vente(s)':'sale(s)'}</span>
        </div>
      </div>

      {modal === 'new' && <NewSaleModal t={t} lang={lang} onClose={() => setModal(null)} onCreated={() => { setModal(null); load(); }} show={show}/>}

      {modal === 'detail' && detail && (
        <SaleDetailModal t={t} lang={lang} sale={detail} onClose={() => setModal(null)}/>
      )}

      {modal === 'validate' && selected && (
        <ConfirmModal title={S.validate} body={S.validateConfirm}
          onConfirm={handleValidate} onClose={() => setModal(null)} t={t}/>
      )}
      {modal === 'cancel' && selected && (
        <ConfirmModal title={S.cancel} body={S.cancelConfirm}
          onConfirm={handleCancel} onClose={() => setModal(null)} t={t} danger/>
      )}
    </div>
  );
}

// ── Modal nouvelle vente ──
function NewSaleModal({ t, lang, onClose, onCreated, show }) {
  const F = t.sales.newSaleForm;
  const [products,  setProducts]  = useState([]);
  const [lignes,    setLignes]    = useState([]);
  const [clientNom, setClientNom] = useState('');
  const [clientTel, setClientTel] = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    api.get('/inventory/produits', { params: { stock: 'ok', limit: 200 } })
      .then(r => setProducts(r.data.data || []));
  }, []);

  const addLigne = () => {
    setLignes(l => [...l, { produit_id: '', quantite: 1, prix_unitaire: 0, _produit: null }]);
  };

  const updateLigne = (i, field, value) => {
    setLignes(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === 'produit_id') {
        const p = products.find(p => String(p.id) === String(value));
        next[i]._produit     = p || null;
        next[i].prix_unitaire= p ? parseFloat(p.prix_vente) : 0;
      }
      return next;
    });
  };

  const removeLigne = (i) => setLignes(l => l.filter((_,j) => j !== i));

  const total = lignes.reduce((s, l) => s + (parseFloat(l.prix_unitaire)||0) * (parseInt(l.quantite)||0), 0);

  const submit = async () => {
    if (lignes.length === 0) { show(F.noItems, 'error'); return; }
    const valid = lignes.filter(l => l.produit_id && l.quantite > 0 && l.prix_unitaire >= 0);
    if (valid.length !== lignes.length) { show(F.noItems, 'error'); return; }
    setSaving(true);
    try {
      await api.post('/sales', { client_nom: clientNom, client_tel: clientTel, notes, lignes: valid });
      show(lang==='fr'?'Vente créée avec succès.':'Sale created successfully.', 'success');
      onCreated();
    } catch (err) {
      show(err.response?.data?.message_fr || t.global.serverError, 'error');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{F.title}</span>
          <button className="btn btn-ghost" onClick={onClose}>{ico.close}</button>
        </div>
        <div className="modal-body">
          <div className="form-grid" style={{marginBottom:16}}>
            <div className="form-group">
              <label className="form-label">{F.clientName}</label>
              <input className="form-input" value={clientNom} onChange={e=>setClientNom(e.target.value)} placeholder="M. Essomba..."/>
            </div>
            <div className="form-group">
              <label className="form-label">{F.clientPhone}</label>
              <input className="form-input" value={clientTel} onChange={e=>setClientTel(e.target.value)} placeholder="+237 6xx xxx xxx"/>
            </div>
          </div>

          {/* Lignes */}
          <div style={{marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontWeight:700,fontSize:13,textTransform:'uppercase',letterSpacing:'.8px',color:'var(--text-muted)'}}>
              {lang==='fr'?'Articles':'Items'}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={addLigne}>{ico.plus} {F.addItem}</button>
          </div>

          {lignes.length === 0 && (
            <div style={{textAlign:'center',padding:'20px',color:'var(--text-dim)',fontSize:13,background:'var(--bg-elevated)',borderRadius:8,marginBottom:12}}>
              {F.noItems}
            </div>
          )}

          {lignes.map((l, i) => (
            <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 80px 120px 100px 32px',gap:8,alignItems:'end',marginBottom:8}}>
              <div className="form-group" style={{margin:0}}>
                {i===0 && <label className="form-label">{F.product}</label>}
                <select className="form-select" value={l.produit_id} onChange={e=>updateLigne(i,'produit_id',e.target.value)}>
                  <option value="">{F.selectProduct}</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {lang==='fr'?p.nom_fr:(p.nom_en||p.nom_fr)} ({p.quantite} {F.available})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{margin:0}}>
                {i===0 && <label className="form-label">{F.qty}</label>}
                <input className="form-input" type="number" min="1"
                  max={l._produit?.quantite||9999} value={l.quantite}
                  onChange={e=>updateLigne(i,'quantite',e.target.value)}/>
              </div>
              <div className="form-group" style={{margin:0}}>
                {i===0 && <label className="form-label">{F.unitPrice}</label>}
                <input className="form-input" type="number" min="0" value={l.prix_unitaire}
                  onChange={e=>updateLigne(i,'prix_unitaire',e.target.value)}/>
              </div>
              <div className="form-group" style={{margin:0}}>
                {i===0 && <label className="form-label">{F.subtotal}</label>}
                <div style={{padding:'9px 12px',background:'var(--bg-elevated)',borderRadius:8,fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>
                  {fmt((parseFloat(l.prix_unitaire)||0)*(parseInt(l.quantite)||0))}
                </div>
              </div>
              <button className="btn btn-danger-ghost" onClick={()=>removeLigne(i)} style={{padding:'8px',alignSelf:'flex-end'}}>
                {ico.trash}
              </button>
            </div>
          ))}

          {/* Total */}
          <div style={{background:'var(--bg-elevated)',borderRadius:8,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
            <span style={{fontWeight:700,fontSize:14}}>{F.total}</span>
            <span style={{fontFamily:'var(--font-mono)',fontWeight:800,fontSize:20,color:'var(--orange)'}}>{fmt(total)} FCFA</span>
          </div>

          <div className="form-group" style={{marginTop:12}}>
            <label className="form-label">{F.notes}</label>
            <input className="form-input" value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{F.cancel}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving||lignes.length===0}>{F.create}</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal détail vente ──
function SaleDetailModal({ t, lang, sale, onClose }) {
  const S = t.sales;
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title" style={{fontFamily:'var(--font-mono)',color:'var(--orange)'}}>{sale.numero_vente}</span>
          <button className="btn btn-ghost" onClick={onClose}>{ico.close}</button>
        </div>
        <div className="modal-body">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
            {[
              [lang==='fr'?'Client':'Client',          sale.client_nom||'—'],
              [lang==='fr'?'Employé':'Employee',       `${sale.employe_prenom} ${sale.employe_nom}`],
              [lang==='fr'?'Date':'Date',              new Date(sale.created_at).toLocaleString(lang==='fr'?'fr-FR':'en-GB')],
              [lang==='fr'?'Statut':'Status',          S.statuses[sale.statut]],
            ].map(([k,v]) => (
              <div key={k} style={{background:'var(--bg-elevated)',borderRadius:8,padding:'10px 14px'}}>
                <div style={{fontSize:10,color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.8px',marginBottom:4}}>{k}</div>
                <div style={{fontWeight:600,fontSize:14}}>{v}</div>
              </div>
            ))}
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                <th style={{textAlign:'left',padding:'8px 0',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',fontSize:11}}>{lang==='fr'?'Produit':'Product'}</th>
                <th style={{textAlign:'right',padding:'8px 0',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',fontSize:11}}>{S.newSaleForm.qty}</th>
                <th style={{textAlign:'right',padding:'8px 0',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',fontSize:11}}>{S.newSaleForm.unitPrice}</th>
                <th style={{textAlign:'right',padding:'8px 0',color:'var(--text-muted)',fontWeight:700,textTransform:'uppercase',fontSize:11}}>{S.newSaleForm.subtotal}</th>
              </tr>
            </thead>
            <tbody>
              {(sale.lignes||[]).map((l,i) => (
                <tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  <td style={{padding:'9px 0'}}>
                    <div style={{fontWeight:600}}>{lang==='fr'?l.nom_fr:(l.nom_en||l.nom_fr)}</div>
                    <div style={{fontSize:11,color:'var(--text-muted)',fontFamily:'var(--font-mono)'}}>{l.reference}</div>
                  </td>
                  <td style={{textAlign:'right',fontFamily:'var(--font-mono)',padding:'9px 0'}}>{l.quantite}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--font-mono)',padding:'9px 0',fontSize:12}}>{fmt(l.prix_unitaire)}</td>
                  <td style={{textAlign:'right',fontFamily:'var(--font-mono)',padding:'9px 0',fontWeight:600}}>{fmt(l.sous_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,alignItems:'center',marginTop:12,padding:'10px 0'}}>
            <span style={{fontWeight:700,fontSize:15}}>{S.newSaleForm.total}</span>
            <span style={{fontFamily:'var(--font-mono)',fontWeight:800,fontSize:22,color:'var(--orange)'}}>{fmt(sale.montant_total)} FCFA</span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t.global.close}</button>
        </div>
      </div>
    </div>
  );
}
