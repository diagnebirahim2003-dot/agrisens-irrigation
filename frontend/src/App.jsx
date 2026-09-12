import { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import Parcelles from './pages/Parcelles';
import Calculs from './pages/Calculs';
import Capteurs from './pages/Capteurs';
import Graphes from './pages/Graphes';
import Historique from './pages/Historique';
import { listParcelles } from './utils/orion';
import logoImg from './assets/logo.png';
import {
  IconHome, IconCompass, IconAntenna, IconCalculator, IconTrendUp,
  IconCalendar, IconUsers, IconLogout, IconArrowRight,
  IconShield, IconLeaf, IconWrench, IconDroplet,
} from './components/Icons';
import './App.css';

const NAV = [
  { page:'dashboard',   Icon:IconHome,       label:'Accueil'     },
  { page:'parcelles',   Icon:IconCompass,    label:'Parcelles'    },
  { page:'capteurs',    Icon:IconAntenna,    label:'Capteurs'     },
  { page:'calculs',     Icon:IconCalculator, label:'Calculs'      },
  { page:'graphes',     Icon:IconTrendUp,    label:'Graphes'      },
  { page:'historique',  Icon:IconCalendar,   label:'Historique'   },
];

const ROLE = {
  admin:      { label:'Administrateur', Icon:IconShield, cls:'role-admin' },
  agronome:   { label:'Agronome',       Icon:IconLeaf,   cls:'role-agro'  },
  technicien: { label:'Technicien',     Icon:IconWrench, cls:'role-tech'  },
};

function Sidebar({ auth, page, setPage, onLogout }) {
  const initials = auth.user.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const role = ROLE[auth.role] || ROLE.agronome;
  const nav = auth.role === 'admin'
    ? [...NAV, { page:'admin', Icon:IconUsers, label:'Utilisateurs' }]
    : NAV;

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">
          <img src={logoImg} alt="AgroSens" style={{width:'40px',height:'40px',borderRadius:'10px',objectFit:'cover'}}/>
        </div>
        <div>
          <div className="sb-name">AgroSens</div>
          <div className="sb-tagline">Irrigation de précision</div>
        </div>
      </div>

      <nav className="sb-nav">
        {nav.map(n => (
          <button key={n.page}
            className={`sb-item ${page===n.page?'active':''}`}
            onClick={() => setPage(n.page)}>
            <span className="sb-item-icon"><n.Icon size={18}/></span>
            <span className="sb-item-label">{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sb-bottom">
        <div className="sb-live">
          <span className="live-pulse"/>
          <span>Système actif</span>
        </div>
        <div className="sb-user">
          <div className={`sb-avatar ${role.cls}`}>
            {initials}
          </div>
          <div className="sb-user-info">
            <div className="sb-user-name">{auth.user}</div>
            <div className="sb-user-role"><role.Icon size={12}/> {role.label}</div>
          </div>
        </div>
        <button className="sb-logout" onClick={onLogout}>
          <IconLogout size={16}/> Déconnexion
        </button>
      </div>
    </aside>
  );
}

function BottomNav({ auth, page, setPage }) {
  const nav = auth.role === 'admin'
    ? [...NAV, { page:'admin', Icon:IconUsers, label:'Users' }]
    : NAV;
  return (
    <nav className="bottom-nav">
      {nav.map(n => (
        <button key={n.page}
          className={`bn-item ${page===n.page?'active':''}`}
          onClick={() => setPage(n.page)}>
          <span className="bn-icon"><n.Icon size={20}/></span>
          <span className="bn-label">{n.label}</span>
        </button>
      ))}
    </nav>
  );
}

function Dashboard({ auth, setPage }) {
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const [nbParcelles, setNbParcelles] = useState(0);
  const users = JSON.parse(localStorage.getItem('agrisens_users') || '[]');
  const role = ROLE[auth.role] || ROLE.agronome;

  useEffect(() => {
    listParcelles(auth.token, auth.role === 'admin' ? {} : { owner: auth.email })
      .then(list => setNbParcelles(list.length))
      .catch(() => setNbParcelles(0));
  }, []);

  const kpis = [
    { Icon:IconCompass, label:'Parcelles',    val:nbParcelles, cls:'kc-green' },
    { Icon:IconAntenna, label:'Capteurs',     val:nbParcelles, cls:'kc-water' },
    { Icon:IconDroplet, label:'Plots actifs', val:nbParcelles, cls:'kc-water' },
    ...(auth.role==='admin'
      ? [{ Icon:IconUsers, label:'Utilisateurs', val:users.length, cls:'kc-earth' }]
      : []),
  ];

  const cards = [
    { page:'parcelles', Icon:IconCompass,    label:'Mes parcelles',    desc:'Gérer vos plots, cultures et stades',   cls:'nc-green' },
    { page:'capteurs',  Icon:IconAntenna,    label:'Données capteurs', desc:'Sol 8-en-1 + météo OpenWeatherMap',     cls:'nc-water' },
    { page:'calculs',   Icon:IconCalculator, label:'Calculs ETo/ETc',  desc:'Bilan hydrique FAO-56 Penman-Monteith', cls:'nc-earth' },
    { page:'graphes',   Icon:IconTrendUp,    label:'Graphes',          desc:'Historique humidité et températures',   cls:'nc-plum'  },
  ];

  return (
    <div className="main-content">
      <div className="dash-greeting">
        <div>
          <h1 className="dash-hello">{greeting}, {auth.user.split(' ')[0]}</h1>
          <p className="dash-date">
            {now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            {' · '}USSEIN Kaolack
          </p>
        </div>
        <div className="dash-badge-role">
          <role.Icon size={15}/> {role.label}
        </div>
      </div>

      <div className="kpi-row">
        {kpis.map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-icon"><k.Icon size={18}/></div>
            <div className="kpi-val">{k.val}</div>
            <div className="kpi-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Navigation rapide</h2>
      <div className="nav-cards">
        {cards.map(c => (
          <div key={c.page} className={`nav-card ${c.cls}`}
            onClick={() => setPage(c.page)}>
            <div className="nc-top">
              <div className="nc-icon"><c.Icon size={20}/></div>
              <span className="nc-arrow"><IconArrowRight size={16}/></span>
            </div>
            <div className="nc-label">{c.label}</div>
            <div className="nc-desc">{c.desc}</div>
          </div>
        ))}
      </div>
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
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  const [page, setPage] = useState('dashboard');

  if (!auth) return <Login onLogin={a => { setAuth(a); setPage('dashboard'); }}/>;

  return (
    <div className="app-shell">
      <Sidebar auth={auth} page={page} setPage={setPage}
        onLogout={() => { setAuth(null); setPage('dashboard'); }}/>

      <div className="app-body">
        {page==='dashboard' && <Dashboard auth={auth} setPage={setPage}/>}
        {page==='admin'     && <PageWrap title="Utilisateurs"><AdminPanel auth={auth} onBack={()=>setPage('dashboard')}/></PageWrap>}
        {page==='parcelles' && <PageWrap title="Mes parcelles" desc="Gérez vos plots et cultures"><Parcelles auth={auth}/></PageWrap>}
        {page==='calculs'   && <PageWrap title="Calculs agronomiques" desc="ETo · ETc · RU · RFU — FAO-56"><Calculs auth={auth}/></PageWrap>}
        {page==='capteurs'  && <PageWrap title="Données capteurs" desc="Capteur 8-en-1 + météo temps réel"><Capteurs auth={auth}/></PageWrap>}
        {page==='graphes'   && <PageWrap title="Graphes" desc="Historique des relevés du capteur 8-en-1"><Graphes auth={auth}/></PageWrap>}
        {page==='historique'&& <PageWrap><Historique auth={auth}/></PageWrap>}
      </div>

      <BottomNav auth={auth} page={page} setPage={setPage}/>
    </div>
  );
}
