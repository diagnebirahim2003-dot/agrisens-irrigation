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
  IconShield, IconLeaf, IconWrench, IconDroplet, IconSun, IconMoon,
} from './components/Icons';
import './App.css';

const OWM_KEY = 'f376f93aee61a823a4c0eff15e47b0a0';
const SITE_LAT = 14.15, SITE_LNG = -16.07;

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('agrisens_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agrisens_theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

// Illustration de champ (rangs de culture en perspective + soleil + gouttes) — en
// SVG intégré plutôt qu'une photo hébergée à l'extérieur, pour que le hero du
// Dashboard reste fiable hors-ligne (PWA) et ne dépende d'aucun service tiers.
function HeroField() {
  return (
    <svg className="dash-hero-field" viewBox="0 0 700 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle cx="610" cy="46" r="34" fill="rgba(255,255,255,0.16)"/>
      <circle cx="610" cy="46" r="20" fill="rgba(255,255,255,0.22)"/>
      {[0,1,2,3,4,5,6].map(i => (
        <path key={i}
          d={`M${-40 + i*70},220 L${170 + i*70},220 L${360 + i*24},130 L${330 + i*24},130 Z`}
          fill={i % 2 === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)'}/>
      ))}
      <path d="M40,150c8-14 26-14 34 0M120,168c8-14 26-14 34 0M480,158c8-14 26-14 34 0"
        stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

// Motif décoratif discret (feuilles + gouttes) posé en filigrane derrière le
// contenu du Dashboard — purement esthétique, jamais un indicateur de donnée.
function LeafDropPattern() {
  return (
    <svg className="dash-pattern" viewBox="0 0 400 300" aria-hidden="true">
      <path d="M40 40c22 0 38 16 38 38-22 0-38-16-38-38Z" fill="var(--accent)"/>
      <path d="M360 90c-20 4-32 22-28 42 20-4 32-22 28-42Z" fill="var(--turquoise)"/>
      <circle cx="70" cy="220" r="7" fill="var(--water)"/>
      <path d="M310 240c0 8-6 13-13 13s-13-5-13-13c0-8 13-24 13-24s13 16 13 24Z" fill="var(--accent)"/>
    </svg>
  );
}

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

function Sidebar({ auth, page, setPage, onLogout, theme, setTheme }) {
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
        <div className="sb-live-row">
          <div className="sb-live">
            <span className="live-pulse"/>
            <span>Système actif</span>
          </div>
          <button className="sb-theme-toggle" onClick={() => setTheme(t => t==='dark'?'light':'dark')}
            title={theme==='dark' ? 'Mode clair' : 'Mode sombre'}>
            {theme==='dark' ? <IconSun size={15}/> : <IconMoon size={15}/>}
          </button>
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
  const [kpiLoading, setKpiLoading]   = useState(true);
  const [meteo, setMeteo]             = useState(null); // pas de valeur avant une vraie réponse OpenWeatherMap
  const users = JSON.parse(localStorage.getItem('agrisens_users') || '[]');
  const role = ROLE[auth.role] || ROLE.agronome;

  useEffect(() => {
    listParcelles(auth.token, auth.role === 'admin' ? {} : { owner: auth.email })
      .then(list => setNbParcelles(list.length))
      .catch(() => setNbParcelles(0))
      .finally(() => setKpiLoading(false));

    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${SITE_LAT}&lon=${SITE_LNG}&appid=${OWM_KEY}&units=metric&lang=fr`)
      .then(res => res.json())
      .then(d => { if (d.main) setMeteo({ temp: Math.round(d.main.temp), humidite: d.main.humidity }); })
      .catch(() => {}); // pas de météo affichée si l'appel échoue — jamais de valeur inventée
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
    <div className="main-content dash-page">
      <LeafDropPattern/>
      <div className="dash-hero">
        <div className="dash-hero-overlay"/>
        <HeroField/>
        <div className="dash-hero-content">
          <div className="dash-hero-top">
            <div className="dash-badge-role">
              <role.Icon size={14}/> {role.label}
            </div>
            <div className="dash-hero-live-pill">
              <span className="live-pulse"/> Système actif
            </div>
          </div>
          <h1 className="dash-hello">{greeting}, {auth.user.split(' ')[0]}</h1>
          <p className="dash-date">
            USSEIN Kaolack
            {' · '}{now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
            {meteo && <> · {meteo.temp}°C · Humidité {meteo.humidite}%</>}
          </p>
        </div>
      </div>

      <div className="kpi-row">
        {kpis.map(k => (
          <div key={k.label} className={`kpi-card ${k.cls}`}>
            <div className="kpi-icon"><k.Icon size={19}/></div>
            <div className="kpi-body">
              {kpiLoading
                ? <div className="kpi-skeleton"/>
                : <div className="kpi-val">{k.val}</div>}
              <div className="kpi-lbl">{k.label}</div>
            </div>
            <svg className="kpi-wave" viewBox="0 0 80 24" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 18 Q 10 6, 20 14 T 40 12 T 60 16 T 80 8" fill="none" strokeWidth="2"/>
            </svg>
          </div>
        ))}
      </div>

      <h2 className="section-title">Navigation rapide</h2>
      <div className="nav-cards">
        {cards.map(c => (
          <div key={c.page} className={`nav-card ${c.cls}`}
            onClick={() => setPage(c.page)}>
            <div className="nc-band"/>
            <div className="nc-medallion"><c.Icon size={26}/></div>
            <div className="nc-label">{c.label}</div>
            <div className="nc-desc">{c.desc}</div>
            <div className="nc-open">
              Ouvrir <IconArrowRight size={14}/>
            </div>
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
  const [theme, setTheme] = useTheme();

  if (!auth) return <Login onLogin={a => { setAuth(a); setPage('dashboard'); }}/>;

  return (
    <div className="app-shell">
      <Sidebar auth={auth} page={page} setPage={setPage} theme={theme} setTheme={setTheme}
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
