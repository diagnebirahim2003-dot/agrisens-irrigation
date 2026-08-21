import { useState } from 'react';
import { CONFIG } from '../utils/config';
import './Login.css';

const PROFESSIONS  = ['Agronome', 'Agriculteur'];
const NATIONALITES = ['Sénégalaise', 'Malienne', 'Guinéenne', 'Ivoirienne', 'Mauritanienne', 'Autre'];

const DEFAULT_ADMIN = {
  nom: 'DIAGNE', prenom: 'Birahim',
  email: 'diagnebirahim2003@gmail.com',
  password: 'bira2003',
  role: 'admin',
  nationalite: 'Sénégalaise',
  profession: 'Agronome',
  maraichage: 'non',
  createdAt: '2025-01-01T00:00:00.000Z',
};

function isGmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(email);
}

function getUsers() {
  const users = JSON.parse(localStorage.getItem('agrisens_users') || '[]');
  if (!users.find(u => u.email === DEFAULT_ADMIN.email)) {
    users.unshift(DEFAULT_ADMIN);
    localStorage.setItem('agrisens_users', JSON.stringify(users));
  }
  return users;
}

function PwdInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pwd-wrap">
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder || '••••••••'}
        value={value}
        onChange={onChange}
        autoComplete="current-password"
      />
      <button
        type="button"
        className="btn-show-pwd"
        tabIndex={-1}
        onMouseDown={e => e.preventDefault()}
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Masquer' : 'Afficher'}
      >
        {show ? '🙈' : '👁️'}
      </button>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [tab, setTab]         = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd, setLoginPwd]     = useState('');
  const [remember, setRemember]     = useState(false);

  // Auto-remplir si mémorisé
  useState(() => {
    const saved = JSON.parse(localStorage.getItem('agrisens_remember') || 'null');
    if (saved) {
      setLoginEmail(saved.email || '');
      setLoginPwd(saved.password || '');
      setRemember(true);
    }
  });
  const [regNom, setRegNom]         = useState('');
  const [regPrenom, setRegPrenom]   = useState('');
  const [regNat, setRegNat]         = useState('Sénégalaise');
  const [regProf, setRegProf]       = useState('Agronome');
  const [regMaraich, setRegMaraich] = useState('non');
  const [regEmail, setRegEmail]     = useState('');
  const [regPwd, setRegPwd]         = useState('');
  const [regPwd2, setRegPwd2]       = useState('');
  const [resetEmail, setResetEmail] = useState('');

  function switchTab(t) { setTab(t); setError(''); setSuccess(''); }

  async function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail || !loginPwd) { setError('Remplissez tous les champs.'); return; }
    setLoading(true); setError('');
    try {
      const username = loginEmail.split('@')[0];
      const res = await fetch(CONFIG.KEYCLOAK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CONFIG.KEYCLOAK_CLIENT, client_secret: CONFIG.KEYCLOAK_SECRET, username, password: loginPwd, grant_type: 'password' }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error_description || 'Identifiants incorrects');
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      const user = payload.preferred_username || username;
      const role = user === 'admin' ? 'admin' : user === 'technicien' ? 'technicien' : 'agronome';
      if (remember) {
        localStorage.setItem('agrisens_remember', JSON.stringify({ email: loginEmail, password: loginPwd }));
      } else {
        localStorage.removeItem('agrisens_remember');
      }
      onLogin({ token: data.access_token, user, role, email: loginEmail });
    } catch {
      const users = getUsers();
      const found = users.find(u => u.email === loginEmail && u.password === loginPwd);
      if (found) {
        if (remember) {
        localStorage.setItem('agrisens_remember', JSON.stringify({ email: loginEmail, password: loginPwd }));
      } else {
        localStorage.removeItem('agrisens_remember');
      }
      onLogin({ token: 'local', user: found.prenom + ' ' + found.nom, role: found.role, email: found.email, profile: found });
      } else {
        setError('Email ou mot de passe incorrect.');
      }
    } finally { setLoading(false); }
  }

  function handleRegister(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!regNom || !regPrenom || !regEmail || !regPwd || !regPwd2) { setError('Remplissez tous les champs obligatoires.'); return; }
    if (!isGmail(regEmail)) { setError('Utilisez une adresse Gmail valide (@gmail.com).'); return; }
    if (regPwd.length < 6) { setError('Le mot de passe doit avoir au moins 6 caractères.'); return; }
    if (regPwd !== regPwd2) { setError('Les mots de passe ne correspondent pas.'); return; }
    const users = getUsers();
    if (users.find(u => u.email === regEmail)) { setError('Cette adresse email est déjà utilisée.'); return; }
    users.push({ nom: regNom, prenom: regPrenom, nationalite: regNat, profession: regProf, maraichage: regMaraich, email: regEmail, password: regPwd, role: 'agronome', createdAt: new Date().toISOString() });
    localStorage.setItem('agrisens_users', JSON.stringify(users));
    setSuccess('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
    setLoginEmail(regEmail);
    switchTab('login');
  }

  function handleReset(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!isGmail(resetEmail)) { setError('Entrez une adresse Gmail valide.'); return; }
    const users = getUsers();
    if (!users.find(u => u.email === resetEmail)) { setError('Aucun compte associé à cette adresse.'); return; }
    setSuccess('Un lien de réinitialisation a été envoyé à ' + resetEmail);
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🌾</div>
        <h1 className="login-title">AgriSens</h1>
        <p className="login-sub">Irrigation de précision — USSEIN Kaolack</p>
        <div className="login-tabs">
          <button className={`ltab ${tab==='login'?'active':''}`} onClick={()=>switchTab('login')}>Se connecter</button>
          <button className={`ltab ${tab==='register'?'active':''}`} onClick={()=>switchTab('register')}>S'inscrire</button>
          <button className={`ltab ${tab==='reset'?'active':''}`} onClick={()=>switchTab('reset')}>Mot de passe oublié</button>
        </div>
        {error   && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="inp-group">
              <label>Email Gmail</label>
              <input type="email" placeholder="exemple@gmail.com"
                value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/>
              {loginEmail && <span className="email-display">✉️ {loginEmail}</span>}
            </div>
            <div className="inp-group">
              <label>Mot de passe</label>
              <PwdInput value={loginPwd} onChange={e=>setLoginPwd(e.target.value)}/>
            </div>
            <div className="remember-row">
              <label className="remember-label">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => {
                    setRemember(e.target.checked);
                    if (!e.target.checked) localStorage.removeItem('agrisens_remember');
                  }}
                />
                <span>Se souvenir de moi</span>
              </label>
              <span className="login-link" onClick={()=>switchTab('reset')}>Mot de passe oublié ?</span>
            </div>
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? '⏳ Connexion…' : '🔐 Se connecter'}
            </button>
          </form>
        )}

        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="form-row">
              <div className="inp-group"><label>Nom *</label><input type="text" placeholder="DIAGNE" value={regNom} onChange={e=>setRegNom(e.target.value)}/></div>
              <div className="inp-group"><label>Prénom *</label><input type="text" placeholder="Birahim" value={regPrenom} onChange={e=>setRegPrenom(e.target.value)}/></div>
            </div>
            <div className="form-row">
              <div className="inp-group"><label>Nationalité</label><select value={regNat} onChange={e=>setRegNat(e.target.value)}>{NATIONALITES.map(n=><option key={n}>{n}</option>)}</select></div>
              <div className="inp-group"><label>Profession</label><select value={regProf} onChange={e=>setRegProf(e.target.value)}>{PROFESSIONS.map(p=><option key={p}>{p}</option>)}</select></div>
            </div>
            <div className="inp-group">
              <label>Pratique le maraîchage ?</label>
              <div className="radio-group">
                <label className="radio-label"><input type="radio" name="maraich" value="oui" checked={regMaraich==='oui'} onChange={()=>setRegMaraich('oui')}/> Oui</label>
                <label className="radio-label"><input type="radio" name="maraich" value="non" checked={regMaraich==='non'} onChange={()=>setRegMaraich('non')}/> Non</label>
              </div>
            </div>
            <div className="inp-group">
              <label>Email Gmail * <span className="gmail-hint">(@gmail.com requis)</span></label>
              <input type="email" placeholder="exemple@gmail.com" value={regEmail} onChange={e=>setRegEmail(e.target.value)}/>
              {regEmail && isGmail(regEmail)  && <span className="email-display">✉️ {regEmail}</span>}
              {regEmail && !isGmail(regEmail) && <span className="field-error">⚠️ Utilisez une adresse @gmail.com</span>}
            </div>
            <div className="form-row">
              <div className="inp-group"><label>Mot de passe *</label><PwdInput value={regPwd} onChange={e=>setRegPwd(e.target.value)} placeholder="Min. 6 caractères"/></div>
              <div className="inp-group"><label>Confirmer *</label><PwdInput value={regPwd2} onChange={e=>setRegPwd2(e.target.value)} placeholder="Répéter"/></div>
            </div>
            <button className="btn-login" type="submit">✅ Créer mon compte</button>
          </form>
        )}

        {tab === 'reset' && (
          <form onSubmit={handleReset}>
            <p style={{fontSize:'0.8rem',color:'#6a7f6a',marginBottom:'14px'}}>
              Entrez votre adresse Gmail pour recevoir un lien de réinitialisation.
            </p>
            <div className="inp-group">
              <label>Email Gmail</label>
              <input type="email" placeholder="exemple@gmail.com" value={resetEmail} onChange={e=>setResetEmail(e.target.value)}/>
              {resetEmail && isGmail(resetEmail) && <span className="email-display">✉️ {resetEmail}</span>}
            </div>
            <button className="btn-login" type="submit">📧 Envoyer le lien</button>
            <p className="login-link" onClick={()=>switchTab('login')}>← Retour</p>
          </form>
        )}
      </div>
    </div>
  );
}
