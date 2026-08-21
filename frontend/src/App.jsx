import { useState } from 'react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import './App.css';

function App() {
  const [auth, setAuth]   = useState(null);
  const [page, setPage]   = useState('dashboard');

  if (!auth) return <Login onLogin={setAuth}/>;

  if (page === 'admin') return (
    <AdminPanel auth={auth} onBack={() => setPage('dashboard')}/>
  );

  return (
    <div style={{fontFamily:'Segoe UI,system-ui,sans-serif',padding:'20px',maxWidth:'900px',margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px',
        background:'linear-gradient(135deg,#1b5e20,#2e7d32)',borderRadius:'14px',padding:'16px 20px'}}>
        <div style={{color:'#fff'}}>
          <div style={{fontSize:'1.1rem',fontWeight:'700'}}>🌾 AgriSens Dashboard</div>
          <div style={{fontSize:'0.72rem',opacity:0.8}}>Connecté : {auth.user} · {auth.role}</div>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {auth.role === 'admin' && (
            <button onClick={()=>setPage('admin')}
              style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',
                borderRadius:'8px',padding:'6px 14px',cursor:'pointer',fontSize:'0.78rem',fontWeight:'600'}}>
              👥 Gérer les utilisateurs
            </button>
          )}
          <button onClick={()=>setAuth(null)}
            style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.3)',
              borderRadius:'8px',padding:'6px 14px',cursor:'pointer',fontSize:'0.78rem',fontWeight:'600'}}>
            ⇠ Déconnexion
          </button>
        </div>
      </div>
      <div style={{background:'#fff',borderRadius:'14px',padding:'30px',textAlign:'center',
        border:'1px solid #e0e8e0',color:'#6a7f6a'}}>
        <div style={{fontSize:'2rem',marginBottom:'10px'}}>🚧</div>
        <div style={{fontWeight:'700',color:'#1b3a1b',marginBottom:'6px'}}>Dashboard en cours de développement</div>
        <div style={{fontSize:'0.82rem'}}>Prochaine étape : Parcelles + Capteurs + Calculs ETo/ETc</div>
      </div>
    </div>
  );
}

export default App;
