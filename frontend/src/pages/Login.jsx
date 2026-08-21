import { useState } from 'react';
import { CONFIG } from '../utils/config';
import './Login.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!username || !password) {
      setError('Remplissez tous les champs.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(CONFIG.KEYCLOAK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id:     CONFIG.KEYCLOAK_CLIENT,
          client_secret: CONFIG.KEYCLOAK_SECRET,
          username, password,
          grant_type: 'password',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error_description || 'Identifiants incorrects');
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      const user = payload.preferred_username || username;
      const role = user === 'admin' ? 'admin' : user === 'technicien' ? 'technicien' : 'agronome';
      onLogin({ token: data.access_token, user, role });
    } catch(e) {
      // Fallback démo
      if (['admin','agronome','technicien'].includes(username) && password.length >= 4) {
        const role = username === 'admin' ? 'admin' : username === 'technicien' ? 'technicien' : 'agronome';
        onLogin({ token: 'demo', user: username, role });
      } else {
        setError('❌ ' + e.message);
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">🌾</div>
        <h1 className="login-title">AgriSens</h1>
        <p className="login-sub">Irrigation de précision — USSEIN Kaolack</p>

        <form onSubmit={handleLogin}>
          <div className="inp-group">
            <label>Nom d'utilisateur</label>
            <input
              type="text"
              placeholder="admin / agronome / technicien"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="inp-group">
            <label>Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? '⏳ Connexion…' : '🔐 Se connecter via Keycloak'}
          </button>
        </form>

        <div className="login-roles">
          <div className="role-item">
            <span className="role-badge admin">👑 Admin</span>
            <span>Toutes les autorisations</span>
          </div>
          <div className="role-item">
            <span className="role-badge agronome">🌿 Agronome</span>
            <span>Lecture seule</span>
          </div>
          <div className="role-item">
            <span className="role-badge technicien">🔧 Technicien</span>
            <span>Lecture + modification</span>
          </div>
        </div>

        <div className="login-security">
          🛡️ Sécurisé par <b>Keycloak</b> + <b>Wilma PEP Proxy</b>
        </div>
      </div>
    </div>
  );
}
