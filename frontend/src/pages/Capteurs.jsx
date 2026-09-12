import { useState, useEffect, useRef } from 'react';
import { pushReleve, getSol8, setSol8 } from '../utils/historique';
import { listParcelles } from '../utils/orion';
import { listAccountsAsAdmin } from '../utils/accounts';
import { getCultures } from '../utils/cultures';
import {
  IconRefresh, IconLoader, IconPlug, IconCheck, IconX, IconMapPin,
  IconAlertTriangle, IconThermometer, IconFlask, IconZap, IconSprout,
  IconSun, IconCloud, IconWind, IconGauge, IconCloudRain, IconEye,
  IconSearch, IconArrowDown, IconArrowUp, IconAntenna, IconUser,
  IconInfo, IconDroplet,
} from '../components/Icons';
import './Capteurs.css';

const OWM_KEY  = 'f376f93aee61a823a4c0eff15e47b0a0';
const SITE_LAT = 14.15;
const SITE_LNG = -16.07;

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

// Trame Modbus RTU envoyée au capteur : esclave 0x01, fonction 0x03 (lecture
// de registres de maintien), adresse de départ 0x0000, 7 registres, CRC inclus —
// identique à la commande utilisée par le script Python de l'expérimentation
// (COMMANDE_MODBUS). Le capteur ne parle que si on l'interroge ainsi : il
// n'émet jamais de lui-même en continu.
const MODBUS_CMD = new Uint8Array([0x01, 0x03, 0x00, 0x00, 0x00, 0x07, 0x04, 0x08]);

export default function Capteurs({ auth }) {
  const CULTURES = getCultures();

  // Parcelles — le capteur doit être rattaché à UNE parcelle précise avant
  // toute connexion, pour que chaque parcelle/culture garde ses propres
  // données de sol indépendantes.
  const [parcelles,   setParcelles]   = useState([]);
  const [parcLoading, setParcLoading] = useState(true);
  const [parcError,   setParcError]   = useState('');
  const [selectedId,  setSelectedId]  = useState('');
  const [ownerNames,  setOwnerNames]  = useState({}); // email -> "Prénom NOM" (admin uniquement)

  // 8-en-1 état
  const [port,       setPort]      = useState(null);
  const [serialSt,   setSerialSt]  = useState('disconnected');
  const [sol,        setSol]        = useState({
    humidite:null, temperature:null, ec:null,
    ph:null, n:null, p:null, k:null, luminosite:null,
    updatedAt:null
  });
  // Le capteur oscille juste après le branchement — on attend 30s avant de
  // permettre l'enregistrement d'une mesure, même si l'affichage en direct
  // continue de bouger pendant ce temps.
  const [stabilizeLeft, setStabilizeLeft] = useState(0);
  const [saveMsg,       setSaveMsg]       = useState('');
  const stabilizeTimerRef = useRef(null);
  // Historique des échanges Modbus (trame envoyée / réponse reçue) — pour
  // diagnostiquer la communication avec le capteur.
  const [rawLines, setRawLines] = useState([]);

  // Météo état
  const [meteo,      setMeteo]     = useState(null);
  const [meteoLoad,  setMeteoLoad] = useState(false);
  const [meteoErr,   setMeteoErr]  = useState('');
  const [lastFetch,  setLastFetch] = useState(null);

  const readerRef  = useRef(null);
  const rxBufferRef= useRef([]); // octets bruts accumulés depuis le dernier sondage Modbus
  const pollTimerRef = useRef(null);
  const timerRef   = useRef(null);
  const coordsRef  = useRef({ lat: SITE_LAT, lng: SITE_LNG, nom: 'USSEIN Kaolack' });

  // Recharge la liste des parcelles (et, pour l'admin, les noms réels des
  // propriétaires) depuis Orion/Keycloak — sans avoir besoin de se reconnecter.
  async function reloadParcelles() {
    setParcLoading(true); setParcError('');
    try {
      const list = await listParcelles(auth.token, auth.role === 'admin' ? {} : { owner: auth.email });
      setParcelles(list);
      if (list.length > 0 && !selectedId) {
        coordsRef.current = { lat: list[0].lat, lng: list[0].lng, nom: list[0].nom };
      }
    } catch (e) {
      setParcError(e.message); /* Orion injoignable : on garde les coordonnées par défaut du site */
    } finally { setParcLoading(false); }

    if (auth.role === 'admin') {
      try {
        const users = await listAccountsAsAdmin(auth.token);
        const map = {};
        users.forEach(u => {
          if (u.email) map[u.email] = [u.prenom, u.nom].filter(Boolean).join(' ') || u.username;
        });
        setOwnerNames(map);
      } catch { /* affichage dégradé si Keycloak injoignable */ }
    }
  }

  useEffect(() => {
    reloadParcelles();
    fetchMeteo();
    timerRef.current = setInterval(fetchMeteo, 5 * 60 * 1000); // refresh 5 min
    return () => {
      clearInterval(timerRef.current);
      disconnectSerial();
    };
  }, []);

  // Changer de parcelle : on recharge son dernier relevé (ou on repart à vide),
  // on recentre la météo sur ses coordonnées, et on coupe une éventuelle
  // connexion capteur en cours (elle appartenait à l'ancienne parcelle).
  function selectParcelle(id) {
    if (id === selectedId) return;
    disconnectSerial();
    setSelectedId(id);
    const p = parcelles.find(x => x.id === id);
    if (p) {
      coordsRef.current = { lat: p.lat, lng: p.lng, nom: p.nom };
      fetchMeteo();
    }
    const saved = getSol8(id);
    setSol(saved || {
      humidite:null, temperature:null, ec:null,
      ph:null, n:null, p:null, k:null, luminosite:null,
      updatedAt:null
    });
  }

  const selectedParc = parcelles.find(p => p.id === selectedId) || null;

  function startStabilizeCountdown() {
    clearInterval(stabilizeTimerRef.current);
    setStabilizeLeft(30);
    stabilizeTimerRef.current = setInterval(() => {
      setStabilizeLeft(s => {
        if (s <= 1) { clearInterval(stabilizeTimerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function stopStabilizeCountdown() {
    clearInterval(stabilizeTimerRef.current);
    setStabilizeLeft(0);
  }

  // Enregistre un instantané de la dernière mesure affichée — la lecture en
  // direct n'est plus sauvegardée automatiquement à chaque trame reçue.
  function saveMeasure() {
    if (!selectedId || sol.humidite === null) return;
    setSol8(selectedId, { ...sol, updatedAt: new Date().toISOString() });
    pushReleve(sol, selectedId);
    setSaveMsg(`Mesure enregistrée pour « ${selectedParc?.nom} »`);
    setTimeout(() => setSaveMsg(''), 4000);
  }

  // ── MÉTÉO OpenWeatherMap ──────────────────────────────
  async function fetchMeteo() {
    const coords = coordsRef.current;
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

    if (!selectedId) {
      alert('Sélectionnez d\'abord une parcelle avant de connecter le capteur.');
      return;
    }

    if (!('serial' in navigator)) {
      alert('Web Serial API non supportée par ce navigateur.\nUtilisez Chrome ou Edge (PC/Android) pour connecter le capteur 8-en-1.');
      setSerialSt('unsupported');
      return;
    }

    try {
      setSerialSt('connecting');
      const p = await navigator.serial.requestPort();
      await p.open({ baudRate:9600, dataBits:8, stopBits:1, parity:'none' });
      setPort(p); setSerialSt('connected');
      setRawLines([]);
      startStabilizeCountdown();
      readLoop(p);
      startPolling(p);
    } catch(e) {
      // Aucune valeur inventée : sans capteur réellement branché, sol reste vide.
      setSerialSt(e.name === 'NotFoundError' ? 'disconnected' : 'error');
    }
  }

  // Écoute passive du port — accumule les octets bruts reçus. Le capteur ne
  // répond jamais de lui-même : ces octets n'arrivent qu'en réponse à une
  // trame Modbus envoyée par pollOnce().
  async function readLoop(p) {
    const reader = p.readable.getReader();
    readerRef.current = reader;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) rxBufferRef.current.push(...value);
      }
    } catch(e) {
      console.log('Serial ended:', e.message);
    } finally {
      reader.releaseLock();
      setSerialSt('disconnected');
      setPort(null);
    }
  }

  // Interroge le capteur en Modbus RTU (comme collecte_capteur.py) : envoie la
  // commande de lecture des 7 registres, attend la réponse, puis décode
  // Humidité/Température/EC/pH/N/P/K depuis les octets bruts.
  async function pollOnce(p) {
    if (!p || !p.writable) return;
    rxBufferRef.current = [];
    try {
      const writer = p.writable.getWriter();
      try { await writer.write(MODBUS_CMD); } finally { writer.releaseLock(); }
    } catch (e) { return; }

    await new Promise(r => setTimeout(r, 700));

    const bytes = rxBufferRef.current.slice();
    const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ts = new Date().toLocaleTimeString('fr-FR');
    setRawLines(prev => [
      ...prev,
      `[${ts}] TX: 01 03 00 00 00 07 04 08  →  RX (${bytes.length} octet${bytes.length>1?'s':''}): ${hex || '(aucune réponse)'}`,
    ].slice(-12));

    if (bytes.length >= 17 && bytes[0] === 0x01 && bytes[1] === 0x03) {
      const humidite    = ((bytes[3] << 8) | bytes[4]) / 10;
      const temperature = ((bytes[5] << 8) | bytes[6]) / 10;
      const ec          = (bytes[7] << 8) | bytes[8];
      const ph          = ((bytes[9] << 8) | bytes[10]) / 10;
      const n           = (bytes[11] << 8) | bytes[12];
      const pVal        = (bytes[13] << 8) | bytes[14];
      const k           = (bytes[15] << 8) | bytes[16];
      setSol(prev => ({ ...prev, humidite, temperature, ec, ph, n, p: pVal, k, updatedAt: new Date().toLocaleTimeString('fr-FR') }));
    }
  }

  function startPolling(p) {
    clearInterval(pollTimerRef.current);
    pollOnce(p);
    pollTimerRef.current = setInterval(() => pollOnce(p), 4000);
  }

  function stopPolling() {
    clearInterval(pollTimerRef.current);
  }

  async function disconnectSerial() {
    try {
      if (readerRef.current) { await readerRef.current.cancel(); readerRef.current = null; }
      if (port) { await port.close(); setPort(null); }
    } catch(e) {}
    setSerialSt('disconnected');
    stopStabilizeCountdown();
    stopPolling();
  }

  function windDir(deg) {
    const dirs = ['N','NE','E','SE','S','SO','O','NO'];
    return dirs[Math.round(deg / 45) % 8];
  }

  const serialLabel = {
    disconnected: <><IconPlug size={16}/> Connecter le capteur 8-en-1</>,
    connecting:   <><IconLoader size={16} className="spin"/> Connexion...</>,
    connected:    <><IconCheck size={16}/> Connecté — Cliquer pour déconnecter</>,
    unsupported:  <><IconX size={16}/> Navigateur non compatible (Chrome/Edge requis)</>,
    error:        <><IconX size={16}/> Erreur de connexion — Réessayer</>,
  }[serialSt];

  const serialColor = {
    disconnected: 'var(--water)',
    connecting:   'var(--warning)',
    connected:    'var(--accent)',
    unsupported:  'var(--critical)',
    error:        'var(--critical)',
  }[serialSt];

  return (
    <div className="cap-wrap">

      {/* ── MÉTÉO ── */}
      <div className="cap-section">
        <div className="cap-section-header">
          <div className="cap-section-title"><IconCloud size={17}/> Météo en temps réel — OpenWeatherMap</div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            {lastFetch && <span className="cap-ts">Mis à jour : {lastFetch}</span>}
            <button className="btn-refresh" onClick={fetchMeteo} disabled={meteoLoad}>
              <IconRefresh size={14} className={meteoLoad ? 'spin' : ''}/> Actualiser
            </button>
          </div>
        </div>
        {meteoErr && <div className="cap-warn"><IconAlertTriangle size={15}/> {meteoErr} — données de démonstration affichées</div>}
        {meteo && (
          <>
            <div className="meteo-top">
              <div className="meteo-main">
                <img src={`https://openweathermap.org/img/wn/${meteo.icon}@2x.png`}
                  alt={meteo.desc} className="meteo-icon" onError={e=>e.target.style.display='none'}/>
                <div>
                  <div className="meteo-temp">{meteo.temp.toFixed(1)}°C</div>
                  <div className="meteo-desc">{meteo.desc}</div>
                  <div className="meteo-loc"><IconMapPin size={12}/> {meteo.site}</div>
                </div>
              </div>
              <div className="meteo-feels">
                <div className="mf-val">{meteo.feels.toFixed(1)}°C</div>
                <div className="mf-lbl">Ressenti</div>
              </div>
            </div>
            <div className="meteo-grid">
              {[
                { Icon:IconThermometer, lbl:'Tmax',      val:meteo.temp_max.toFixed(1)+'°C', cls:'' },
                { Icon:IconThermometer, lbl:'Tmin',      val:meteo.temp_min.toFixed(1)+'°C', cls:'' },
                { Icon:IconDroplet,     lbl:'Hum. air',  val:meteo.humidite+'%',             cls:statusClass(meteo.humidite,30,80) },
                { Icon:IconWind,        lbl:'Vent',       val:meteo.vent+' m/s '+windDir(meteo.vent_dir), cls:'' },
                { Icon:IconGauge,       lbl:'Pression',   val:meteo.pression+' hPa',         cls:'' },
                { Icon:IconCloud,       lbl:'Nuages',     val:meteo.nuage+'%',               cls:'' },
                { Icon:IconCloudRain,   lbl:'Pluie 1h',  val:meteo.pluie+' mm',             cls:'' },
                { Icon:IconEye,         lbl:'Visibilité', val:meteo.visib+' km',             cls:'' },
              ].map(m => (
                <div key={m.lbl} className="meteo-card">
                  <div className="mc-icon"><m.Icon size={18}/></div>
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
          <div className="cap-section-title"><IconAntenna size={17}/> Capteur 8-en-1 — Sol (USB-C Web Serial)</div>
          {sol.updatedAt && <span className="cap-ts">Dernière lecture : {sol.updatedAt}</span>}
        </div>

        {/* Sélection de la parcelle — obligatoire avant toute connexion, pour
            que chaque parcelle/culture garde ses propres données de sol. */}
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'8px'}}>
          <button className="btn-refresh" onClick={reloadParcelles} disabled={parcLoading} title="Recharger la liste des parcelles sans se reconnecter">
            <IconRefresh size={14} className={parcLoading ? 'spin' : ''}/> Actualiser les parcelles
          </button>
        </div>
        {parcError && <div className="cap-warn"><IconAlertTriangle size={15}/> {parcError}</div>}
        {parcLoading ? (
          <div className="serial-hint"><IconLoader size={15} className="spin"/> Chargement des parcelles…</div>
        ) : parcelles.length === 0 ? (
          <div className="cap-warn"><IconAlertTriangle size={15}/> Aucune parcelle. Créez d'abord une parcelle dans "Parcelles".</div>
        ) : (
          <div className="parc-select-grid" style={{marginBottom:'14px'}}>
            {parcelles.map(p => (
              <div key={p.id}
                className={`parc-select-item ${selectedId===p.id?'active':''}`}
                onClick={() => selectParcelle(p.id)}>
                <span className="psi-icon">{CULTURES[p.culture]?.icon||'🌱'}</span>
                <div>
                  <div className="psi-nom">{p.nom}</div>
                  <div className="psi-sub">
                    {p.culture}
                    {auth.role === 'admin' && <> · <IconUser size={11}/> {ownerNames[p.owner] || p.ownerName || p.owner || 'Propriétaire inconnu'}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn-serial"
          style={{background:serialColor}}
          onClick={connectSerial}
          disabled={serialSt==='connecting' || !selectedId}>
          {!selectedId ? <><IconMapPin size={16}/> Sélectionnez une parcelle ci-dessus</> : serialLabel}
        </button>

        {serialSt === 'disconnected' && selectedId && (
          <div className="serial-hint">
            <IconInfo size={15}/> Branchez le capteur 8-en-1 via USB-C puis cliquez "Connecter".<br/>
            Compatible Chrome et Edge sur PC et Android.
            <br/>Les mesures seront rattachées à la parcelle « {selectedParc?.nom} »
            ({selectedParc?.culture}{auth.role === 'admin' && selectedParc
              ? <> · <IconUser size={11}/> {ownerNames[selectedParc.owner] || selectedParc.ownerName || selectedParc.owner}</>
              : ''}).
          </div>
        )}

        {serialSt === 'connected' && stabilizeLeft > 0 && (
          <div className="serial-hint stabilizing">
            <IconLoader size={15} className="spin"/> Stabilisation du capteur en cours — encore {stabilizeLeft}s.
            Les valeurs ci-dessous bougent, c'est normal : attendez la fin du compte à rebours avant d'enregistrer une mesure.
          </div>
        )}

        {serialSt === 'connected' && stabilizeLeft === 0 && sol.humidite !== null && (
          <div className="serial-hint ready">
            <IconCheck size={15}/> Mesures stabilisées — les valeurs continuent de se mettre à jour en direct avec le capteur.
            Cliquez "Enregistrer" pour sauvegarder la dernière lecture.
          </div>
        )}

        {serialSt === 'connected' && stabilizeLeft === 0 && sol.humidite === null && (
          <div className="cap-warn">
            <IconAlertTriangle size={15}/> Le capteur est interrogé toutes les 4s (protocole Modbus) mais ne répond pas exploitablement.
            Regardez le panneau de communication ci-dessous pour voir ce qui est envoyé/reçu.
          </div>
        )}

        {serialSt === 'connected' && (
          <button className="btn-save-measure" onClick={saveMeasure} disabled={stabilizeLeft > 0 || sol.humidite === null}>
            <IconCheck size={15}/> Enregistrer cette mesure
          </button>
        )}
        {saveMsg && <div className="cap-success"><IconCheck size={15}/> {saveMsg}</div>}

        {rawLines.length > 0 && (
          <details className="raw-debug" open={serialSt === 'connected' && sol.humidite === null}>
            <summary><IconSearch size={14}/> Communication Modbus avec le capteur ({rawLines.length})</summary>
            <pre className="raw-lines">{rawLines.join('\n')}</pre>
          </details>
        )}

        <div className="sol-grid">

          {/* Humidité sol */}
          <div className="sol-card">
            <div className="sc-header">
              <span className="sc-icon"><IconDroplet size={17}/></span>
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
              <span className="sc-icon"><IconThermometer size={17}/></span>
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
              <span className="sc-icon"><IconFlask size={17}/></span>
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
              <span className="sc-icon"><IconZap size={17}/></span>
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
            { key:'n', lbl:'Azote N',     unit:'mg/kg', min:50, max:200, color:'npk-n' },
            { key:'p', lbl:'Phosphore P', unit:'mg/kg', min:20, max:80,  color:'npk-p' },
            { key:'k', lbl:'Potassium K', unit:'mg/kg', min:60, max:200, color:'npk-k' },
          ].map(el => (
            <div key={el.key} className="sol-card">
              <div className="sc-header">
                <span className="sc-icon"><IconSprout size={17}/></span>
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
              <span className="sc-icon"><IconSun size={17}/></span>
              <span className="sc-title">Luminosité</span>
            </div>
            <div className="sc-val val-neutral">
              {sol.luminosite !== null ? sol.luminosite+' lux' : '—'}
            </div>
            <div className="sc-bar">
              <div className="sc-fill lux" style={{width:gauge(sol.luminosite,0,2000)+'%'}}/>
            </div>
            <div className="sc-range">Plein soleil : &gt;1000 lux</div>
          </div>

        </div>

        {/* Alerte NPK */}
        {sol.n !== null && (
          <div className="npk-alert-wrap">
            <div className="npk-alert-title"><IconFlask size={15}/> Analyse NPK vs valeurs optimales (FAO AGRIS)</div>
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
                            {deficit > 0
                              ? <><IconArrowDown size={11}/> -{deficit}</>
                              : deficit < 0
                                ? <><IconArrowUp size={11}/> +{Math.abs(deficit)}</>
                                : <IconCheck size={11}/>}
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
