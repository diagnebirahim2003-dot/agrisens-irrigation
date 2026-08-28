import { useState, useEffect } from 'react';
import './Calculs.css';

// ═══════════════════════════════════════════════════
// PARAMÈTRES AGRONOMIQUES (sources: Protocole + FAO-56 + FAO AGRIS)
// ═══════════════════════════════════════════════════
const OWM_KEY = 'f376f93aee61a823a4c0eff15e47b0a0';
const SITE    = { lat: 14.15, lng: -16.07, alt: 3, KRs: 0.16 };
const SOL     = { Hcc: 28, Hpf: 16, Da: 1.35, f: 0.50 };

const CULTURES = {
  Laitue: {
    icon:'🥬', cycle:55,
    Kc: [0.70, 1.05, 0.95],
    L:  [10, 15, 15, 15],
    Zr: 0.30, p: 0.30,
    NPK:{ N:150, P:40, K:120 },
  },
  Navet: {
    icon:'🌿', cycle:55,
    Kc: [0.70, 1.00, 0.95],
    L:  [10, 15, 15, 15],
    Zr: 0.50, p: 0.50,
    NPK:{ N:100, P:30, K:100 },
  },
  Gombo: {
    icon:'🫛', cycle:100,
    Kc: [0.40, 1.00, 0.75],
    L:  [20, 20, 30, 30],
    Zr: 0.60, p: 0.50,
    NPK:{ N:120, P:60, K:150 },
  },
};

// ═══════════════════════════════════════════════════
// FONCTIONS DE CALCUL (Chapitre 3 mémoire + FAO-56)
// ═══════════════════════════════════════════════════

function getDOY() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now - start) / 86400000);
}

function getDAS(semis) {
  if (!semis) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(semis)) / 86400000));
}

function getKc(culture, das) {
  const c = CULTURES[culture];
  if (!c) return 0.75;
  const [Li, Ld, Lm, Ll] = c.L;
  const [Ki, Km, Ke]     = c.Kc;
  if (das <= Li)          return Ki;
  if (das <= Li+Ld)       return Ki + (Km-Ki)*(das-Li)/Ld;
  if (das <= Li+Ld+Lm)    return Km;
  if (das <= Li+Ld+Lm+Ll) return Km + (Ke-Km)*(das-Li-Ld-Lm)/Ll;
  return Ke;
}

function getStage(culture, das) {
  const c = CULTURES[culture];
  if (!c) return 'Inconnu';
  const [Li, Ld, Lm] = c.L;
  if (das <= Li)       return 'Initial';
  if (das <= Li+Ld)    return 'Développement';
  if (das <= Li+Ld+Lm) return 'Mi-saison';
  if (das <= c.cycle)  return 'Fin de saison';
  return 'Récolte';
}

// Ra extraterrestre (MJ/m²/j)
function calcRa(lat, doy) {
  const phi = lat * Math.PI / 180;
  const dr  = 1 + 0.033 * Math.cos(2*Math.PI/365*doy);
  const dec = 0.409 * Math.sin(2*Math.PI/365*doy - 1.39);
  const ws  = Math.acos(-Math.tan(phi)*Math.tan(dec));
  return 24*60/Math.PI * 0.0820 * dr *
    (ws*Math.sin(phi)*Math.sin(dec) + Math.cos(phi)*Math.cos(dec)*Math.sin(ws));
}

// Rs — Hargreaves (Chapitre 3 mémoire: KRs=0.16)
function calcRs(Tmax, Tmin, Ra) {
  return SITE.KRs * Math.sqrt(Math.max(0, Tmax - Tmin)) * Ra;
}

// ETo — Penman-Monteith FAO-56 (Chapitre 3 mémoire)
function calcETo(Tmax, Tmin, HR, u10, Rs, lat, doy) {
  const T   = (Tmax + Tmin) / 2;
  const u2  = u10 * 0.748;                              // vent à 2m
  const P   = 101.3 * Math.pow((293 - 0.0065*SITE.alt)/293, 5.26);
  const gam = 0.000665 * P;                             // constante psychrométrique
  const es  = t => 0.6108 * Math.exp(17.27*t/(t+237.3));
  const esTm= (es(Tmax)+es(Tmin))/2;
  const ea  = (HR/100) * esTm;                          // ea simplifié (mémoire)
  const Del = 4098*es(T)/Math.pow(T+237.3,2);

  // Rns (mémoire: 0.77×Rs)
  const Rns = 0.77 * Rs;
  // Rso (mémoire: 0.75×Ra)
  const Rso = 0.75 * Ra;
  const Rs_ = Math.min(Rs, Rso);
  // Rnl
  const Rnl = 4.903e-9 *
    ((Math.pow(Tmax+273.16,4)+Math.pow(Tmin+273.16,4))/2) *
    (0.34 - 0.14*Math.sqrt(Math.max(0,ea))) *
    (1.35*Rs_/Rso - 0.35);
  const Rn = Rns - Rnl;
  const G  = 0;

  const ETo = (0.408*Del*(Rn-G) + gam*(900/(T+273))*u2*(esTm-ea)) /
              (Del + gam*(1+0.34*u2));
  return Math.max(0, ETo);
}

// P ajusté (mémoire: p_table + 0.04×(5-ETc), limité [0.1, 0.8])
function calcPajuste(p_table, ETc) {
  return Math.min(0.8, Math.max(0.1, p_table + 0.04*(5-ETc)));
}

// RU = (Hcc-Hpf)/100 × Da × Zr × 1000
function calcRU(Zr) {
  return (SOL.Hcc - SOL.Hpf) / 100 * SOL.Da * Zr * 1000;
}

// Seuil critique: Sc = Hcc - RFU (mémoire)
function calcSc(RFU) {
  return SOL.Hcc - RFU;
}

// Di = ETc × superficie_plot (mémoire: plot 2m²)
function calcDi(ETc, superficie) {
  return ETc * superficie;
}

// ═══════════════════════════════════════════════════
// COMPOSANT
// ═══════════════════════════════════════════════════
export default function Calculs({ auth }) {
  const [parcelles, setParcelles] = useState([]);
  const [selected,  setSelected]  = useState('');
  const [meteo,     setMeteo]     = useState(null);
  const [sol8,      setSol8]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(null);

  useEffect(() => {
    const all = JSON.parse(localStorage.getItem('agrisens_parcelles') || '[]');
    const mine = auth.role === 'admin' ? all : all.filter(p => p.owner === auth.email);
    setParcelles(mine);
    if (mine.length > 0) setSelected(mine[0].id);
  }, []);

  useEffect(() => {
    const s8 = JSON.parse(localStorage.getItem('agrisens_sol8') || 'null');
    if (s8) setSol8(s8);
  }, []);

  async function fetchMeteo(lat, lng) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM_KEY}&units=metric&lang=fr`;
    const res = await fetch(url);
    const d   = await res.json();
    if (!res.ok) throw new Error(d.message || 'Erreur OpenWeatherMap');
    return {
      Tmax: d.main.temp_max,
      Tmin: d.main.temp_min,
      HR:   d.main.humidity,
      u10:  d.wind.speed,
      desc: d.weather[0].description,
      ville:d.name,
    };
  }

  async function lancerCalcul() {
    const parc = parcelles.find(p => p.id === selected);
    if (!parc) { setError('Sélectionnez une parcelle.'); return; }
    setLoading(true); setError(''); setResult(null);

    try {
      // Météo OpenWeatherMap
      const wx  = await fetchMeteo(parc.lat, parc.lng);
      setMeteo(wx);

      const doy = getDOY();
      const das = getDAS(parc.semis);
      const c   = CULTURES[parc.culture];
      if (!c) throw new Error('Culture non reconnue');

      // Calculs
      const Ra    = calcRa(parc.lat, doy);
      const Rs    = calcRs(wx.Tmax, wx.Tmin, Ra);
      const ETo   = calcETo(wx.Tmax, wx.Tmin, wx.HR, wx.u10, Rs, parc.lat, doy);
      const Kc    = getKc(parc.culture, das);
      const ETc   = Kc * ETo;
      const RU    = calcRU(c.Zr);
      const Pajus = calcPajuste(c.p, ETc);
      const RFU   = Pajus * RU;
      const Sc    = calcSc(RFU);
      const Di    = calcDi(ETc, 2); // plot 2m²
      const stage = getStage(parc.culture, das);

      // Déficit NPK (si données capteur 8-en-1 disponibles)
      const npkDef = sol8 ? {
        N: Math.max(0, c.NPK.N - (sol8.n || 0)),
        P: Math.max(0, c.NPK.P - (sol8.p || 0)),
        K: Math.max(0, c.NPK.K - (sol8.k || 0)),
      } : null;

      // Recommandation
      const humSol = sol8?.humidite ?? null;
      let reco, recoClass;
      if (humSol !== null) {
        const stock = humSol;
        if (stock < Sc)        { reco = '🚨 IRRIGATION URGENTE'; recoClass = 'danger'; }
        else if (stock < SOL.Hcc) { reco = '⚠️ IRRIGATION RECOMMANDÉE'; recoClass = 'warn'; }
        else                   { reco = '✅ SOL BIEN HYDRATÉ'; recoClass = 'ok'; }
      } else {
        reco = '📡 Connecter le capteur 8-en-1 pour recommandation';
        recoClass = 'info';
      }

      setResult({ wx, Ra, Rs, ETo, Kc, ETc, RU, Pajus, RFU, Sc, Di,
                  das, stage, parc, npkDef, reco, recoClass, humSol });
    } catch(e) {
      setError('Erreur : ' + e.message);
    } finally { setLoading(false); }
  }

  const parc = parcelles.find(p => p.id === selected);

  return (
    <div className="calc-wrap">
      <div className="calc-header">
        <div className="calc-title">🧮 Calculs agronomiques</div>
        <div className="calc-sub">ETo · ETc · RU · RFU · Sc · Di — Méthode FAO-56 Penman-Monteith</div>
      </div>

      {/* Sélection parcelle */}
      <div className="calc-card">
        <div className="cc-title">📍 Sélection de la parcelle</div>
        {parcelles.length === 0 ? (
          <div className="calc-empty">Aucune parcelle. Créez une parcelle d'abord.</div>
        ) : (
          <div className="parc-select-grid">
            {parcelles.map(p => (
              <div key={p.id}
                className={`parc-select-item ${selected===p.id?'active':''}`}
                onClick={() => { setSelected(p.id); setResult(null); }}>
                <span className="psi-icon">{CULTURES[p.culture]?.icon||'🌱'}</span>
                <div>
                  <div className="psi-nom">{p.nom}</div>
                  <div className="psi-sub">{p.culture} · {getDAS(p.semis)} JAS</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {parc && (
          <button className="btn-calc" onClick={lancerCalcul} disabled={loading}>
            {loading ? '⏳ Calcul en cours…' : '⚡ Lancer les calculs'}
          </button>
        )}
        {error && <div className="calc-error">{error}</div>}
      </div>

      {/* RÉSULTATS */}
      {result && (
        <>
          {/* Météo */}
          <div className="calc-card">
            <div className="cc-title">🌤️ Données météo — OpenWeatherMap · {result.wx.ville}</div>
            <div className="res-grid">
              <div className="res-item"><div className="ri-val">{result.wx.Tmax.toFixed(1)}°C</div><div className="ri-lbl">Tmax</div></div>
              <div className="res-item"><div className="ri-val">{result.wx.Tmin.toFixed(1)}°C</div><div className="ri-lbl">Tmin</div></div>
              <div className="res-item"><div className="ri-val">{result.wx.HR}%</div><div className="ri-lbl">Humidité air</div></div>
              <div className="res-item"><div className="ri-val">{result.wx.u10} m/s</div><div className="ri-lbl">Vent (u10)</div></div>
              <div className="res-item"><div className="ri-val">{(result.wx.u10*0.748).toFixed(2)} m/s</div><div className="ri-lbl">Vent (u2)</div></div>
              <div className="res-item"><div className="ri-val">{result.wx.desc}</div><div className="ri-lbl">Conditions</div></div>
            </div>
          </div>

          {/* Calculs ETo */}
          <div className="calc-card">
            <div className="cc-title">☀️ Rayonnement et ETo — Hargreaves + Penman-Monteith</div>
            <div className="res-grid">
              <div className="res-item"><div className="ri-val amber">{result.Ra.toFixed(2)}</div><div className="ri-lbl">Ra (MJ/m²/j)</div><div className="ri-form">Extraterrestre</div></div>
              <div className="res-item"><div className="ri-val amber">{result.Rs.toFixed(2)}</div><div className="ri-lbl">Rs (MJ/m²/j)</div><div className="ri-form">0,16×√(Tmax-Tmin)×Ra</div></div>
              <div className="res-item"><div className="ri-val amber">{(0.77*result.Rs).toFixed(2)}</div><div className="ri-lbl">Rns (MJ/m²/j)</div><div className="ri-form">0,77 × Rs</div></div>
              <div className="res-item"><div className="ri-val amber">{(0.75*result.Ra).toFixed(2)}</div><div className="ri-lbl">Rso (MJ/m²/j)</div><div className="ri-form">0,75 × Ra</div></div>
              <div className="res-item highlight"><div className="ri-val green">{result.ETo.toFixed(3)}</div><div className="ri-lbl">ETo (mm/j)</div><div className="ri-form">Penman-Monteith FAO-56</div></div>
            </div>
          </div>

          {/* ETc + Kc */}
          <div className="calc-card">
            <div className="cc-title">🌱 Évapotranspiration culture — {result.parc.culture} {CULTURES[result.parc.culture]?.icon}</div>
            <div className="res-grid">
              <div className="res-item"><div className="ri-val">{result.das} j</div><div className="ri-lbl">DAS</div><div className="ri-form">Jours après semis</div></div>
              <div className="res-item"><div className="ri-val">{result.stage}</div><div className="ri-lbl">Stade</div><div className="ri-form">Phénologique</div></div>
              <div className="res-item highlight"><div className="ri-val green">{result.Kc.toFixed(3)}</div><div className="ri-lbl">Kc</div><div className="ri-form">Coeff. cultural FAO</div></div>
              <div className="res-item highlight"><div className="ri-val green">{result.ETc.toFixed(3)}</div><div className="ri-lbl">ETc (mm/j)</div><div className="ri-form">Kc × ETo</div></div>
            </div>
          </div>

          {/* RU / RFU / Sc / Di */}
          <div className="calc-card">
            <div className="cc-title">💧 Bilan hydrique — Sol limono-argileux (Hcc=28%, Hpf=16%)</div>
            <div className="res-grid">
              <div className="res-item"><div className="ri-val blue">{result.RU.toFixed(1)}</div><div className="ri-lbl">RU (mm)</div><div className="ri-form">(Hcc-Hpf)/100×Da×Zr×1000</div></div>
              <div className="res-item"><div className="ri-val blue">{result.Pajus.toFixed(2)}</div><div className="ri-lbl">p ajusté</div><div className="ri-form">p + 0,04×(5-ETc)</div></div>
              <div className="res-item highlight"><div className="ri-val blue">{result.RFU.toFixed(1)}</div><div className="ri-lbl">RFU (mm)</div><div className="ri-form">p_ajusté × RU</div></div>
              <div className="res-item"><div className="ri-val red">{result.Sc.toFixed(1)}%</div><div className="ri-lbl">Sc — Seuil critique</div><div className="ri-form">Hcc − RFU</div></div>
              <div className="res-item highlight"><div className="ri-val green">{result.Di.toFixed(2)}</div><div className="ri-lbl">Di (mm/plot)</div><div className="ri-form">ETc × 2 m²</div></div>
            </div>
          </div>

          {/* Déficit NPK */}
          {result.npkDef ? (
            <div className="calc-card">
              <div className="cc-title">🌿 Déficit nutritif NPK — Capteur 8-en-1</div>
              <div className="res-grid">
                {['N','P','K'].map(el => (
                  <div key={el} className={`res-item ${result.npkDef[el]>0?'alerte':''}`}>
                    <div className={`ri-val ${result.npkDef[el]>0?'red':'green'}`}>
                      {result.npkDef[el]>0 ? '-'+result.npkDef[el].toFixed(1) : 'OK'}
                    </div>
                    <div className="ri-lbl">Déficit {el} (mg/kg)</div>
                    <div className="ri-form">
                      Optimal: {CULTURES[result.parc.culture]?.NPK[el]} mg/kg
                    </div>
                  </div>
                ))}
              </div>
              <div className="npk-sources">
                Source : FAO AGRIS — valeurs optimales pour {result.parc.culture}
              </div>
            </div>
          ) : (
            <div className="calc-card info-card">
              <div className="cc-title">🌿 Déficit nutritif NPK</div>
              <div className="calc-empty">
                📡 Connectez le capteur 8-en-1 pour calculer les déficits N, P, K.<br/>
                Valeurs optimales : N={CULTURES[result.parc.culture]?.NPK.N} · 
                P={CULTURES[result.parc.culture]?.NPK.P} · 
                K={CULTURES[result.parc.culture]?.NPK.K} mg/kg
              </div>
            </div>
          )}

          {/* RECOMMANDATION */}
          <div className={`reco-card reco-${result.recoClass}`}>
            <div className="reco-icon">
              {result.recoClass==='danger'?'🚨':result.recoClass==='warn'?'⚠️':result.recoClass==='ok'?'✅':'📡'}
            </div>
            <div>
              <div className="reco-title">{result.reco}</div>
              {result.humSol !== null && (
                <div className="reco-detail">
                  Humidité sol mesurée : <b>{result.humSol}%</b> · 
                  Seuil critique Sc : <b>{result.Sc.toFixed(1)}%</b> · 
                  Dose recommandée Di : <b>{result.Di.toFixed(2)} mm/plot</b>
                </div>
              )}
              <div className="reco-detail">
                ETo={result.ETo.toFixed(2)} mm/j · 
                Kc={result.Kc.toFixed(2)} · 
                ETc={result.ETc.toFixed(2)} mm/j · 
                RFU={result.RFU.toFixed(1)} mm
              </div>
            </div>
          </div>

          {/* Détail formules */}
          <div className="calc-card formules-card">
            <div className="cc-title">📐 Récapitulatif des formules utilisées</div>
            <div className="formule-list">
              <div className="formule-item"><span className="f-name">Rs</span><span className="f-eq">= 0,16 × √(Tmax−Tmin) × Ra</span><span className="f-src">Hargreaves, Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Rns</span><span className="f-eq">= 0,77 × Rs</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Rso</span><span className="f-eq">= 0,75 × Ra</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">ea</span><span className="f-eq">= (HR/100) × es</span><span className="f-src">Chap.3 mémoire (simplifié)</span></div>
              <div className="formule-item"><span className="f-name">ETo</span><span className="f-eq">= Penman-Monteith FAO-56</span><span className="f-src">FAO-56 Eq.6</span></div>
              <div className="formule-item"><span className="f-name">ETc</span><span className="f-eq">= Kc × ETo</span><span className="f-src">FAO-56</span></div>
              <div className="formule-item"><span className="f-name">RU</span><span className="f-eq">= (Hcc−Hpf)/100 × Da × Zr × 1000</span><span className="f-src">FAO-56 Eq.82</span></div>
              <div className="formule-item"><span className="f-name">p</span><span className="f-eq">= p_table + 0,04×(5−ETc)</span><span className="f-src">FAO-56 T.22, Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">RFU</span><span className="f-eq">= p_ajusté × RU</span><span className="f-src">FAO-56 Eq.83</span></div>
              <div className="formule-item"><span className="f-name">Sc</span><span className="f-eq">= Hcc − RFU</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Di</span><span className="f-eq">= ETc × superficie_plot</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Déficit NPK</span><span className="f-eq">= Valeur_optimale − Valeur_capteur</span><span className="f-src">Protocole + FAO AGRIS</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
