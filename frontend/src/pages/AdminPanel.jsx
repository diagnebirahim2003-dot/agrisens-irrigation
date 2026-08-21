import { useState, useEffect } from 'react';
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

  useEffect(() => { setUsers(getUsers()); }, [tab]);

  function refresh() {
    const u = getUsers();
    setUsers(u);
  }

  function addUser(e) {
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
    users.push({
      nom: fNom, prenom: fPrenom,
      email: fEmail, password: fPwd,
      role: fRole, nationalite: fNat,
      profession: fProf, maraichage: fMaraich,
      createdBy: auth.email,
      createdAt: new Date().toISOString(),
    });
    saveUsers(users);
    setSuccess(`✅ ${fRole === 'admin' ? 'Admin' : 'Technicien'} ${fPrenom} ${fNom} ajouté avec succès !`);
    setFNom(''); setFPrenom(''); setFEmail(''); setFPwd('');
    setFRole('technicien');
    refresh();
  }

  function deleteUser(email) {
    if (email === auth.email) {
      alert('Vous ne pouvez pas supprimer votre propre compte.'); return;
    }
    if (!confirm('Supprimer cet utilisateur ?')) return;
    const users = getUsers().filter(u => u.email !== email);
    saveUsers(users);
    refresh();
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

          <button className="btn-add-user" type="submit">
            ➕ Ajouter {fRole === 'admin' ? 'le co-administrateur' : 'le technicien'}
          </button>
        </form>
      )}
    </div>
  );
}
