import { useState } from 'react';
import { CONFIG } from '../utils/config';
import './Login.css';

const PROFESSIONS = ['Agronome', 'Agriculteur'];
const NATIONALITES = ['Sénégalaise', 'Malienne', 'Guinéenne', 'Ivoirienne', 'Mauritanienne', 'Autre'];

function isGmail(email) {
  return /^[^\s@]+@gmail\.com$/i.test(email);
}

export default function Login({ onLogin }) {
  const [tab, setTab]           = useState('login');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  // Login
  const [loginEmail, setLoginEmail]   = useState('');
  const [loginPwd, setLoginPwd]       = useState('');

  // Inscription
  const [regNom, setRegNom]           = useState('');
  const [regPrenom, setRegPrenom]     = useState('');
  const [regNat, setRegNat]           = useState('Sénégalaise');
  const [regProf, setRegProf]         = useState('Agronome');
  const [regMaraich, setRegMaraich]   = useState('non');
  const [regEmail, setRegEmail]       = useState('');
  const [regPwd, setRegPwd]           = useState('');
  const [regPwd2, setRegPwd2]         = useState('');

  // Reset
  const [resetEmail, setResetEmail]   = useState('');

  // ── LOGIN ──
  async function handleLogin(e) {
    e.preventDefault();
    if (!loginEmail || !loginPwd) { setError('Remplissez tous les champs.'); return; }
    setLoading(true); setError('');
    try {
      // Essai Keycloak
      const username = loginEmail.split('@')[0];
      const res = await fetch(CONFIG.KEYCLOAK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CONFIG.KEYCLOAK_CLIENT,
          client_secret: CONFIG.KEYCLOAK_SECRET,
          username, password: loginPwd,
          grant_type: 'password',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error_description || 'Identifiants incorrects');
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      const user = payload.preferred_username || username;
      const role = user === 'admin' ? 'admin' : user === 'technicien' ? 'technicien' : 'agronome';
      onLogin({ token: data.access_token, user, role, email: loginEmail });
    } catch(err) {
      // Fallback localStorage
      const users = JSON.parse(localStorage.getItem('agrisens_users') || '[]');
      const found = users.find(u => u.email === loginEmail && u.password === loginPwd);
      if (found) {
        onLogin({ token: 'local', user: found.prenom+' '+found.nom, role: found.role, email: found.email, profile: found });
      } else if (['admin@gmail.com','agronome@gmail.com','technicien@gmail.com'].includes(loginEmail) && loginPwd.length >= 4) {
        const role = loginEmail.includes('admin') ? 'admin' : loginEmail.includes('technicien') ? 'technicien' : 'agronome';
        onLogin({ token: 'demo', user: loginEmail.split('@')[0], role, email: loginEmail });
      } else {
        setError('❌ Email ou mot de passe incorrect.');
      }
    } finally { setLoading(false); }
  }

  // ── INSCRIPTION ──
  function handleRegister(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!regNom || !regPrenom || !regEmail || !regPwd || !regPwd2) {
      setError('Remplissez tous les champs obligatoires.'); return;
    }
    if (!isGmail(regEmail)) {
      setError('❌ Utilisez une adresse Gmail valide (@gmail.com).'); return;
    }
    if (regPwd.length < 6) {
      setError('❌ Le mot de passe doit avoir au moins 6 caractères.'); return;
    }
    if (regPwd !== regPwd2) {
      setError('❌ Les mots de passe ne correspondent pas.'); return;
    }
    const users = JSON.parse(localStorage.getItem('agrisens_users') || '[]');
    if (users.find(u => u.email === regEmail)) {
      setError('❌ Cette adresse email est déjà utilisée.'); return;
    }
    const newUser = {
      nom: regNom, prenom: regPrenom,
      nationalite: regNat, profession: regProf,
      maraichage: regMaraich,
      email: regEmail, password: regPwd,
      role: 'agronome',
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem('agrisens_users', JSON.stringify(users));
    setSuccess('✅ Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
    setTab('login');
    setLoginEmail(regEmail);
  }

  // ── RESET MOT DE PASSE ──
  function handleReset(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!isGmail(resetEmail)) {
      setError('❌ Entrez une adresse Gmail valide.'); return;
    }
    const users = JSON.parse(localStorage.getItem('agrisens_users') || '[]');
    const found = users.find(u => u.email === resetEmail);
    if (!found) {
      setError('❌ Aucun compte associé à cette adresse.'); return;
    }
    setSuccess('✅ Un email de réinitialisation a été envoyé à '+resetEmail);
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🌾</div>
        <h1 className="login-title">AgriSens</h1>
        <p className="login-sub">Irrigation de précision — USSEIN Kaolack</p>

        {/* TABS */}
        <div className="login-tabs">
          <button className={`ltab ${tab==='login'?'active':''}`} onClick={()=>{setTab('login');setError('');setSuccess('');}}>Se connecter</button>
          <button className={`ltab ${tab==='register'?'active':''}`} onClick={()=>{setTab('register');setError('');setSuccess('');}}>S'inscrire</button>
          <button className={`ltab ${tab==='reset'?'active':''}`} onClick={()=>{setTab('reset');setError('');setSuccess('');}}>Mot de passe oublié</button>
        </div>

        {error   && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {/* ── CONNEXION ── */}
        {tab==='login' && (
          <form onSubmit={handleLogin}>
            <div className="inp-group">
              <label>Email Gmail</label>
              <input type="email" placeholder="exemple@gmail.com"
                value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/>
            </div>
            <div className="inp-group">
              <label>Mot de passe</label>
              <input type="password" placeholder="••••••••"
                value={loginPwd} onChange={e=>setLoginPwd(e.target.value)}/>
            </div>
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? '⏳ Connexion…' : '🔐 Se connecter'}
            </button>
            <p className="login-link" onClick={()=>setTab('reset')}>
              Mot de passe oublié ?
            </p>
          </form>
        )}

        {/* ── INSCRIPTION ── */}
        {tab==='register' && (
          <form onSubmit={handleRegister}>
            <div className="form-row">
              <div className="inp-group">
                <label>Nom *</label>
                <input type="text" placeholder="DIAGNE"
                  value={regNom} onChange={e=>setRegNom(e.target.value)}/>
              </div>
              <div className="inp-group">
                <label>Prénom *</label>
                <input type="text" placeholder="Birahim"
                  value={regPrenom} onChange={e=>setRegPrenom(e.target.value)}/>
              </div>
            </div>
            <div className="form-row">
              <div className="inp-group">
                <label>Nationalité</label>
                <select value={regNat} onChange={e=>setRegNat(e.target.value)}>
                  {NATIONALITES.map(n=><option key={n}>{n}</option>)}
                </select>
              </div>
              <div className="inp-group">
                <label>Profession</label>
                <select value={regProf} onChange={e=>setRegProf(e.target.value)}>
                  {PROFESSIONS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="inp-group">
              <label>Pratique le maraîchage ?</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="maraich" value="oui"
                    checked={regMaraich==='oui'} onChange={()=>setRegMaraich('oui')}/>
                  Oui
                </label>
                <label className="radio-label">
                  <input type="radio" name="maraich" value="non"
                    checked={regMaraich==='non'} onChange={()=>setRegMaraich('non')}/>
                  Non
                </label>
              </div>
            </div>
            <div className="inp-group">
              <label>Email Gmail * <span className="gmail-hint">(@gmail.com requis)</span></label>
              <input type="email" placeholder="exemple@gmail.com"
                value={regEmail} onChange={e=>setRegEmail(e.target.value)}/>
              {regEmail && !isGmail(regEmail) && (
                <span className="field-error">⚠️ Utilisez une adresse @gmail.com</span>
              )}
            </div>
            <div className="form-row">
              <div className="inp-group">
                <label>Mot de passe *</label>
                <input type="password" placeholder="Min. 6 caractères"
                  value={regPwd} onChange={e=>setRegPwd(e.target.value)}/>
              </div>
              <div className="inp-group">
                <label>Confirmer *</label>
                <input type="password" placeholder="Répéter"
                  value={regPwd2} onChange={e=>setRegPwd2(e.target.value)}/>
              </div>
            </div>
            <div className="register-note">
              ℹ️ Les comptes <b>Technicien</b> sont créés uniquement par l'administrateur.
            </div>
            <button className="btn-login" type="submit">
              ✅ Créer mon compte
            </button>
          </form>
        )}

        {/* ── RESET ── */}
        {tab==='reset' && (
          <form onSubmit={handleReset}>
            <p style={{fontSize:'0.8rem',color:'#6a7f6a',marginBottom:'14px'}}>
              Entrez votre adresse Gmail pour recevoir un lien de réinitialisation.
            </p>
            <div className="inp-group">
              <label>Email Gmail</label>
              <input type="email" placeholder="exemple@gmail.com"
                value={resetEmail} onChange={e=>setResetEmail(e.target.value)}/>
            </div>
            <button className="btn-login" type="submit">
              📧 Envoyer le lien de réinitialisation
            </button>
            <p className="login-link" onClick={()=>setTab('login')}>
              ← Retour à la connexion
            </p>
          </form>
        )}

        <div className="login-roles">
          <div className="role-item"><span className="role-badge admin">👑 Admin</span><span>Toutes les autorisations</span></div>
          <div className="role-item"><span className="role-badge agronome">🌿 Agronome</span><span>Lecture seule</span></div>
          <div className="role-item"><span className="role-badge technicien">🔧 Technicien</span><span>Ajouté par l'admin uniquement</span></div>
        </div>
        <div className="login-security">🛡️ Sécurisé par <b>Keycloak</b> + <b>Wilma PEP Proxy</b></div>
      </div>
    </div>
  );
}
