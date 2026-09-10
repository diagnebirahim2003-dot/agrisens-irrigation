import { useState, useEffect } from 'react';
import { getCultures, saveCultures, resetCultures } from '../utils/cultures';
import { getSols, saveSols, resetSols, DEFAULT_SOLS } from '../utils/sols';
import { createAccountAsAdmin, deleteAccountAsAdmin } from '../utils/accounts';
import './AdminPanel.css';

const ROLES = ['admin', 'technicien', 'agronome'];
const NATIONALITES = ['Sénégalaise', 'Malienne', 'Guinéenne', 'Ivoirienne', 'Mauritanienne', 'Autre'];
const PROFESSIONS  = ['Agronome', 'Agriculteur', 'Technicien'];

function isGmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(email);
}

function getUsers() {
  return JSON.parse(localStorage.getItem('agrisens_users') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('agrisens_users', JSON.stringify(users));
}

export default function AdminPanel({ auth, onBack }) {
  const [users, setUsers]     = useState(getUsers());
  const [tab, setTab]         = useState('list');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');
  const [editUser, setEditUser] = useState(null);

  // Formulaire nouvel utilisateur
  const [fNom, setFNom]       = useState('');
  const [fPrenom, setFPrenom] = useState('');
  const [fEmail, setFEmail]   = useState('');
  const [fPwd, setFPwd]       = useState('');
  const [fRole, setFRole]     = useState('technicien');
  const [fNat, setFNat]       = useState('Sénégalaise');
  const [fProf, setFProf]     = useState('Technicien');
  const [fMaraich, setFMaraich] = useState('non');

  // Paramétrage des cultures (RG-I6)
  const [cultures, setCultures] = useState(getCultures());

  // Paramétrage des sols (Hcc, Hpf, f) — FAO par défaut ou valeurs personnalisées
  const [sols, setSols] = useState(getSols());
  const isFao = s => {
    const d = DEFAULT_SOLS.find(x => x.nom === s.nom);
    return !!d && d.cc === s.cc && d.pf === s.pf && d.f === s.f;
  };
  const [solsMode, setSolsMode] = useState(() => {
    const m = {};
    for (const s of getSols()) m[s.nom] = isFao(s) ? 'fao' : 'custom';
    return m;
  });

  useEffect(() => { setUsers(getUsers()); }, [tab]);

  function refresh() {
    const u = getUsers();
    setUsers(u);
  }

  async function addUser(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!fNom || !fPrenom || !fEmail || !fPwd) {
      setError('Remplissez tous les champs.'); return;
    }
    if (!isGmail(fEmail)) {
      setError('Utilisez une adresse Gmail valide.'); return;
    }
    if (fPwd.length < 6) {
      setError('Mot de passe : minimum 6 caractères.'); return;
    }
    const users = getUsers();
    if (users.find(u => u.email === fEmail)) {
      setError('Cette adresse email est déjà utilisée.'); return;
    }
    setLoading(true);
    try {
      const username = fEmail.split('@')[0];
      await createAccountAsAdmin(auth.token, { username, email: fEmail, password: fPwd, nom: fNom, prenom: fPrenom, role: fRole });
      users.push({
        nom: fNom, prenom: fPrenom,
        email: fEmail, role: fRole, nationalite: fNat,
        profession: fProf, maraichage: fMaraich,
        createdBy: auth.email,
        createdAt: new Date().toISOString(),
      });
      saveUsers(users);
      setSuccess(`✅ ${fRole === 'admin' ? 'Admin' : fRole === 'technicien' ? 'Technicien' : 'Agronome'} ${fPrenom} ${fNom} créé — le compte Keycloak est actif, il peut se connecter dès maintenant.`);
      setFNom(''); setFPrenom(''); setFEmail(''); setFPwd('');
      setFRole('technicien');
      refresh();
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'Impossible de joindre le service de création de compte.' : e.message);
    } finally { setLoading(false); }
  }

  async function deleteUser(email) {
    if (email === auth.email) {
      alert('Vous ne pouvez pas supprimer votre propre compte.'); return;
    }
    const confirmed = confirm(
      `⚠️ Supprimer définitivement ${email} ?\n\n` +
      `Son compte sera supprimé de l'application. Il ne pourra plus se connecter ` +
      `tant qu'il ne se sera pas réinscrit.`
    );
    if (!confirmed) return;

    setError(''); setSuccess('');
    try {
      const username = email.split('@')[0];
      await deleteAccountAsAdmin(auth.token, username);
      const users = getUsers().filter(u => u.email !== email);
      saveUsers(users);
      setSuccess(`✅ Compte ${email} supprimé définitivement. Cette personne ne peut plus se connecter.`);
      refresh();
    } catch (e) {
      setError(e.message === 'Failed to fetch' ? 'Impossible de joindre le service de suppression.' : e.message);
    }
  }

  function changeRole(email, newRole) {
    if (email === auth.email) {
      alert('Vous ne pouvez pas modifier votre propre rôle.'); return;
    }
    const users = getUsers().map(u => u.email === email ? { ...u, role: newRole } : u);
    saveUsers(users);
    refresh();
  }

  function resetPwd(email) {
    const newPwd = prompt('Nouveau mot de passe (min. 6 caractères) :');
    if (!newPwd || newPwd.length < 6) { alert('Mot de passe trop court.'); return; }
    const users = getUsers().map(u => u.email === email ? { ...u, password: newPwd } : u);
    saveUsers(users);
    alert('✅ Mot de passe réinitialisé.');
  }

  function updateKc(nom, idx, val) {
    setCultures(prev => {
      const Kc = [...prev[nom].Kc]; Kc[idx] = val;
      return { ...prev, [nom]: { ...prev[nom], Kc } };
    });
  }
  function updateL(nom, idx, val) {
    setCultures(prev => {
      const L = [...prev[nom].L]; L[idx] = val;
      return { ...prev, [nom]: { ...prev[nom], L } };
    });
  }
  function updateField(nom, field, val) {
    setCultures(prev => ({ ...prev, [nom]: { ...prev[nom], [field]: val } }));
  }
  function updateNPK(nom, el, val) {
    setCultures(prev => ({ ...prev, [nom]: { ...prev[nom], NPK: { ...prev[nom].NPK, [el]: val } } }));
  }
  function handleSaveCultures(e) {
    e.preventDefault();
    saveCultures(cultures);
    setSuccess('✅ Paramètres des cultures enregistrés.');
  }
  function handleResetCultures() {
    if (!confirm('Revenir aux valeurs par défaut (Protocole / Chapitre III) ?')) return;
    resetCultures();
    setCultures(getCultures());
    setSuccess('Paramètres des cultures réinitialisés aux valeurs par défaut.');
  }

  function updateSol(nom, field, val) {
    setSols(prev => prev.map(s => s.nom === nom ? { ...s, [field]: val } : s));
  }
  function setSolMode(nom, mode) {
    setSolsMode(prev => ({ ...prev, [nom]: mode }));
    if (mode === 'fao') {
      const d = DEFAULT_SOLS.find(x => x.nom === nom);
      if (d) setSols(prev => prev.map(s => s.nom === nom ? { ...s, cc: d.cc, pf: d.pf, f: d.f } : s));
    }
  }
  function handleSaveSols(e) {
    e.preventDefault();
    saveSols(sols);
    setSuccess('✅ Paramètres des sols enregistrés.');
  }
  function handleResetSols() {
    if (!confirm('Revenir aux valeurs par défaut (Protocole / Chapitre III) ?')) return;
    resetSols();
    const d = getSols();
    setSols(d);
    const m = {}; for (const s of d) m[s.nom] = 'fao';
    setSolsMode(m);
    setSuccess('Paramètres des sols réinitialisés aux valeurs par défaut.');
  }

  const filtered = users.filter(u =>
    (u.nom+u.prenom+u.email+u.role).toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:      users.length,
    admin:      users.filter(u => u.role === 'admin').length,
    technicien: users.filter(u => u.role === 'technicien').length,
    agronome:   users.filter(u => u.role === 'agronome').length,
  };

  const roleBadge = r => ({
    admin:      'badge-admin',
    technicien: 'badge-tech',
    agronome:   'badge-agro',
  }[r] || 'badge-agro');

  const roleIcon = r => ({ admin:'👑', technicien:'🔧', agronome:'🌿' }[r] || '👤');

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-left">
          <button className="btn-back" onClick={onBack}>← Retour</button>
          <div>
            <div className="admin-title">👥 Gestion des utilisateurs</div>
            <div className="admin-sub">Connecté en tant que {auth.user} · Admin</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="stat-box"><div className="stat-num">{stats.total}</div><div className="stat-lbl">Total</div></div>
        <div className="stat-box"><div className="stat-num admin-c">{stats.admin}</div><div className="stat-lbl">Admins</div></div>
        <div className="stat-box"><div className="stat-num tech-c">{stats.technicien}</div><div className="stat-lbl">Techniciens</div></div>
        <div className="stat-box"><div className="stat-num agro-c">{stats.agronome}</div><div className="stat-lbl">Agronomes</div></div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button className={`atab ${tab==='list'?'active':''}`} onClick={()=>{setTab('list');setError('');setSuccess('');}}>
          📋 Liste des utilisateurs
        </button>
        <button className={`atab ${tab==='add'?'active':''}`} onClick={()=>{setTab('add');setError('');setSuccess('');}}>
          ➕ Ajouter un utilisateur
        </button>
        <button className={`atab ${tab==='cultures'?'active':''}`} onClick={()=>{setTab('cultures');setError('');setSuccess('');}}>
          🌱 Cultures
        </button>
        <button className={`atab ${tab==='sols'?'active':''}`} onClick={()=>{setTab('sols');setError('');setSuccess('');}}>
          🪨 Sols
        </button>
      </div>

      {error   && <div className="admin-error">{error}</div>}
      {success && <div className="admin-success">{success}</div>}

      {/* LISTE */}
      {tab === 'list' && (
        <div>
          <input
            className="search-input"
            placeholder="🔍 Rechercher un utilisateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="users-list">
            {filtered.map(u => (
              <div className="user-card" key={u.email}>
                <div className="user-card-left">
                  <div className="user-avatar">{u.prenom?.[0]}{u.nom?.[0]}</div>
                  <div>
                    <div className="user-name">{u.prenom} {u.nom}</div>
                    <div className="user-email">✉️ {u.email}</div>
                    <div className="user-meta">
                      {u.nationalite} · {u.profession}
                      {u.maraichage === 'oui' && ' · 🥦 Maraîchage'}
                    </div>
                    <div className="user-date">
                      Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                      {u.createdBy && ` · Par ${u.createdBy}`}
                    </div>
                  </div>
                </div>
                <div className="user-card-right">
                  <span className={`role-badge ${roleBadge(u.role)}`}>
                    {roleIcon(u.role)} {u.role}
                  </span>
                  <div className="user-actions">
                    <select
                      className="select-role"
                      value={u.role}
                      onChange={ev => changeRole(u.email, ev.target.value)}
                      disabled={u.email === auth.email}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <button className="btn-action reset" onClick={() => resetPwd(u.email)} title="Réinitialiser MDP">
                      🔑
                    </button>
                    <button
                      className="btn-action delete"
                      onClick={() => deleteUser(u.email)}
                      disabled={u.email === auth.email}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="empty-msg">Aucun utilisateur trouvé.</div>
            )}
          </div>
        </div>
      )}

      {/* AJOUTER */}
      {tab === 'add' && (
        <form className="add-form" onSubmit={addUser}>
          <div className="add-form-title">
            Ajouter un technicien ou un co-administrateur
          </div>

          <div className="form-row">
            <div className="inp-group">
              <label>Nom *</label>
              <input type="text" placeholder="SANE" value={fNom} onChange={e=>setFNom(e.target.value)}/>
            </div>
            <div className="inp-group">
              <label>Prénom *</label>
              <input type="text" placeholder="Mariama" value={fPrenom} onChange={e=>setFPrenom(e.target.value)}/>
            </div>
          </div>

          <div className="form-row">
            <div className="inp-group">
              <label>Nationalité</label>
              <select value={fNat} onChange={e=>setFNat(e.target.value)}>
                {NATIONALITES.map(n=><option key={n}>{n}</option>)}
              </select>
            </div>
            <div className="inp-group">
              <label>Profession</label>
              <select value={fProf} onChange={e=>setFProf(e.target.value)}>
                {PROFESSIONS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="inp-group">
            <label>Pratique le maraîchage ?</label>
            <div className="radio-group">
              <label className="radio-label"><input type="radio" name="fm" value="oui" checked={fMaraich==='oui'} onChange={()=>setFMaraich('oui')}/> Oui</label>
              <label className="radio-label"><input type="radio" name="fm" value="non" checked={fMaraich==='non'} onChange={()=>setFMaraich('non')}/> Non</label>
            </div>
          </div>

          <div className="inp-group">
            <label>Rôle *</label>
            <div className="role-select-grid">
              <div
                className={`role-select-item ${fRole==='technicien'?'selected':''}`}
                onClick={()=>setFRole('technicien')}
              >
                <span className="role-select-icon">🔧</span>
                <span className="role-select-name">Technicien</span>
                <span className="role-select-desc">Lecture + modification des capteurs</span>
              </div>
              <div
                className={`role-select-item ${fRole==='admin'?'selected':''}`}
                onClick={()=>setFRole('admin')}
              >
                <span className="role-select-icon">👑</span>
                <span className="role-select-name">Co-administrateur</span>
                <span className="role-select-desc">Toutes les autorisations</span>
              </div>
            </div>
          </div>

          <div className="inp-group">
            <label>Email Gmail * <span className="gmail-hint">(@gmail.com requis)</span></label>
            <input
              type="email" placeholder="exemple@gmail.com"
              value={fEmail} onChange={e=>setFEmail(e.target.value)}
            />
            {fEmail && isGmail(fEmail) && <span className="email-ok">✉️ {fEmail}</span>}
            {fEmail && !isGmail(fEmail) && <span className="email-err">⚠️ Adresse @gmail.com requise</span>}
          </div>

          <div className="inp-group">
            <label>Mot de passe provisoire *</label>
            <input
              type="text" placeholder="Min. 6 caractères"
              value={fPwd} onChange={e=>setFPwd(e.target.value)}
            />
            <span className="pwd-hint">L'utilisateur pourra changer son mot de passe après connexion.</span>
          </div>

          <button className="btn-add-user" type="submit" disabled={loading}>
            {loading ? '⏳ Création…' : `➕ Ajouter ${fRole === 'admin' ? 'le co-administrateur' : 'le technicien'}`}
          </button>
        </form>
      )}

      {/* CULTURES */}
      {tab === 'cultures' && (
        <form className="add-form" onSubmit={handleSaveCultures}>
          <div className="add-form-title">
            Paramétrer Kc, stades, profondeur racinaire et NPK optimal par culture (RG-I6)
          </div>

          {Object.entries(cultures).map(([nom, c]) => (
            <div key={nom} className="form-row" style={{flexDirection:'column', border:'1px solid #ddd', borderRadius:8, padding:'12px', marginBottom:'16px'}}>
              <div className="add-form-title" style={{marginBottom:8}}>{c.icon} {nom}</div>

              <div className="form-row">
                <div className="inp-group"><label>Kc initial</label><input type="number" step="0.01" value={c.Kc[0]} onChange={e=>updateKc(nom,0,parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>Kc mi-saison</label><input type="number" step="0.01" value={c.Kc[1]} onChange={e=>updateKc(nom,1,parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>Kc fin de saison</label><input type="number" step="0.01" value={c.Kc[2]} onChange={e=>updateKc(nom,2,parseFloat(e.target.value)||0)}/></div>
              </div>

              <div className="form-row">
                <div className="inp-group"><label>Stade initial (j)</label><input type="number" value={c.L[0]} onChange={e=>updateL(nom,0,parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>Développement (j)</label><input type="number" value={c.L[1]} onChange={e=>updateL(nom,1,parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>Mi-saison (j)</label><input type="number" value={c.L[2]} onChange={e=>updateL(nom,2,parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>Fin de saison (j)</label><input type="number" value={c.L[3]} onChange={e=>updateL(nom,3,parseFloat(e.target.value)||0)}/></div>
              </div>

              <div className="form-row">
                <div className="inp-group"><label>Zr — profondeur racinaire (m)</label><input type="number" step="0.01" value={c.Zr} onChange={e=>updateField(nom,'Zr',parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>p — fraction d'épuisement (Tableau 22)</label><input type="number" step="0.01" value={c.p} onChange={e=>updateField(nom,'p',parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>Cycle total (j)</label><input type="number" value={c.cycle} onChange={e=>updateField(nom,'cycle',parseFloat(e.target.value)||0)}/></div>
              </div>

              <div className="form-row">
                <div className="inp-group"><label>N optimal (mg/kg)</label><input type="number" value={c.NPK.N} onChange={e=>updateNPK(nom,'N',parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>P optimal (mg/kg)</label><input type="number" value={c.NPK.P} onChange={e=>updateNPK(nom,'P',parseFloat(e.target.value)||0)}/></div>
                <div className="inp-group"><label>K optimal (mg/kg)</label><input type="number" value={c.NPK.K} onChange={e=>updateNPK(nom,'K',parseFloat(e.target.value)||0)}/></div>
              </div>
            </div>
          ))}

          <div className="form-row">
            <button className="btn-add-user" type="submit">💾 Enregistrer les paramètres</button>
            <button className="btn-back" type="button" onClick={handleResetCultures}>↺ Réinitialiser aux valeurs par défaut</button>
          </div>
        </form>
      )}

      {/* SOLS */}
      {tab === 'sols' && (
        <form className="add-form" onSubmit={handleSaveSols}>
          <div className="add-form-title">
            Paramétrer l'humidité à la capacité au champ (Hcc), au point de flétrissement (Hpf)
            et la fraction d'épuisement (f) par type de sol — Chapitre III du mémoire
          </div>

          {sols.map(s => {
            const mode = solsMode[s.nom] || 'fao';
            const editable = mode === 'custom';
            return (
              <div key={s.nom} className="form-row" style={{flexDirection:'column', border:'1px solid #ddd', borderRadius:8, padding:'12px', marginBottom:'16px'}}>
                <div className="add-form-title" style={{marginBottom:8}}>🪨 {s.nom}</div>

                <div className="inp-group" style={{marginBottom:8}}>
                  <label>Source de la valeur</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input type="radio" name={`solmode-${s.nom}`} checked={mode==='fao'} onChange={()=>setSolMode(s.nom,'fao')}/> 🌍 Valeurs FAO/USDA par défaut
                    </label>
                    <label className="radio-label">
                      <input type="radio" name={`solmode-${s.nom}`} checked={mode==='custom'} onChange={()=>setSolMode(s.nom,'custom')}/> ✏️ Mes propres valeurs (mesurées)
                    </label>
                  </div>
                </div>

                <div className="form-row">
                  <div className="inp-group"><label>Hcc — capacité au champ (%)</label><input type="number" step="0.1" disabled={!editable} value={s.cc} onChange={e=>updateSol(s.nom,'cc',parseFloat(e.target.value)||0)}/></div>
                  <div className="inp-group"><label>Hpf — point de flétrissement (%)</label><input type="number" step="0.1" disabled={!editable} value={s.pf} onChange={e=>updateSol(s.nom,'pf',parseFloat(e.target.value)||0)}/></div>
                  <div className="inp-group"><label>f — fraction d'épuisement</label><input type="number" step="0.01" disabled={!editable} value={s.f} onChange={e=>updateSol(s.nom,'f',parseFloat(e.target.value)||0)}/></div>
                </div>
              </div>
            );
          })}

          <div className="form-row">
            <button className="btn-add-user" type="submit">💾 Enregistrer les paramètres</button>
            <button className="btn-back" type="button" onClick={handleResetSols}>↺ Réinitialiser aux valeurs par défaut</button>
          </div>
        </form>
      )}
    </div>
  );
}
