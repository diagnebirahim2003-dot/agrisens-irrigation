import { useState } from 'react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Parcelles from './pages/Parcelles';
import Calculs from './pages/Calculs';
import Capteurs from './pages/Capteurs';
import './App.css';

const NAV_ITEMS = [
  { page:'dashboard', icon:'🏠', label:'Accueil'   },
  { page:'parcelles', icon:'🧭', label:'Parcelles'  },
  { page:'capteurs',  icon:'📡', label:'Capteurs'   },
  { page:'calculs',   icon:'🧮', label:'Calculs'    },
  { page:'graphes',   icon:'📈', label:'Graphes'    },
];

function Sidebar({ auth, page, setPage, onLogout }) {
  const roleColors = { admin:'#e65100', agronome:'#1565c0', technicien:'#6a1b9a' };
  const roleIcons  = { admin:'🛡️', agronome:'🌿', technicien:'🔧' };
  const initials   = auth.user.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const nav = auth.role === 'admin'
    ? [...NAV_ITEMS, { page:'admin', icon:'👥', label:'Utilisateurs' }]
    : NAV_ITEMS;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-brand">
        <div className="sb-logo">🌾</div>
        <div>
          <div className="sb-name">AgriSens</div>
          <div className="sb-tagline">Irrigation IoT</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {nav.map(n => (
          <button key={n.page}
            className={`sb-item ${page===n.page?'active':''}`}
            onClick={() => setPage(n.page)}>
            <span className="sb-item-icon">{n.icon}</span>
            <span className="sb-item-label">{n.label}</span>
            {page===n.page && <span className="sb-item-dot"/>}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sb-bottom">
        <div className="sb-live">
          <span className="live-pulse"/>
          <span>Système actif</span>
        </div>
        <div className="sb-user">
          <div className="sb-avatar" style={{background:roleColors[auth.role]}}>
            {initials}
          </div>
          <div className="sb-user-info">
            <div className="sb-user-name">{auth.user}</div>
            <div className="sb-user-role">{roleIcons[auth.role]} {auth.role}</div>
          </div>
        </div>
        <button className="sb-logout" onClick={onLogout}>
          ⇠ Déconnexion
        </button>
      </div>
    </aside>
  );
}

function Dashboard({ auth, setPage }) {
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const parcelles= JSON.parse(localStorage.getItem('agrisens_parcelles') || '[]');
  const myParc   = auth.role==='admin' ? parcelles : parcelles.filter(p=>p.owner===auth.email);
  const users    = JSON.parse(localStorage.getItem('agrisens_users') || '[]');

  const kpis = [
    { icon:'🧭', label:'Parcelles',   val:myParc.length,  color:'#2e7d32', bg:'#e8f5e9' },
    { icon:'📡', label:'Capteurs',    val:myParc.length*1, color:'#1565c0', bg:'#e3f2fd' },
    { icon:'💧', label:'Plots actifs',val:myParc.length,  color:'#0288d1', bg:'#e1f5fe' },
    ...(auth.role==='admin'
      ? [{ icon:'👥', label:'Utilisateurs', val:users.length, color:'#e65100', bg:'#fff3e0' }]
      : []),
  ];

  const cards = [
    { page:'parcelles', icon:'🧭', label:'Mes parcelles',    desc:'Gérer vos plots, cultures et suivre les stades phénologiques', color:'#2e7d32', gradient:'linear-gradient(135deg,#e8f5e9,#c8e6c9)' },
    { page:'capteurs',  icon:'📡', label:'Données capteurs', desc:'Sol 8-en-1 (N,P,K,pH,Hum) + météo OpenWeatherMap en temps réel', color:'#1565c0', gradient:'linear-gradient(135deg,#e3f2fd,#bbdefb)' },
    { page:'calculs',   icon:'🧮', label:'Calculs ETo/ETc',  desc:'Bilan hydrique complet — Hargreaves + Penman-Monteith FAO-56', color:'#e65100', gradient:'linear-gradient(135deg,#fff3e0,#ffe0b2)' },
    { page:'graphes',   icon:'📈', label:'Graphes',          desc:'Historique humidité, températures, ETo/ETc et bilan hydrique', color:'#6a1b9a', gradient:'linear-gradient(135deg,#f3e5f5,#e1bee7)' },
  ];

  return (
    <div className="main-content">
      {/* Greeting */}
      <div className="dash-greeting">
        <div>
          <h1 className="dash-hello">{greeting}, {auth.user.split(' ')[0]} 👋</h1>
          <p className="dash-date">
            {now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            {' · '}USSEIN Kaolack
          </p>
        </div>
        <div className="dash-badge-role">
          {auth.role === 'admin' && '🛡️ Administrateur'}
          {auth.role === 'agronome' && '🌿 Agronome'}
          {auth.role === 'technicien' && '🔧 Technicien'}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        {kpis.map(k => (
          <div key={k.label} className="kpi-card" style={{'--kc':k.color,'--kb':k.bg}}>
            <div className="kpi-icon">{k.icon}</div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Nav cards */}
      <h2 className="section-title">Navigation rapide</h2>
      <div className="nav-cards">
        {cards.map(c => (
          <div key={c.page} className="nav-card" style={{'--nc':c.color,'--ng':c.gradient}}
            onClick={() => setPage(c.page)}>
            <div className="nc-top">
              <div className="nc-icon">{c.icon}</div>
              <span className="nc-arrow">→</span>
            </div>
            <div className="nc-label">{c.label}</div>
            <div className="nc-desc">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {navItems.map(n => (
          <button key={n.page}
            className={`bn-item ${page===n.page?'active':''}`}
            onClick={() => setPage(n.page)}>
            <span className="bn-icon">{n.icon}</span>
            <span className="bn-label">{n.label}</span>
          </button>
        ))}
        {auth.role === 'admin' && (
          <button
            className={`bn-item ${page==='admin'?'active':''}`}
            onClick={() => setPage('admin')}>
            <span className="bn-icon">👥</span>
            <span className="bn-label">Users</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function PageWrap({ title, desc, children }) {
  return (
    <div className="main-content">
      {title && (
        <div className="page-top">
          <h1 className="page-title">{title}</h1>
          {desc && <p className="page-desc">{desc}</p>}
        </div>
      )}
      {children}
    </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {navItems.map(n => (
          <button key={n.page}
            className={`bn-item ${page===n.page?'active':''}`}
            onClick={() => setPage(n.page)}>
            <span className="bn-icon">{n.icon}</span>
            <span className="bn-label">{n.label}</span>
          </button>
        ))}
        {auth.role === 'admin' && (
          <button
            className={`bn-item ${page==='admin'?'active':''}`}
            onClick={() => setPage('admin')}>
            <span className="bn-icon">👥</span>
            <span className="bn-label">Users</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function ComingSoon({ icon, label }) {
  return (
    <div className="main-content">
      <div className="coming-soon">
        <div className="cs-icon">{icon}</div>
        <h2 className="cs-title">{label}</h2>
        <p className="cs-desc">Cette section est en cours de développement.</p>
      </div>
    </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {navItems.map(n => (
          <button key={n.page}
            className={`bn-item ${page===n.page?'active':''}`}
            onClick={() => setPage(n.page)}>
            <span className="bn-icon">{n.icon}</span>
            <span className="bn-label">{n.label}</span>
          </button>
        ))}
        {auth.role === 'admin' && (
          <button
            className={`bn-item ${page==='admin'?'active':''}`}
            onClick={() => setPage('admin')}>
            <span className="bn-icon">👥</span>
            <span className="bn-label">Users</span>
          </button>
        )}
      </nav>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState('dashboard');

  if (!auth) return <Login onLogin={a => { setAuth(a); setPage('dashboard'); }}/>;

  const navItems = [
    { page:'dashboard', icon:'🏠', label:'Accueil'  },
    { page:'parcelles', icon:'🧭', label:'Parcelles' },
    { page:'capteurs',  icon:'📡', label:'Capteurs'  },
    { page:'calculs',   icon:'🧮', label:'Calculs'   },
    { page:'graphes',   icon:'📈', label:'Graphes'   },
  ];

  return (
    <div className="app-shell">
      <Sidebar auth={auth} page={page} setPage={setPage} onLogout={() => { setAuth(null); setPage('dashboard'); }}/>
      <div className="app-body" style={{paddingBottom:'70px'}}>
        {page==='dashboard' && <Dashboard auth={auth} setPage={setPage}/>}
        {page==='admin'     && <PageWrap title="👥 Gestion des utilisateurs"><AdminPanel auth={auth} onBack={()=>setPage('dashboard')}/></PageWrap>}
        {page==='parcelles' && <PageWrap title="🧭 Mes parcelles" desc="Gérez vos plots et suivez les stades culturaux"><Parcelles auth={auth}/></PageWrap>}
        {page==='calculs'   && <PageWrap title="🧮 Calculs agronomiques" desc="ETo · ETc · RU · RFU — FAO-56 + Hargreaves"><Calculs auth={auth}/></PageWrap>}
        {page==='capteurs' && <PageWrap title="📡 Données capteurs" desc="Capteur 8-en-1 (sol) + Météo OpenWeatherMap temps réel"><Capteurs auth={auth}/></PageWrap>}
        {page==='graphes'   && <ComingSoon icon="📈" label="Graphes historiques"/>}
      </div>
    </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        {navItems.map(n => (
          <button key={n.page}
            className={`bn-item ${page===n.page?'active':''}`}
            onClick={() => setPage(n.page)}>
            <span className="bn-icon">{n.icon}</span>
            <span className="bn-label">{n.label}</span>
          </button>
        ))}
        {auth.role === 'admin' && (
          <button
            className={`bn-item ${page==='admin'?'active':''}`}
            onClick={() => setPage('admin')}>
            <span className="bn-icon">👥</span>
            <span className="bn-label">Users</span>
          </button>
        )}
      </nav>
    </div>
  );
}
