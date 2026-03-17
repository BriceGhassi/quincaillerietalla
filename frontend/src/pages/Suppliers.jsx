/**
 * pages/Suppliers.jsx — Gestion des fournisseurs
 * Affichage en cartes, CRUD complet (admin), recherche
 */
import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal, ico as sharedIco } from './Inventory';
import api from '../utils/api';

const ico = {
  ...sharedIco,
  close:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  truck:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  phone:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  mail:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  pin:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

const EMPTY_FORM = { nom:'', contact:'', telephone:'', email:'', adresse:'', ville:'', notes:'' };

export default function Suppliers() {
  const { t, lang } = useLang();
  const { show }    = useToast();
  const S = t.suppliers;

  const [suppliers, setSuppliers] = useState([]);
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [selected,  setSelected]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/suppliers', { params: search ? { search } : {} });
      setSuppliers(data.data || []);
    } catch { show(t.global.serverError, 'error'); }
    finally  { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    try {
      if (modal === 'add') {
        await api.post('/suppliers', form);
      } else {
        await api.put(`/suppliers/${selected.id}`, { ...form, actif: 1 });
      }
      show(t.global.savedOk, 'success');
      setModal(null); load();
    } catch (err) {
      show(err.response?.data?.message_fr || t.global.serverError, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/suppliers/${selected.id}`);
      show(t.global.deletedOk, 'success');
      setModal(null); load();
    } catch { show(t.global.serverError, 'error'); }
  };

  const filtered = search
    ? suppliers.filter(s => s.nom.toLowerCase().includes(search.toLowerCase()) ||
        (s.ville||'').toLowerCase().includes(search.toLowerCase()))
    : suppliers;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>{S.title}</h1><p>{S.subtitle}</p></div>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setModal('add'); }}>
            {ico.plus} {S.add}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          {ico.search}
          <input className="search-input" placeholder={S.search} value={search}
            onChange={e => setSearch(e.target.value)}/>
        </div>
        <span style={{fontSize:12,color:'var(--text-muted)',marginLeft:'auto'}}>
          <b>{filtered.length}</b> {lang==='fr'?'fournisseur(s)':'supplier(s)'}
        </span>
      </div>

      {/* Grille de cartes / Card grid */}
      {loading ? (
        <div className="loader"><span className="spinner"/>{t.global.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">{ico.truck}<h3>{S.noSuppliers}</h3></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16 }}>
          {filtered.map(s => (
            <div key={s.id} className="supplier-card">
              {/* En-tête de la carte */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:800, lineHeight:1.2 }}>{s.nom}</div>
                  {s.ville && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4, fontSize:12, color:'var(--text-muted)' }}>
                      <span style={{width:12,height:12,flexShrink:0}}>{ico.pin}</span> {s.ville}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--orange)' }}>
                  {s.nb_produits}
                  <span style={{ fontSize:11, color:'var(--text-muted)', display:'block', fontWeight:600, fontFamily:'var(--font)', textAlign:'right' }}>
                    {S.suppliedProducts}
                  </span>
                </span>
              </div>

              {/* Infos de contact */}
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                {s.contact && (
                  <div style={{ fontSize:13, color:'var(--text-muted)', display:'flex', gap:6, alignItems:'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    {s.contact}
                  </div>
                )}
                {s.telephone && (
                  <div style={{ fontSize:13, color:'var(--text-muted)', display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{width:13,height:13,flexShrink:0}}>{ico.phone}</span>
                    <a href={`tel:${s.telephone}`} style={{ color:'inherit', textDecoration:'none' }}>{s.telephone}</a>
                  </div>
                )}
                {s.email && (
                  <div style={{ fontSize:13, color:'var(--text-muted)', display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{width:13,height:13,flexShrink:0}}>{ico.mail}</span>
                    <a href={`mailto:${s.email}`} style={{ color:'var(--info)', textDecoration:'none', fontSize:12 }}>{s.email}</a>
                  </div>
                )}
                {s.notes && (
                  <div style={{ fontSize:11, color:'var(--text-dim)', marginTop:4, fontStyle:'italic' }}>
                    {s.notes.slice(0, 60)}{s.notes.length > 60 ? '…' : ''}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display:'flex', gap:6, borderTop:'1px solid var(--border)', paddingTop:10 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(s); setModal('edit'); }}>
                  {ico.edit} {S.edit}
                </button>
                <button className="btn btn-danger-ghost btn-sm" onClick={() => { setSelected(s); setModal('delete'); }}>
                  {ico.trash}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal==='add'||modal==='edit') && (
        <SupplierModal t={t} supplier={selected} isEdit={modal==='edit'}
          onSave={handleSave} onClose={() => setModal(null)}/>
      )}
      {modal==='delete' && (
        <ConfirmModal title={S.deleteConfirm} body={S.deleteConfirm}
          onConfirm={handleDelete} onClose={() => setModal(null)} t={t} danger/>
      )}
    </div>
  );
}

// ── Formulaire fournisseur ──
function SupplierModal({ t, supplier, isEdit, onSave, onClose }) {
  const S = t.suppliers;
  const [form, setForm] = useState(supplier ? {
    nom: supplier.nom, contact: supplier.contact||'',
    telephone: supplier.telephone||'', email: supplier.email||'',
    adresse: supplier.adresse||'', ville: supplier.ville||'', notes: supplier.notes||'',
  } : { ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm(f => ({...f,[k]:v})); if(errors[k]) setErrors(e=>({...e,[k]:''})); };

  const submit = async () => {
    if (!form.nom.trim()) { setErrors({nom:t.inventory.form.required}); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? S.edit : S.add}</span>
          <button className="btn btn-ghost" onClick={onClose}>{ico.close}</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group span-2">
              <label className="form-label">{S.form.name}</label>
              <input className={`form-input${errors.nom?' err':''}`} value={form.nom}
                onChange={e=>set('nom',e.target.value)} placeholder="Quincaillerie XYZ SARL"/>
              {errors.nom && <span className="form-error">{errors.nom}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">{S.form.contact}</label>
              <input className="form-input" value={form.contact} onChange={e=>set('contact',e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">{S.form.city}</label>
              <input className="form-input" value={form.ville} onChange={e=>set('ville',e.target.value)} placeholder="Yaoundé"/>
            </div>
            <div className="form-group">
              <label className="form-label">{S.form.phone}</label>
              <input className="form-input" value={form.telephone} onChange={e=>set('telephone',e.target.value)} placeholder="+237 6xx xxx xxx"/>
            </div>
            <div className="form-group">
              <label className="form-label">{S.form.email}</label>
              <input className="form-input" type="email" value={form.email} onChange={e=>set('email',e.target.value)}/>
            </div>
            <div className="form-group span-2">
              <label className="form-label">{S.form.address}</label>
              <input className="form-input" value={form.adresse} onChange={e=>set('adresse',e.target.value)}/>
            </div>
            <div className="form-group span-2">
              <label className="form-label">{S.form.notes}</label>
              <textarea className="form-textarea" value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2}/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{S.form.cancel}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{S.form.save}</button>
        </div>
      </div>
    </div>
  );
}
