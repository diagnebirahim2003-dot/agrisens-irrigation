import { useState, useEffect, useRef } from 'react';
import './Capteurs.css';

const OWM_KEY  = 'f376f93aee61a823a4c0eff15e47b0a0';
const SITE_LAT = 14.15;
const SITE_LNG = -16.07;

function getParcelleCoords() {
  const all = JSON.parse(localStorage.getItem('agrosens_parcelles') || '[]');
  if (all.length > 0) return { lat: all[0].lat, lng: all[0].lng, nom: all[0].nom };
  return { lat: SITE_LAT, lng: SITE_LNG, nom: 'USSEIN Kaolack' };
}

function statusClass(val, min, max) {
  if (val === null || val === undefined) return 'val-neutral';
  if (val < min) return 'val-low';
  if (val > max) return 'val-high';
  return 'val-ok';
}

function gauge(val, min, max) {
  if (val === null || val === undefined) return 0;
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
}

export default function Capteurs({ auth }) {
  // 8-en-1 état
  const [port,       setPort]      = useState(null);
  const [serialSt,   setSerialSt]  = useState('disconnected');
  const [sol,        setSol]        = useState({
    humidite:null, temperature:null, ec:null,
    ph:null, n:null, p:null, k:null, luminosite:null,
    updatedAt:null
  });

  // Météo état
  const [meteo,      setMeteo]     = useState(null);
  const [meteoLoad,  setMeteoLoad] = useState(false);
  const [meteoErr,   setMeteoErr]  = useState('');
  const [lastFetch,  setLastFetch] = useState(null);

  const readerRef  = useRef(null);
  const bufferRef  = useRef('');
  const timerRef   = useRef(null);

  useEffect(() => {
    fetchMeteo();
    timerRef.current = setInterval(fetchMeteo, 5 * 60 * 1000); // refresh 5 min
    return () => {
      clearInterval(timerRef.current);
      disconnectSerial();
    };
  }, []);

  // ── MÉTÉO OpenWeatherMap ──────────────────────────────
  async function fetchMeteo() {
    const coords = getParcelleCoords();
    setMeteoLoad(true); setMeteoErr('');
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lng}`+
        `&appid=${OWM_KEY}&units=metric&lang=fr`
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.message);
      setMeteo({
        ville:       d.name,
        temp:        d.main.temp,
        temp_max:    d.main.temp_max,
        temp_min:    d.main.temp_min,
        feels:       d.main.feels_like,
        humidite:    d.main.humidity,
        pression:    d.main.pressure,
        vent:        d.wind.speed,
        vent_dir:    d.wind.deg,
        desc:        d.weather[0].description,
        icon:        d.weather[0].icon,
        nuage:       d.clouds.all,
        pluie:       d.rain?.['1h'] || 0,
        visib:       d.visibility / 1000,
        lat:         coords.lat,
        lng:         coords.lng,
        site:        coords.nom,
      });
      setLastFetch(new Date().toLocaleTimeString('fr-FR'));
    } catch(e) {
      setMeteoErr('Erreur météo : ' + e.message);
      // Données démo
      setMeteo({
        ville:'Kaolack', temp:32, temp_max:35, temp_min:26,
        feels:36, humidite:68, pression:1010, vent:3.2,
        vent_dir:180, desc:'ensoleillé', icon:'01d',
        nuage:10, pluie:0, visib:10,
        lat:SITE_LAT, lng:SITE_LNG, site:'USSEIN Kaolack (démo)',
      });
      setLastFetch(new Date().toLocaleTimeString('fr-FR'));
    } finally { setMeteoLoad(false); }
  }

  // ── WEB SERIAL — Capteur 8-en-1 ──────────────────────
  async function connectSerial() {
    if (port) { disconnectSerial(); return; }

    if (!('serial' in navigator)) {
      alert('Web Serial API non supportée.\nUtilisez Chrome ou Edge (PC/Android).\n\nMode démonstration activé.');
      demoData(); return;
    }

    try {
      setSerialSt('connecting');
      const p = await navigator.serial.requestPort();
      await p.open({ baudRate:9600, dataBits:8, stopBits:1, parity:'none' });
      setPort(p); setSerialSt('connected');
      readLoop(p);
    } catch(e) {
      if (e.name !== 'NotFoundError') setSerialSt('error');
      else setSerialSt('disconnected');
      demoData();
    }
  }

  async function readLoop(p) {
    const reader = p.readable.getReader();
    readerRef.current = reader;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        bufferRef.current += new TextDecoder().decode(value);
        const lines = bufferRef.current.split('\n');
        bufferRef.current = lines.pop();
        lines.forEach(parseLine);
      }
    } catch(e) {
      console.log('Serial ended:', e.message);
    } finally {
      reader.releaseLock();
      setSerialSt('disconnected');
      setPort(null);
    }
  }

  async function disconnectSerial() {
    try {
      if (readerRef.current) { await readerRef.current.cancel(); readerRef.current = null; }
      if (port) { await port.close(); setPort(null); }
    } catch(e) {}
    setSerialSt('disconnected');
  }

  // Parser ligne capteur
  // Format: "HUM:42.5,TEMP:28.1,EC:350,PH:6.8,N:45,P:30,K:120,LUX:850"
  // ou CSV: "42.5,28.1,350,6.8,45,30,120,850"
  function parseLine(line) {
    line = line.trim();
    if (!line) return;
    try {
      let data = {};
      if (line.includes(':')) {
        line.split(',').forEach(p => {
          const [k, v] = p.split(':');
          const map = {
            HUM:'humidite', MOISTURE:'humidite',
            TEMP:'temperature', TEMP_SOIL:'temperature',
            EC:'ec', PH:'ph',
            N:'n', NO3:'n',
            P:'p', PH2:'p',
            K:'k',
            LUX:'luminosite', LIGHT:'luminosite',
          };
          if (map[k?.trim()]) data[map[k.trim()]] = parseFloat(v);
        });
      } else {
        const vals = line.split(',').map(Number);
        if (vals.length >= 7) {
          [data.humidite, data.temperature, data.ec,
           data.ph, data.n, data.p, data.k] = vals;
          if (vals[7]) data.luminosite = vals[7];
        }
      }
      if (Object.keys(data).length > 0) {
        setSol(prev => ({ ...prev, ...data, updatedAt: new Date().toLocaleTimeString('fr-FR') }));
        localStorage.setItem('agrosens_sol8', JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
      }
    } catch(e) {}
  }

  // Démo data
  function demoData() {
    const demo = {
      humidite:    Math.round((25 + Math.random()*40) * 10) / 10,
      temperature: Math.round((24 + Math.random()*10) * 10) / 10,
      ec:          Math.round(200 + Math.random()*400),
      ph:          Math.round((5.5 + Math.random()*2) * 10) / 10,
      n:           Math.round(20 + Math.random()*80),
      p:           Math.round(10 + Math.random()*50),
      k:           Math.round(60 + Math.random()*120),
      luminosite:  Math.round(400 + Math.random()*600),
      updatedAt:   new Date().toLocaleTimeString('fr-FR'),
    };
    setSol(demo);
    localStorage.setItem('agrosens_sol8', JSON.stringify({ ...demo, updatedAt: new Date().toISOString() }));
    setSerialSt('demo');
  }

  function windDir(deg) {
    const dirs = ['N','NE','E','SE','S','SO','O','NO'];
    return dirs[Math.round(deg / 45) % 8];
  }

  const serialLabel = {
    disconnected: '🔌 Connecter le capteur 8-en-1',
    connecting:   '⏳ Connexion...',
    connected:    '✅ Connecté — Cliquer pour déconnecter',
    demo:         '📊 Mode démo — Cliquer pour reconnecter',
    error:        '❌ Erreur — Réessayer',
  }[serialSt];

  const serialColor = {
    disconnected: '#1565c0',
    connecting:   '#e65100',
    connected:    '#2e7d32',
    demo:         '#6a1b9a',
    error:        '#c62828',
  }[serialSt];

  return (
    <div className="cap-wrap">

      {/* ── MÉTÉO ── */}
      <div className="cap-section">
        <div className="cap-section-header">
          <div className="cap-section-title">⛅ Météo en temps réel — OpenWeatherMap</div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            {lastFetch && <span className="cap-ts">Mis à jour : {lastFetch}</span>}
            <button className="btn-refresh" onClick={fetchMeteo} disabled={meteoLoad}>
              {meteoLoad ? '⏳' : '🔄'} Actualiser
            </button>
          </div>
        </div>
        {meteoErr && <div className="cap-warn">{meteoErr} — données de démonstration affichées</div>}
        {meteo && (
          <>
            <div className="meteo-top">
              <div className="meteo-main">
                <img src={`https://openweathermap.org/img/wn/${meteo.icon}@2x.png`}
                  alt={meteo.desc} className="meteo-icon" onError={e=>e.target.style.display='none'}/>
                <div>
                  <div className="meteo-temp">{meteo.temp.toFixed(1)}°C</div>
                  <div className="meteo-desc">{meteo.desc}</div>
                  <div className="meteo-loc">📍 {meteo.site}</div>
                </div>
              </div>
              <div className="meteo-feels">
                <div className="mf-val">{meteo.feels.toFixed(1)}°C</div>
                <div className="mf-lbl">Ressenti</div>
              </div>
            </div>
            <div className="meteo-grid">
              {[
                { icon:'🌡️', lbl:'Tmax',      val:meteo.temp_max.toFixed(1)+'°C', cls:'' },
                { icon:'🌡️', lbl:'Tmin',      val:meteo.temp_min.toFixed(1)+'°C', cls:'' },
                { icon:'💧', lbl:'Hum. air',  val:meteo.humidite+'%',             cls:statusClass(meteo.humidite,30,80) },
                { icon:'💨', lbl:'Vent',       val:meteo.vent+' m/s '+windDir(meteo.vent_dir), cls:'' },
                { icon:'📊', lbl:'Pression',   val:meteo.pression+' hPa',         cls:'' },
                { icon:'☁️', lbl:'Nuages',     val:meteo.nuage+'%',               cls:'' },
                { icon:'🌧️', lbl:'Pluie 1h',  val:meteo.pluie+' mm',             cls:'' },
                { icon:'👁️', lbl:'Visibilité', val:meteo.visib+' km',             cls:'' },
              ].map(m => (
                <div key={m.lbl} className="meteo-card">
                  <div className="mc-icon">{m.icon}</div>
                  <div className={`mc-val ${m.cls}`}>{m.val}</div>
                  <div className="mc-lbl">{m.lbl}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── CAPTEUR 8-EN-1 ── */}
      <div className="cap-section">
        <div className="cap-section-header">
          <div className="cap-section-title">📡 Capteur 8-en-1 — Sol (USB-C Web Serial)</div>
          {sol.updatedAt && <span className="cap-ts">Dernière lecture : {sol.updatedAt}</span>}
        </div>

        <button className="btn-serial"
          style={{background:serialColor}}
          onClick={connectSerial}
          disabled={serialSt==='connecting'}>
          {serialLabel}
        </button>

        {serialSt === 'disconnected' && (
          <div className="serial-hint">
            💡 Branchez le capteur 8-en-1 via USB-C puis cliquez "Connecter".<br/>
            Compatible Chrome et Edge sur PC et Android.
          </div>
        )}

        <div className="sol-grid">

          {/* Humidité sol */}
          <div className="sol-card">
            <div className="sc-header">
              <span className="sc-icon">💧</span>
              <span className="sc-title">Humidité sol</span>
            </div>
            <div className={`sc-val ${statusClass(sol.humidite, 20, 80)}`}>
              {sol.humidite !== null ? sol.humidite+'%' : '—'}
            </div>
            <div className="sc-bar">
              <div className="sc-fill hum" style={{width:gauge(sol.humidite,0,100)+'%'}}/>
            </div>
            <div className="sc-range">Optimal : 40–70%</div>
          </div>

          {/* Température sol */}
          <div className="sol-card">
            <div className="sc-header">
              <span className="sc-icon">🌡️</span>
              <span className="sc-title">Temp. sol</span>
            </div>
            <div className={`sc-val ${statusClass(sol.temperature, 18, 35)}`}>
              {sol.temperature !== null ? sol.temperature+'°C' : '—'}
            </div>
            <div className="sc-bar">
              <div className="sc-fill temp" style={{width:gauge(sol.temperature,10,50)+'%'}}/>
            </div>
            <div className="sc-range">Optimal : 18–35°C</div>
          </div>

          {/* pH */}
          <div className="sol-card">
            <div className="sc-header">
              <span className="sc-icon">🧪</span>
              <span className="sc-title">pH</span>
            </div>
            <div className={`sc-val ${statusClass(sol.ph, 5.5, 7.5)}`}>
              {sol.ph !== null ? sol.ph : '—'}
            </div>
            <div className="sc-bar">
              <div className="sc-fill ph" style={{width:gauge(sol.ph,3,10)+'%'}}/>
            </div>
            <div className="sc-range">Optimal : 5.5–7.5</div>
          </div>

          {/* EC */}
          <div className="sol-card">
            <div className="sc-header">
              <span className="sc-icon">⚡</span>
              <span className="sc-title">EC</span>
            </div>
            <div className={`sc-val ${statusClass(sol.ec, 200, 800)}`}>
              {sol.ec !== null ? sol.ec+' µS/cm' : '—'}
            </div>
            <div className="sc-bar">
              <div className="sc-fill ec" style={{width:gauge(sol.ec,0,1500)+'%'}}/>
            </div>
            <div className="sc-range">Optimal : 200–800 µS/cm</div>
          </div>

          {/* NPK */}
          {[
            { key:'n', icon:'🌿', lbl:'Azote N',     unit:'mg/kg', min:50, max:200, color:'npk-n' },
            { key:'p', icon:'🌿', lbl:'Phosphore P', unit:'mg/kg', min:20, max:80,  color:'npk-p' },
            { key:'k', icon:'🌿', lbl:'Potassium K', unit:'mg/kg', min:60, max:200, color:'npk-k' },
          ].map(el => (
            <div key={el.key} className="sol-card">
              <div className="sc-header">
                <span className="sc-icon">{el.icon}</span>
                <span className="sc-title">{el.lbl}</span>
              </div>
              <div className={`sc-val ${statusClass(sol[el.key], el.min, el.max)}`}>
                {sol[el.key] !== null ? sol[el.key]+' '+el.unit : '—'}
              </div>
              <div className="sc-bar">
                <div className={`sc-fill ${el.color}`} style={{width:gauge(sol[el.key],0,300)+'%'}}/>
              </div>
              <div className="sc-range">Optimal : {el.min}–{el.max} {el.unit}</div>
            </div>
          ))}

          {/* Luminosité */}
          <div className="sol-card">
            <div className="sc-header">
              <span className="sc-icon">☀️</span>
              <span className="sc-title">Luminosité</span>
            </div>
            <div className="sc-val val-neutral">
              {sol.luminosite !== null ? sol.luminosite+' lux' : '—'}
            </div>
            <div className="sc-bar">
              <div className="sc-fill lux" style={{width:gauge(sol.luminosite,0,2000)+'%'}}/>
            </div>
            <div className="sc-range">Plein soleil : >1000 lux</div>
          </div>

        </div>

        {/* Alerte NPK */}
        {sol.n !== null && (
          <div className="npk-alert-wrap">
            <div className="npk-alert-title">🔬 Analyse NPK vs valeurs optimales (FAO AGRIS)</div>
            <div className="npk-table">
              {[
                { el:'N', val:sol.n, laitue:150, navet:100, gombo:120 },
                { el:'P', val:sol.p, laitue:40,  navet:30,  gombo:60  },
                { el:'K', val:sol.k, laitue:120, navet:100, gombo:150 },
              ].map(row => (
                <div key={row.el} className="npk-row">
                  <div className="npk-el">{row.el}</div>
                  <div className="npk-mesure">Mesuré : <b>{row.val ?? '—'} mg/kg</b></div>
                  {['laitue','navet','gombo'].map(c => {
                    const opt = row[c];
                    const deficit = row.val !== null ? opt - row.val : null;
                    return (
                      <div key={c} className={`npk-cell ${deficit > 0 ? 'deficit' : deficit < 0 ? 'excess' : 'ok'}`}>
                        <div className="npk-cult">{c.charAt(0).toUpperCase()+c.slice(1)}</div>
                        <div className="npk-opt">Opt: {opt}</div>
                        {deficit !== null && (
                          <div className="npk-def">
                            {deficit > 0 ? '▼ -'+deficit : deficit < 0 ? '▲ +'+Math.abs(deficit) : '✓'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
