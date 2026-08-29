import { useState } from 'react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Parcelles from './pages/Parcelles';
import Calculs from './pages/Calculs';
import './App.css';

const NAV = [
  { page:'parcelles', icon:'🧭', label:'Parcelles' },
  { page:'capteurs',  icon:'📡', label:'Capteurs'  },
  { page:'calculs',   icon:'🧮', label:'Calculs'   },
  { page:'graphes',   icon:'📈', label:'Graphes'   },
];

const DASH_CARDS = [
  { page:'parcelles', icon:'🧭', label:'Mes parcelles',    desc:'Gérer vos plots et cultures', color:'var(--green)',  bg:'var(--green-pale)' },
  { page:'capteurs',  icon:'📡', label:'Données capteurs', desc:'Sol 8-en-1 + météo GPS',       color:'var(--blue)',   bg:'var(--blue-pale)'  },
  { page:'calculs',   icon:'🧮', label:'Calculs ETo/ETc',  desc:'Bilan hydrique FAO-56',         color:'var(--orange)', bg:'var(--orange-pale)'},
  { page:'graphes',   icon:'📈', label:'Graphes',          desc:'Historique et tendances',       color:'var(--purple)', bg:'var(--purple-pale)'},
];

function Topbar({ auth, page, setPage, onLogout }) {
  const roleIcons = { admin:'🛡️', agronome:'🌿', technicien:'🔧' };
  const initials  = auth.user.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  return (
    <header className="topbar">
      <div className="topbar-brand" style={{cursor:'pointer'}} onClick={() => setPage('dashboard')}>
        <div className="topbar-logo">🌾</div>
        <div>
          <div className="topbar-name">AgriSens</div>
          <div className="topbar-sub">Irrigation de précision</div>
        </div>
      </div>

      <nav className="topbar-nav">
        {NAV.map(n => (
          <button key={n.page}
            className={`topbar-btn ${page===n.page?'active':''}`}
            onClick={() => setPage(n.page)}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
        {auth.role === 'admin' && (
          <button className={`topbar-btn ${page==='admin'?'active':''}`}
            onClick={() => setPage('admin')}>
            <span>👥</span><span>Utilisateurs</span>
          </button>
        )}

        <div className="topbar-user">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-info-name">{auth.user.split(' ')[0]}</div>
            <div className="user-info-role">{roleIcons[auth.role]} {auth.role}</div>
          </div>
        </div>

        <div className="live-dot" title="En direct"/>

        <button className="topbar-btn danger" onClick={onLogout}>
          <span>⇠</span>
        </button>
      </nav>
    </header>
  );
}

function Dashboard({ auth, setPage }) {
  const now  = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const parcelles = JSON.parse(localStorage.getItem('agrisens_parcelles') || '[]');
  const myParc    = auth.role === 'admin' ? parcelles : parcelles.filter(p => p.owner === auth.email);
  const users     = JSON.parse(localStorage.getItem('agrisens_users') || '[]');

  const cards = auth.role === 'admin'
    ? [...DASH_CARDS, { page:'admin', icon:'👥', label:'Utilisateurs', desc:'Gérer les accès', color:'var(--red)', bg:'var(--red-pale)' }]
    : DASH_CARDS;

  return (
    <div className="page-wrap">
      <div className="welcome-banner">
        <div>
          <div className="welcome-greeting">{greeting}, {auth.user.split(' ')[0]} 👋</div>
          <div className="welcome-sub">
            {now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>
        <div style={{display:'flex',gap:'16px',flexWrap:'wrap'}}>
          {auth.role === 'admin' && (
            <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'12px',padding:'12px 20px',textAlign:'center'}}>
              <div style={{fontSize:'1.6rem',fontWeight:'800',color:'#fff'}}>{users.length}</div>
              <div style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.75)',textTransform:'uppercase'}}>Utilisateurs</div>
            </div>
          )}
          <div style={{background:'rgba(255,255,255,0.15)',borderRadius:'12px',padding:'12px 20px',textAlign:'center'}}>
            <div style={{fontSize:'1.6rem',fontWeight:'800',color:'#fff'}}>{myParc.length}</div>
            <div style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.75)',textTransform:'uppercase'}}>Parcelles</div>
          </div>
        </div>
      </div>

      <div className="page-header">
        <div className="page-title">Tableau de bord</div>
        <div className="page-desc">Sélectionnez une section pour commencer</div>
      </div>

      <div className="dash-grid">
        {cards.map(c => (
          <div key={c.page} className="dash-card"
            style={{'--card-color':c.color,'--card-bg':c.bg}}
            onClick={() => setPage(c.page)}>
            <div className="dash-card-icon">{c.icon}</div>
            <div className="dash-card-label">{c.label}</div>
            <div className="dash-card-desc">{c.desc}</div>
            <div className="dash-card-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoon({ label, icon }) {
  return (
    <div className="page-wrap">
      <div className="empty-state">
        <div className="empty-state-icon">{icon || '🚧'}</div>
        <div className="empty-state-title">{label}</div>
        <div className="empty-state-desc">Cette section est en cours de développement.</div>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState('dashboard');

  function handleLogout() { setAuth(null); setPage('dashboard'); }
  function handleLogin(a) { setAuth(a); setPage('dashboard'); }

  if (!auth) return <Login onLogin={handleLogin}/>;

  return (
    <div className="app-root">
      <Topbar auth={auth} page={page} setPage={setPage} onLogout={handleLogout}/>

      {page === 'dashboard' && <Dashboard auth={auth} setPage={setPage}/>}
      {page === 'admin'     && (
        <div className="page-wrap">
          <AdminPanel auth={auth} onBack={() => setPage('dashboard')}/>
        </div>
      )}
      {page === 'parcelles' && (
        <div className="page-wrap">
          <Parcelles auth={auth}/>
        </div>
      )}
      {page === 'calculs'   && (
        <div className="page-wrap">
          <Calculs auth={auth}/>
        </div>
      )}
      {page === 'capteurs'  && <ComingSoon label="Données capteurs" icon="📡"/>}
      {page === 'graphes'   && <ComingSoon label="Graphes historiques" icon="📈"/>}
    </div>
  );
}
