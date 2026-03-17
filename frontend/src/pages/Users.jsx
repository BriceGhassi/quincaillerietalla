/**
 * pages/Users.jsx — Gestion des utilisateurs (Admin uniquement)
 * Créer, modifier, activer/désactiver les comptes
 */
import { useState, useEffect, useCallback } from 'react';
import { useLang } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal, ico as sharedIco } from './Inventory';
import api from '../utils/api';

const ico = {
  ...sharedIco,
  close:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  users:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

const EMPTY = { nom:'', prenom:'', email:'', password:'', role:'employee', actif:1 };

export default function Users() {
  const { t, lang } = useLang();
  const { show }    = useToast();
  const U = t.users;

  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.data || []);
    } catch { show(t.global.serverError, 'error'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    try {
      if (modal === 'add') {
        await api.post('/auth/users', form);
      } else {
        await api.put(`/auth/users/${selected.id}`, form);
      }
      show(t.global.savedOk, 'success');
      setModal(null); load();
    } catch (err) {
      const msg = err.response?.data;
      show(lang==='fr' ? (msg?.message_fr||t.global.serverError) : (msg?.message_en||t.global.serverError), 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div><h1>{U.title}</h1></div>
          <button className="btn btn-primary" onClick={() => { setSelected(null); setModal('add'); }}>
            {ico.plus} {U.add}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          {loading ? (
            <div className="loader"><span className="spinner"/>{t.global.loading}</div>
          ) : (
            <table>
              <thead><tr>
                <th>{U.name}</th>
                <th>{U.email}</th>
                <th>{U.role}</th>
                <th>{U.status}</th>
                <th>{lang==='fr'?'Créé le':'Created'}</th>
                <th style={{textAlign:'center'}}>{t.global.edit}</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:32, height:32, borderRadius:'50%',
                          background: u.role==='admin'?'var(--orange-muted)':'var(--info-bg)',
                          color: u.role==='admin'?'var(--orange)':'var(--info)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontWeight:700, fontSize:13, flexShrink:0,
                        }}>
                          {(u.prenom[0]||'?')+(u.nom[0]||'?')}
                        </div>
                        <div>
                          <div style={{fontWeight:600,fontSize:14}}>{u.prenom} {u.nom}</div>
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>#ID{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{fontSize:13,color:'var(--text-muted)'}}>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>
                        {U.roles[u.role]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.actif?'ok':'out'}`}>
                        <span className="badge-dot"/>
                        {u.actif ? U.active : U.inactive}
                      </span>
                    </td>
                    <td style={{fontSize:12,color:'var(--text-muted)'}}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{textAlign:'center'}}>
                      <button className="btn btn-ghost" onClick={() => { setSelected(u); setModal('edit'); }}>
                        {ico.edit}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="table-footer">
          <span><b>{users.length}</b> {lang==='fr'?'utilisateur(s)':'user(s)'}</span>
        </div>
      </div>

      {(modal==='add'||modal==='edit') && (
        <UserModal t={t} user={selected} isEdit={modal==='edit'}
          onSave={handleSave} onClose={() => setModal(null)}/>
      )}
    </div>
  );
}

// ── Formulaire utilisateur ──
function UserModal({ t, user, isEdit, onSave, onClose }) {
  const U = t.users;
  const [form, setForm] = useState(user ? {
    nom: user.nom, prenom: user.prenom, email: user.email,
    password: '', role: user.role, actif: user.actif,
  } : { ...EMPTY });
  const [errors,  setErrors]  = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const set = (k, v) => { setForm(f=>({...f,[k]:v})); if(errors[k]) setErrors(e=>({...e,[k]:''})); };

  const validate = () => {
    const e = {};
    if (!form.nom.trim())    e.nom    = t.inventory.form.required;
    if (!form.prenom.trim()) e.prenom = t.inventory.form.required;
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = t.inventory.form.required;
    if (!isEdit && form.password.length < 8) e.password = U.form.passwordHint;
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
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? U.edit : U.add}</span>
          <button className="btn btn-ghost" onClick={onClose}>{ico.close}</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{U.form.prenom}</label>
              <input className={`form-input${errors.prenom?' err':''}`} value={form.prenom}
                onChange={e=>set('prenom',e.target.value)} placeholder="Jean"/>
              {errors.prenom && <span className="form-error">{errors.prenom}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">{U.form.nom}</label>
              <input className={`form-input${errors.nom?' err':''}`} value={form.nom}
                onChange={e=>set('nom',e.target.value)} placeholder="Dupont"/>
              {errors.nom && <span className="form-error">{errors.nom}</span>}
            </div>
            <div className="form-group span-2">
              <label className="form-label">{U.form.email}</label>
              <input className={`form-input${errors.email?' err':''}`} type="email" value={form.email}
                onChange={e=>set('email',e.target.value)} placeholder="jean.dupont@exemple.cm"/>
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group" style={{ position:'relative' }}>
              <label className="form-label">{U.form.password}</label>
              <input className={`form-input${errors.password?' err':''}`}
                type={showPwd?'text':'password'} value={form.password}
                onChange={e=>set('password',e.target.value)}
                placeholder={isEdit?U.form.editPasswordHint:'••••••••'}
                style={{paddingRight:36}}/>
              <button type="button" onClick={()=>setShowPwd(p=>!p)}
                style={{position:'absolute',right:8,top:27,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',padding:3}}>
                {showPwd
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
              {errors.password && <span className="form-error">{errors.password}</span>}
              {!errors.password && <span className="form-hint">{isEdit?U.form.editPasswordHint:U.form.passwordHint}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">{U.form.role}</label>
              <select className="form-select" value={form.role} onChange={e=>set('role',e.target.value)}>
                <option value="employee">{U.roles.employee}</option>
                <option value="admin">{U.roles.admin}</option>
              </select>
            </div>
            {isEdit && (
              <div className="form-group">
                <label className="form-label">{U.form.active}</label>
                <select className="form-select" value={form.actif} onChange={e=>set('actif',parseInt(e.target.value))}>
                  <option value={1}>{U.active}</option>
                  <option value={0}>{U.inactive}</option>
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{U.form.cancel}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{U.form.save}</button>
        </div>
      </div>
    </div>
  );
}
