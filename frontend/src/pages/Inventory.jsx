/**
 * pages/Inventory.jsx — Gestion complète de l'inventaire
 * Tableau filtrable, CRUD produits (admin), ajustement stock, consultation (employé)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const fmt = n => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);

const ico = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  adj:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  close:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  pkg:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
};

const STATUS = { ok: 'ok', faible: 'low', rupture: 'out' };
const STATUS_LABEL = { ok: 'statusOk', low: 'statusLow', out: 'statusOut' };
const UNITS = ['pièce','boîte','pack','kg','litre','mètre','rouleau','sac','paire'];

const EMPTY = { reference:'', nom_fr:'', nom_en:'', description_fr:'', description_en:'', categorie_id:'', fournisseur_id:'', quantite:'0', quantite_min:'0', unite:'pièce', prix_achat:'0', prix_vente:'0' };

export default function Inventory() {
  const { t, lang }    = useLang();
  const { isAdmin }    = useAuth();
  const { show }       = useToast();
  const I = t.inventory;

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [catF,        setCatF]        = useState('');
  const [supF,        setSupF]        = useState('');
  const [stockF,      setStockF]      = useState('');
  const [modal,       setModal]       = useState(null); // 'add'|'edit'|'delete'|'adjust'
  const [selected,    setSelected]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search     = search;
      if (catF)   params.categorie  = catF;
      if (supF)   params.fournisseur= supF;
      if (stockF) params.stock      = stockF;
      const { data } = await api.get('/inventory/produits', { params });
      setProducts(data.data || []);
    } catch { show(t.global.serverError, 'error'); }
    finally  { setLoading(false); }
  }, [search, catF, supF, stockF]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/inventory/categories').then(r => setCategories(r.data.data || [])).catch(()=>{});
    api.get('/suppliers').then(r => setSuppliers(r.data.data || [])).catch(()=>{});
  }, []);

  const handleSave = async (form) => {
    try {
      if (modal === 'add') {
        await api.post('/inventory/produits', form);
        show(t.global.savedOk, 'success');
      } else {
        await api.put(`/inventory/produits/${selected.id}`, form);
        show(t.global.savedOk, 'success');
      }
      setModal(null); load();
    } catch (err) {
      const msg = err.response?.data;
      show(lang === 'fr' ? (msg?.message_fr || t.global.serverError) : (msg?.message_en || t.global.serverError), 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/inventory/produits/${selected.id}`);
      show(t.global.deletedOk, 'success');
      setModal(null); load();
    } catch { show(t.global.serverError, 'error'); }
  };

  const handleAdjust = async (type_mouvement, quantite, motif, note) => {
    try {
      await api.post(`/inventory/produits/${selected.id}/ajuster`, { type_mouvement, quantite, motif, note });
      show(t.global.savedOk, 'success');
      setModal(null); load();
    } catch (err) {
      show(err.response?.data?.message_fr || t.global.serverError, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>{I.title}</h1><p>{I.subtitle}</p></div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setSelected(null); setModal('add'); }}>
              {ico.plus} {I.addProduct}
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          {ico.search}
          <input className="search-input" placeholder={I.search} value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <select className="filter-sel" value={catF} onChange={e => setCatF(e.target.value)}>
          <option value="">{I.all} — {I.filterCategory}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{lang==='fr'?c.nom_fr:c.nom_en}</option>)}
        </select>
        <select className="filter-sel" value={supF} onChange={e => setSupF(e.target.value)}>
          <option value="">{I.all} — {I.filterSupplier}</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <select className="filter-sel" value={stockF} onChange={e => setStockF(e.target.value)}>
          <option value="">{I.all} — {I.filterStock}</option>
          <option value="ok">{I.inStock}</option>
          <option value="low">{I.lowStockOpt}</option>
          <option value="out">{I.outOfStockOpt}</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-scroll">
          {loading ? (
            <div className="loader"><span className="spinner"/>{t.global.loading}</div>
          ) : products.length === 0 ? (
            <div className="empty-state">{ico.pkg}<h3>{I.noProducts}</h3></div>
          ) : (
            <table>
              <thead><tr>
                <th>{I.ref}</th><th>{I.name}</th><th>{I.category}</th>
                <th>{I.supplier}</th><th style={{textAlign:'right'}}>{I.qty}</th>
                <th style={{textAlign:'right'}}>{I.sellPrice}</th>
                <th>{I.status}</th>
                <th style={{textAlign:'center'}}>{I.actions}</th>
              </tr></thead>
              <tbody>
                {products.map(p => {
                  const stKey = STATUS[p.statut_stock] || 'ok';
                  return (
                    <tr key={p.id}>
                      <td><span className="td-ref">{p.reference}</span></td>
                      <td className="td-name">
                        {lang==='fr' ? p.nom_fr : (p.nom_en || p.nom_fr)}
                        {p.description_fr && <small>{(lang==='fr'?p.description_fr:p.description_en||p.description_fr).slice(0,40)}…</small>}
                      </td>
                      <td><span className="chip">{lang==='fr'?p.categorie_fr:p.categorie_en}</span></td>
                      <td style={{fontSize:12,color:'var(--text-muted)'}}>{p.fournisseur_nom||'—'}</td>
                      <td className="td-num" style={{textAlign:'right'}}>{p.quantite}<span style={{fontSize:10,color:'var(--text-muted)',marginLeft:3}}>{p.unite}</span></td>
                      <td className="td-num" style={{textAlign:'right',fontSize:12}}>{fmt(p.prix_vente)} FCFA</td>
                      <td>
                        <span className={`badge ${stKey}`}>
                          <span className="badge-dot"/>{I[STATUS_LABEL[stKey]]}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions">
                          {isAdmin && <button className="btn btn-success-ghost" title={I.adjustStock} onClick={() => { setSelected(p); setModal('adjust'); }}>{ico.adj}</button>}
                          {isAdmin && <button className="btn btn-ghost" title={t.global.edit} onClick={() => { setSelected(p); setModal('edit'); }}>{ico.edit}</button>}
                          {isAdmin && <button className="btn btn-danger-ghost" title={t.global.delete} onClick={() => { setSelected(p); setModal('delete'); }}>{ico.trash}</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="table-footer">
          <span>{I.showing} <b>{products.length}</b> {I.products}</span>
        </div>
      </div>

      {/* Modals */}
      {(modal==='add'||modal==='edit') && (
        <ProductModal t={t} lang={lang} product={selected} categories={categories} suppliers={suppliers}
          isEdit={modal==='edit'} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {modal==='delete' && (
        <ConfirmModal title={I.deleteProduct} body={I.deleteConfirm} warn={I.deleteWarning}
          onConfirm={handleDelete} onClose={() => setModal(null)} t={t} danger />
      )}
      {modal==='adjust' && selected && (
        <AdjustModal t={t} lang={lang} product={selected} onSave={handleAdjust} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ── Formulaire produit ──
function ProductModal({ t, lang, product, categories, suppliers, isEdit, onSave, onClose }) {
  const I = t.inventory;
  const [form, setForm] = useState(product ? {
    reference: product.reference, nom_fr: product.nom_fr, nom_en: product.nom_en||'',
    description_fr: product.description_fr||'', description_en: product.description_en||'',
    categorie_id: product.categorie_id||'', fournisseur_id: product.fournisseur_id||'',
    quantite: product.quantite, quantite_min: product.quantite_min,
    unite: product.unite, prix_achat: product.prix_achat, prix_vente: product.prix_vente,
  } : { ...EMPTY });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({...f,[k]:v})); if(errors[k]) setErrors(e=>({...e,[k]:''})); };

  const validate = () => {
    const e = {};
    if (!form.reference.trim()) e.reference = I.form.required;
    if (!form.nom_fr.trim())    e.nom_fr    = I.form.required;
    if (!form.prix_vente)       e.prix_vente= I.form.required;
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? I.editProduct : I.addProduct}</span>
          <button className="btn btn-ghost" onClick={onClose}>{ico.close}</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{I.form.ref}</label>
              <input className={`form-input${errors.reference?' err':''}`} value={form.reference}
                onChange={e=>set('reference',e.target.value)} disabled={isEdit} placeholder="VIS-M6-001"/>
              {errors.reference && <span className="form-error">{errors.reference}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">{I.form.category}</label>
              <select className="form-select" value={form.categorie_id} onChange={e=>set('categorie_id',e.target.value)}>
                <option value="">{I.form.selectCategory}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{lang==='fr'?c.nom_fr:c.nom_en}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{I.form.nameFr}</label>
              <input className={`form-input${errors.nom_fr?' err':''}`} value={form.nom_fr}
                onChange={e=>set('nom_fr',e.target.value)} placeholder="Vis M6 acier..."/>
              {errors.nom_fr && <span className="form-error">{errors.nom_fr}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">{I.form.nameEn}</label>
              <input className="form-input" value={form.nom_en}
                onChange={e=>set('nom_en',e.target.value)} placeholder="M6 steel screw..."/>
            </div>
            <div className="form-group">
              <label className="form-label">{I.form.supplier}</label>
              <select className="form-select" value={form.fournisseur_id} onChange={e=>set('fournisseur_id',e.target.value)}>
                <option value="">{I.form.selectSupplier}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{I.form.unit}</label>
              <select className="form-select" value={form.unite} onChange={e=>set('unite',e.target.value)}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">{I.form.qty}</label>
                <input className="form-input" type="number" min="0" value={form.quantite} onChange={e=>set('quantite',e.target.value)}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">{I.form.minQty}</label>
              <input className="form-input" type="number" min="0" value={form.quantite_min} onChange={e=>set('quantite_min',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">{I.form.buyPrice}</label>
              <input className="form-input" type="number" min="0" value={form.prix_achat} onChange={e=>set('prix_achat',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">{I.form.sellPrice}</label>
              <input className={`form-input${errors.prix_vente?' err':''}`} type="number" min="0"
                value={form.prix_vente} onChange={e=>set('prix_vente',e.target.value)}/>
              {errors.prix_vente && <span className="form-error">{errors.prix_vente}</span>}
            </div>
            <div className="form-group span-2">
              <label className="form-label">{I.form.descFr}</label>
              <textarea className="form-textarea" value={form.description_fr} onChange={e=>set('description_fr',e.target.value)} rows={2}/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{I.form.cancel}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{I.form.save}</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal ajustement stock ──
function AdjustModal({ t, lang, product, onSave, onClose }) {
  const A = t.inventory.adjust;
  const [type, setType]   = useState('entree');
  const [qty,  setQty]    = useState('');
  const [motif,setMotif]  = useState('reception');
  const [note, setNote]   = useState('');
  const [saving,setSaving]= useState(false);

  const submit = async () => {
    if (!qty || parseInt(qty) <= 0) return;
    setSaving(true);
    await onSave(type, parseInt(qty), motif, note);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <span className="modal-title">{A.title}</span>
          <button className="btn btn-ghost" onClick={onClose}>{ico.close}</button>
        </div>
        <div className="modal-body">
          <p style={{fontWeight:600,marginBottom:14,fontSize:14}}>{lang==='fr'?product.nom_fr:(product.nom_en||product.nom_fr)}</p>
          <div style={{background:'var(--bg-elevated)',borderRadius:8,padding:'10px 14px',marginBottom:14,display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:12,color:'var(--text-muted)'}}>{A.current}</span>
            <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--orange)',fontSize:18}}>{product.quantite}</span>
          </div>
          <div className="form-group" style={{marginBottom:12}}>
            <label className="form-label">{A.type}</label>
            <select className="form-select" value={type} onChange={e=>setType(e.target.value)}>
              {Object.entries(A.types).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group" style={{marginBottom:12}}>
            <label className="form-label">{A.qty}</label>
            <input className="form-input" type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)} autoFocus/>
          </div>
          <div className="form-group" style={{marginBottom:12}}>
            <label className="form-label">{A.reason}</label>
            <select className="form-select" value={motif} onChange={e=>setMotif(e.target.value)}>
              {Object.entries(A.reasons).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{A.note}</label>
            <input className="form-input" value={note} onChange={e=>setNote(e.target.value)}/>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t.global.cancel}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving||!qty||parseInt(qty)<=0}>{A.apply}</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm modal générique ──
export function ConfirmModal({ title, body, warn, onConfirm, onClose, t, danger }) {
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <span className="modal-title" style={danger?{color:'var(--danger)'}:{}}>{title}</span>
          <button className="btn btn-ghost" onClick={onClose}>{ico.close}</button>
        </div>
        <div className="modal-body confirm-dialog">
          <p>{body}</p>
          {warn && <p className="warn">{warn}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t.global.cancel}</button>
          <button className="btn btn-primary"
            style={danger?{background:'var(--danger)'}:{}} onClick={onConfirm}>
            {t.global.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export ico for reuse
export { ico };
