import { useState } from 'react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Parcelles from './pages/Parcelles';
import Calculs from './pages/Calculs';
import './App.css';

function Header({ auth, page, setPage, onLogout }) {
  return (
    <div style={{
      background:'linear-gradient(135deg,#1b5e20,#2e7d32)',
      borderRadius:'14px', padding:'14px 20px', marginBottom:'20px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      flexWrap:'wrap', gap:'10px'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        {page !== 'dashboard' && (
          <button
            onClick={() => setPage('dashboard')}
            style={{
              background:'rgba(255,255,255,0.15)',color:'#fff',
              border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',
              padding:'6px 12px',cursor:'pointer',fontSize:'0.82rem',
              fontWeight:'700',display:'flex',alignItems:'center',gap:'4px'
            }}
          >
            ← Retour
          </button>
        )}
        <div>
          <div style={{color:'#fff',fontSize:'1rem',fontWeight:'700'}}>
            🌾 AgriSens
          </div>
          <div style={{color:'rgba(255,255,255,0.75)',fontSize:'0.68rem'}}>
            {auth.user} · {auth.role}
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
        {auth.role === 'admin' && page !== 'admin' && (
          <button onClick={() => setPage('admin')} style={btnStyle}>
            👥 Utilisateurs
          </button>
        )}
        {page !== 'parcelles' && (
          <button onClick={() => setPage('parcelles')} style={btnStyle}>
            🧭 Parcelles
          </button>
        )}
        {page !== 'dashboard' && (
          <button onClick={() => setPage('dashboard')} style={btnStyle}>
            🏠 Accueil
          </button>
        )}
        <button onClick={onLogout} style={{...btnStyle, background:'rgba(198,40,40,0.3)', borderColor:'rgba(198,40,40,0.5)'}}>
          ⇠ Déconnexion
        </button>
      </div>
    </div>
  );
}

const btnStyle = {
  background:'rgba(255,255,255,0.15)', color:'#fff',
  border:'1px solid rgba(255,255,255,0.3)', borderRadius:'8px',
  padding:'6px 12px', cursor:'pointer', fontSize:'0.78rem', fontWeight:'600'
};

function Dashboard({ auth, setPage }) {
  const cards = [
    { icon:'🧭', label:'Mes parcelles',     page:'parcelles',  color:'#e8f5e9', border:'#2e7d32', text:'#1b5e20' },
    { icon:'📊', label:'Données capteurs',  page:'capteurs',   color:'#e3f2fd', border:'#1565c0', text:'#0d47a1' },
    { icon:'🧮', label:'Calculs ETo/ETc',   page:'calculs',    color:'#fff3e0', border:'#e65100', text:'#bf360c' },
    { icon:'📈', label:'Graphes',           page:'graphes',    color:'#f3e5f5', border:'#6a1b9a', text:'#4a148c' },
  ];
  if (auth.role === 'admin') {
    cards.push({ icon:'👥', label:'Utilisateurs', page:'admin', color:'#fce4ec', border:'#c62828', text:'#b71c1c' });
  }
  return (
    <div>
      <div style={{marginBottom:'16px'}}>
        <div style={{fontSize:'1rem',fontWeight:'700',color:'#1b3a1b'}}>
          Bonjour, {auth.user} 👋
        </div>
        <div style={{fontSize:'0.78rem',color:'#6a7f6a',marginTop:'2px'}}>
          Que souhaitez-vous faire aujourd'hui ?
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px'}}>
        {cards.map(c => (
          <div key={c.page}
            onClick={() => setPage(c.page)}
            style={{
              background:c.color, border:`2px solid ${c.border}`,
              borderRadius:'14px', padding:'20px 16px', cursor:'pointer',
              textAlign:'center', transition:'transform .15s',
            }}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
          >
            <div style={{fontSize:'2rem',marginBottom:'8px'}}>{c.icon}</div>
            <div style={{fontWeight:'700',color:c.text,fontSize:'0.85rem'}}>{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ label }) {
  return (
    <div style={{background:'#fff',borderRadius:'14px',padding:'40px',
      textAlign:'center',border:'1px solid #e0e8e0',color:'#6a7f6a'}}>
      <div style={{fontSize:'2.5rem',marginBottom:'10px'}}>🚧</div>
      <div style={{fontWeight:'700',color:'#1b3a1b',fontSize:'1rem',marginBottom:'6px'}}>
        {label}
      </div>
      <div style={{fontSize:'0.8rem'}}>Cette section est en cours de développement.</div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState('dashboard');

  function handleLogout() {
    setAuth(null);
    setPage('dashboard');
  }

  if (!auth) return <Login onLogin={auth => { setAuth(auth); setPage('dashboard'); }}/>;

  return (
    <div style={{fontFamily:'Segoe UI,system-ui,sans-serif',padding:'16px',
      maxWidth:'960px',margin:'0 auto',minHeight:'100vh',background:'#f0f4f0'}}>

      <Header auth={auth} page={page} setPage={setPage} onLogout={handleLogout}/>

      {page === 'dashboard'  && <Dashboard auth={auth} setPage={setPage}/>}
      {page === 'admin'      && <AdminPanel auth={auth} onBack={() => setPage('dashboard')}/>}
      {page === 'parcelles' && <Parcelles auth={auth}/>}
      {page === 'capteurs'   && <ComingSoon label="📊 Données capteurs"/>}
      {page === 'calculs' && <Calculs auth={auth}/>}
      {page === 'graphes'    && <ComingSoon label="📈 Graphes historiques"/>}
    </div>
  );
}
