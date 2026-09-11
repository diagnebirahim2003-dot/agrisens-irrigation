import { useState, useEffect } from 'react';
import { getSol } from '../utils/sols';
import { getCultures } from '../utils/cultures';
import { listParcelles } from '../utils/orion';
import { getSol8 } from '../utils/historique';
import {
  getDOY, getDAS, getKc, getStage, calcRa, calcRs, calcETo, u2FromU10,
  calcPajuste, calcRU, calcSc, calcSa, calcDi,
} from '../utils/agro';
import './Calculs.css';

// ═══════════════════════════════════════════════════
// PARAMÈTRES AGRONOMIQUES (sources: Protocole + FAO-56 + FAO AGRIS)
// ═══════════════════════════════════════════════════
const OWM_KEY = 'f376f93aee61a823a4c0eff15e47b0a0';

// ═══════════════════════════════════════════════════
// COMPOSANT
// ═══════════════════════════════════════════════════
export default function Calculs({ auth }) {
  const CULTURES = getCultures();
  const [parcelles,  setParcelles]  = useState([]);
  const [parcLoading,setParcLoading]= useState(true);
  const [parcError,  setParcError]  = useState('');
  const [selected,  setSelected]  = useState('');
  const [meteo,     setMeteo]     = useState(null);
  const [sol8,      setSol8]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState(null);

  // Recharge la liste des parcelles depuis Orion — sans avoir besoin de se
  // reconnecter (utile quand une parcelle vient d'être ajoutée/modifiée).
  async function reloadParcelles() {
    setParcLoading(true); setParcError('');
    try {
      const mine = await listParcelles(auth.token, auth.role === 'admin' ? {} : { owner: auth.email });
      setParcelles(mine);
      if (mine.length > 0 && !selected) setSelected(mine[0].id);
    } catch (e) {
      setParcError(e.message);
    } finally { setParcLoading(false); }
  }

  useEffect(() => { reloadParcelles(); }, []);

  // Le relevé capteur 8-en-1 est propre à chaque parcelle — on le recharge
  // à chaque changement de sélection, plutôt qu'une unique clé globale.
  useEffect(() => {
    setSol8(selected ? getSol8(selected) : null);
  }, [selected]);

  async function fetchMeteo(lat, lng) {
    // L'endpoint "météo actuelle" renvoie souvent temp_min = temp_max pour les
    // villes sans plusieurs stations (ex. Kaolack) — on utilise les prévisions
    // 3h pour calculer un vrai Tmax/Tmin sur la journée en cours.
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${OWM_KEY}&units=metric&lang=fr`;
    const res = await fetch(url);
    const d   = await res.json();
    if (!res.ok) throw new Error(d.message || 'Erreur OpenWeatherMap');

    // Prochaines 72h (24 créneaux de 3h) plutôt qu'un filtre par jour calendaire :
    // en fin de journée, il ne reste parfois qu'un seul créneau "aujourd'hui"
    // dans les prévisions (les créneaux passés ont disparu de la liste), ce qui
    // donnait Tmax = Tmin = cette unique valeur.
    const points = d.list.slice(0, 24);
    const temps  = points.map(p => p.main.temp);
    const first  = points[0];

    return {
      Tmax: Math.max(...temps),
      Tmin: Math.min(...temps),
      HR:   first.main.humidity,
      u10:  first.wind.speed,
      desc: first.weather[0].description,
      ville:d.city.name,
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
      const sol = getSol(parc.sol); // sol réellement choisi pour cette parcelle

      // Calculs
      const Ra    = calcRa(parc.lat, doy);
      const Rs    = calcRs(wx.Tmax, wx.Tmin, Ra);
      const ETo   = calcETo(wx.Tmax, wx.Tmin, wx.HR, u2FromU10(wx.u10), Rs, Ra);
      const Kc    = getKc(CULTURES, parc.culture, das);
      const ETc   = Kc * ETo;
      const RU    = calcRU(sol.cc, sol.pf, c.Zr);
      const Pajus = calcPajuste(c.p, ETc);
      const RFU   = Pajus * RU;
      const Sc    = calcSc(sol.cc, c.Zr, RFU);
      const Di    = calcDi(ETc, 2); // plot 2m²
      const stage = getStage(CULTURES, parc.culture, das);

      // Déficit NPK (si données capteur 8-en-1 disponibles)
      const npkDef = sol8 ? {
        N: Math.max(0, c.NPK.N - (sol8.n || 0)),
        P: Math.max(0, c.NPK.P - (sol8.p || 0)),
        K: Math.max(0, c.NPK.K - (sol8.k || 0)),
      } : null;

      // Recommandation — Sa vs Sc, règle à 2 branches (RG-I4, Chapitre III/IV mémoire)
      const humSol = sol8?.humidite ?? null;
      const Sa     = humSol !== null ? calcSa(humSol, c.Zr) : null;
      let reco, recoClass;
      if (Sa !== null) {
        if (Sa < Sc) { reco = '🚨 IRRIGATION DÉCLENCHÉE'; recoClass = 'danger'; }
        else         { reco = '✅ STOCK SUFFISANT — AUCUN ARROSAGE'; recoClass = 'ok'; }
      } else {
        reco = '📡 Connecter le capteur 8-en-1 pour recommandation';
        recoClass = 'info';
      }

      setResult({ wx, Ra, Rs, ETo, Kc, ETc, RU, Pajus, RFU, Sc, Di, sol,
                  das, stage, parc, npkDef, reco, recoClass, humSol, Sa });
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
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px'}}>
          <div className="cc-title" style={{marginBottom:0}}>📍 Sélection de la parcelle</div>
          <button className="btn-refresh" onClick={reloadParcelles} disabled={parcLoading} title="Recharger sans se reconnecter">
            {parcLoading ? '⏳' : '🔄'} Actualiser
          </button>
        </div>
        {parcError && <div className="calc-error">{parcError}</div>}
        {parcLoading ? (
          <div className="calc-empty">⏳ Chargement des parcelles (Orion via Wilma)…</div>
        ) : parcelles.length === 0 ? (
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
            <div className="cc-title">💧 Bilan hydrique — Sol {result.parc.sol} de la parcelle (Hcc={result.sol.cc}%, Hpf={result.sol.pf}%)</div>
            <div className="res-grid">
              <div className="res-item"><div className="ri-val blue">{result.RU.toFixed(1)}</div><div className="ri-lbl">RU (mm)</div><div className="ri-form">(Hcc-Hpf)/100×Da×Zr×1000</div></div>
              <div className="res-item"><div className="ri-val blue">{result.Pajus.toFixed(2)}</div><div className="ri-lbl">p ajusté</div><div className="ri-form">p + 0,04×(5-ETc)</div></div>
              <div className="res-item highlight"><div className="ri-val blue">{result.RFU.toFixed(1)}</div><div className="ri-lbl">RFU (mm)</div><div className="ri-form">p_ajusté × RU</div></div>
              <div className="res-item"><div className="ri-val red">{result.Sc.toFixed(1)}</div><div className="ri-lbl">Sc (mm) — Seuil critique</div><div className="ri-form">Hcc/100×Zr×1000 − RFU</div></div>
              {result.Sa !== null && (
                <div className="res-item highlight"><div className="ri-val blue">{result.Sa.toFixed(1)}</div><div className="ri-lbl">Sa (mm) — Stock actuel</div><div className="ri-form">θactuel × Zr × 1000</div></div>
              )}
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
                  Stock actuel Sa : <b>{result.Sa.toFixed(1)} mm</b> ·
                  Seuil critique Sc : <b>{result.Sc.toFixed(1)} mm</b> ·
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
              <div className="formule-item"><span className="f-name">RU</span><span className="f-eq">= (Hcc−Hpf)/100 × Zr × 1000</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">p</span><span className="f-eq">= p_table + 0,04×(5−ETc)</span><span className="f-src">FAO-56 T.22, Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">RFU</span><span className="f-eq">= p_ajusté × RU</span><span className="f-src">FAO-56 Eq.83</span></div>
              <div className="formule-item"><span className="f-name">Sc</span><span className="f-eq">= Hcc/100 × Zr × 1000 − RFU</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Sa</span><span className="f-eq">= θactuel × Zr × 1000</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Décision</span><span className="f-eq">Sa &lt; Sc → irrigation ; sinon aucun arrosage</span><span className="f-src">RG-I4, Chap.3/4 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Di</span><span className="f-eq">= ETc × superficie_plot</span><span className="f-src">Chap.3 mémoire</span></div>
              <div className="formule-item"><span className="f-name">Déficit NPK</span><span className="f-eq">= Valeur_optimale − Valeur_capteur</span><span className="f-src">Protocole + FAO AGRIS</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
