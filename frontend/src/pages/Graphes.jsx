import { useState, useEffect } from 'react';
import { getHistorique } from '../utils/historique';
import { listParcelles } from '../utils/orion';
import { getCultures } from '../utils/cultures';
import './Graphes.css';

const PARAMS = [
  { key:'humidite',    label:'Humidité sol',    unit:'%',     color:'#1565c0' },
  { key:'temperature', label:'Température sol', unit:'°C',    color:'#e65100' },
  { key:'ph',          label:'pH',              unit:'',      color:'#6a1b9a' },
  { key:'ec',          label:'EC',              unit:'µS/cm', color:'#00897b' },
  { key:'n',           label:'Azote (N)',       unit:'mg/kg', color:'#2e7d32' },
  { key:'p',           label:'Phosphore (P)',   unit:'mg/kg', color:'#c62828' },
  { key:'k',           label:'Potassium (K)',   unit:'mg/kg', color:'#f9a825' },
  { key:'luminosite',  label:'Luminosité',      unit:'lux',   color:'#fbc02d' },
];

function LineChart({ points, color, unit }) {
  const W = 640, H = 220, PAD = 36;
  const vals = points.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (W - 2 * PAD) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = PAD + i * stepX;
    const y = H - PAD - ((p.v - min) / range) * (H - 2 * PAD);
    return [x, y];
  });
  const path = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Graphique d'historique">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#dde5d7" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#dde5d7" />
      <text x={2} y={PAD} fontSize="11" fill="#4b5d51">{max.toFixed(1)}{unit}</text>
      <text x={2} y={H - PAD} fontSize="11" fill="#4b5d51">{min.toFixed(1)}{unit}</text>
      {coords.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2" />}
      {last && <circle cx={last[0]} cy={last[1]} r="4" fill={color} />}
    </svg>
  );
}

export default function Graphes({ auth }) {
  const CULTURES = getCultures();
  const [parcelles,  setParcelles]  = useState([]);
  const [parcLoading,setParcLoading]= useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [historique, setHistorique] = useState([]);
  const [param, setParam] = useState('humidite');

  useEffect(() => {
    (async () => {
      setParcLoading(true);
      try {
        const list = await listParcelles(auth.token, auth.role === 'admin' ? {} : { owner: auth.email });
        setParcelles(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch { /* Orion injoignable */ }
      finally { setParcLoading(false); }
    })();
  }, []);

  // Chaque parcelle/culture garde ses propres relevés — l'historique affiché
  // ne concerne que la parcelle sélectionnée.
  useEffect(() => {
    setHistorique(selectedId ? getHistorique(selectedId) : []);
  }, [selectedId]);

  const def = PARAMS.find(p => p.key === param);
  const points = historique
    .filter(h => h[param] !== undefined && h[param] !== null)
    .slice(-100)
    .map(h => ({ v: h[param], date: h.date }));
  const dernier = points[points.length - 1];

  return (
    <div className="graph-wrap">
      <div className="graph-section">
        <div className="graph-header">
          <div className="graph-title">📈 Historique des relevés — Capteur 8-en-1</div>
          <span className="graph-count">
            {historique.length} relevé{historique.length > 1 ? 's' : ''} enregistré{historique.length > 1 ? 's' : ''}
          </span>
        </div>

        {!parcLoading && parcelles.length > 0 && (
          <div className="graph-params" style={{marginBottom:'14px'}}>
            {parcelles.map(p => (
              <button
                key={p.id}
                className={`graph-param-btn ${selectedId === p.id ? 'active' : ''}`}
                onClick={() => setSelectedId(p.id)}
              >
                {CULTURES[p.culture]?.icon || '🌱'} {p.nom}
              </button>
            ))}
          </div>
        )}

        {parcLoading ? (
          <div className="graph-empty">⏳ Chargement des parcelles…</div>
        ) : parcelles.length === 0 ? (
          <div className="graph-empty">
            🧭 Aucune parcelle. Créez d'abord une parcelle dans "Parcelles".
          </div>
        ) : historique.length === 0 ? (
          <div className="graph-empty">
            📡 Aucun relevé enregistré pour l'instant.<br />
            Connectez le capteur 8-en-1 depuis la page "Capteurs" pour commencer l'historisation.
          </div>
        ) : (
          <>
            <div className="graph-params">
              {PARAMS.map(p => (
                <button
                  key={p.key}
                  className={`graph-param-btn ${param === p.key ? 'active' : ''}`}
                  style={param === p.key ? { borderColor: p.color, color: p.color } : {}}
                  onClick={() => setParam(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {dernier ? (
              <>
                <div className="graph-current">
                  <span className="graph-current-val" style={{ color: def.color }}>{dernier.v}{def.unit}</span>
                  <span className="graph-current-lbl">Dernière valeur — {def.label}</span>
                </div>
                <LineChart points={points} color={def.color} unit={def.unit} />
                <div className="graph-hint">{points.length} point{points.length > 1 ? 's' : ''} affiché{points.length > 1 ? 's' : ''}</div>
              </>
            ) : (
              <div className="graph-empty">Aucune donnée "{def.label}" dans l'historique.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
