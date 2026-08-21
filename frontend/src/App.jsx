import { useState } from 'react';
import Login from './pages/Login';
import './App.css';

function App() {
  const [auth, setAuth] = useState(null);

  if (!auth) return <Login onLogin={setAuth}/>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      <h2>🌾 Bienvenue {auth.user} ({auth.role})</h2>
      <p>Dashboard en cours de développement...</p>
      <button onClick={() => setAuth(null)} style={{marginTop:'10px',padding:'8px 16px',background:'#c62828',color:'#fff',border:'none',borderRadius:'8px',cursor:'pointer'}}>
        Déconnexion
      </button>
    </div>
  );
}

export default App;
