import { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dataset from '../data/historique_experimentation.json';
import { getCultures } from '../utils/cultures';
import { getSol } from '../utils/sols';
import { listParcelles } from '../utils/orion';
import {
  getDOY, getDAS, getKc, getStage, calcRa, calcRs, calcETo,
  calcPajuste, calcRU, calcSc, calcSa, calcDi,
} from '../utils/agro';
import {
  IconCalendar, IconRefresh, IconLoader, IconCompass, IconInfo, IconDroplet,
  IconSun, IconLeaf, IconArrowDown, IconTrendUp, IconCheck, IconAlertTriangle,
} from '../components/Icons';
import './Historique.css';

// Site expérimental — ET0_ETc_Calculateur.xlsx, feuille "Paramètres du site"
const SITE_LAT = 14.1667;
const CULTURE_ICONS = { Laitue: '🥬', Navet: '🌿', Gombo: '🫛' };

function calculerJour(record, parc, cultures, sol) {
  const date  = new Date(record.date + 'T12:00:00');
  const doy   = getDOY(date);
  const das   = getDAS(parc.semis, date);
  const c     = cultures[parc.culture];

  const Ra    = calcRa(SITE_LAT, doy);
  const Rs    = calcRs(record.Tmax, record.Tmin, Ra);
  const RHmoy = (record.RHmax + record.RHmin) / 2;
  const u2    = record.ventKmh / 3.6; // déjà à 2m (feuille ET0 FAO-56, colonne "Vent à 2m")
  const ETo   = calcETo(record.Tmax, record.Tmin, RHmoy, u2, Rs, Ra);
  const Kc    = getKc(cultures, parc.culture, das);
  const ETc   = Kc * ETo;
  const stage = getStage(cultures, parc.culture, das);

  const RU    = calcRU(sol.cc, sol.pf, c.Zr);
  const Pajus = calcPajuste(c.p, ETc);
  const RFU   = Pajus * RU;
  const Sc    = calcSc(sol.cc, c.Zr, RFU);
  const Di    = calcDi(ETc, parc.superficie || 2);

  const decision = session => {
    if (!session) return null;
    const Sa = calcSa(session.humidite, c.Zr);
    return { Sa, decl: Sa < Sc };
  };

  return {
    date: record.date, das, stage, Tmax: record.Tmax, Tmin: record.Tmin,
    RHmoy, ventKmh: record.ventKmh, ETo, Kc, ETc, RU, RFU, Sc, Di,
    matin: decision(record.matin), soir: decision(record.soir),
    matinData: record.matin, soirData: record.soir,
  };
}

// Stades phénologiques (Li/Ld/Lm/cycle en DAS) -> bandes de fond colorées sur les graphiques.
const STAGE_DEFS = [
  { key: 'ini',  label: 'Initial',        color: '#f3e9dd' },
  { key: 'dev',  label: 'Développement',  color: '#e1efe6' },
  { key: 'mid',  label: 'Mi-saison',      color: '#e2eef6' },
  { key: 'late', label: 'Fin de saison',  color: '#ece3f4' },
  { key: 'done', label: 'Récolte',        color: '#eef2ea' },
];

function stageAtDas(c, das) {
  const [Li, Ld, Lm] = c.L;
  if (das <= Li)          return STAGE_DEFS[0];
  if (das <= Li + Ld)     return STAGE_DEFS[1];
  if (das <= Li + Ld + Lm)return STAGE_DEFS[2];
  if (das <= c.cycle)     return STAGE_DEFS[3];
  return STAGE_DEFS[4];
}

// Regroupe les jours consécutifs par stade -> segments {startIdx, endIdx, ...STAGE_DEFS}
function computeStageBands(jours, c) {
  const bands = [];
  jours.forEach((j, i) => {
    const s = stageAtDas(c, j.das);
    const last = bands[bands.length - 1];
    if (last && last.key === s.key) last.endIdx = i;
    else bands.push({ ...s, startIdx: i, endIdx: i });
  });
  return bands;
}

// Graphique multi-courbes générique sur l'axe calendaire (un point par jour de météo réelle),
// avec les stades phénologiques en fond et gestion des trous (relevés capteur manquants).
function TimeChart({ title, jours, series, culture: c, unit = '' }) {
  if (jours.length < 2) return <div className="hist-empty">Pas assez de jours pour tracer un graphique.</div>;

  const W = 760, H = 220, PAD = 42, LEG_H = 22;
  const n = jours.length;
  const x = i => PAD + i * (W - 2 * PAD) / (n - 1);
  const vals = series.flatMap(s => jours.map(s.get)).filter(v => v !== null && v !== undefined);
  const min = Math.min(...vals, 0), max = Math.max(...vals);
  const range = (max - min) || 1;
  const y = v => H - PAD - ((v - min) / range) * (H - 2 * PAD);
  const bands = computeStageBands(jours, c);

  function pathFor(get) {
    let d = '', drawing = false;
    jours.forEach((j, i) => {
      const v = get(j);
      if (v === null || v === undefined) { drawing = false; return; }
      d += (drawing ? 'L' : 'M') + x(i) + ',' + y(v) + ' ';
      drawing = true;
    });
    return d;
  }

  return (
    <div className="hist-card">
      <div className="hist-card-title">{title}</div>
      <svg viewBox={`0 0 ${W} ${H + LEG_H}`} width="100%" height={H + LEG_H} role="img" aria-label={title}>
        {bands.map(b => (
          <rect key={b.startIdx} x={x(b.startIdx) - (b.startIdx === 0 ? 2 : 0)}
            y={PAD} width={Math.max(1, x(b.endIdx) - x(b.startIdx) + 2)} height={H - 2 * PAD} fill={b.color} />
        ))}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#c7d0c2" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#c7d0c2" />
        <text x={2} y={PAD} fontSize="10" fill="#52685a">{max.toFixed(1)}{unit}</text>
        <text x={2} y={H - PAD} fontSize="10" fill="#52685a">{min.toFixed(1)}{unit}</text>
        {series.map(s => (
          <path key={s.key} d={pathFor(s.get)} fill="none" stroke={s.color} strokeWidth="2" strokeDasharray={s.dash || ''} />
        ))}
        {series.map((s, i) => (
          <text key={s.key} x={PAD + i * 200} y={H + 16} fontSize="11" fill={s.color}>{s.dash ? '┅' : '━'} {s.label}</text>
        ))}
      </svg>
      <div className="hist-stage-legend">
        {[...new Set(bands.map(b => b.key))].map(k => {
          const s = STAGE_DEFS.find(sd => sd.key === k);
          return <span key={k} className="hist-stage-chip" style={{ background: s.color }}>{s.label}</span>;
        })}
      </div>
    </div>
  );
}

// Courbe théorique du Kc en fonction du DAS (indépendante des dates de l'expérimentation) —
// l'illustration FAO-56 classique des 4 stades phénologiques.
function KcCurveChart({ cultures, culture }) {
  const c = cultures[culture];
  const pts = [];
  for (let das = 0; das <= c.cycle; das++) pts.push(getKc(cultures, culture, das));
  const W = 760, H = 200, PAD = 42;
  const min = 0, max = Math.max(...pts) * 1.1;
  const x = das => PAD + das * (W - 2 * PAD) / c.cycle;
  const y = v => H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD);
  const path = pts.map((v, das) => `${das === 0 ? 'M' : 'L'}${x(das)},${y(v)}`).join(' ');
  const bounds = [c.L[0], c.L[0] + c.L[1], c.L[0] + c.L[1] + c.L[2]];

  return (
    <div className="hist-card">
      <div className="hist-card-title"><IconTrendUp size={15}/> Courbe théorique du coefficient cultural Kc — {culture} (FAO-56)</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Courbe Kc">
        {[0, ...bounds, c.cycle].slice(0, -1).map((start, i) => {
          const end = [...bounds, c.cycle][i];
          return <rect key={i} x={x(start)} y={PAD} width={x(end) - x(start)} height={H - 2 * PAD} fill={STAGE_DEFS[i].color} />;
        })}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#c7d0c2" />
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#c7d0c2" />
        <text x={2} y={PAD} fontSize="10" fill="#52685a">{max.toFixed(2)}</text>
        <text x={2} y={H - PAD} fontSize="10" fill="#52685a">0</text>
        <text x={W - PAD} y={H - PAD + 14} fontSize="10" fill="#52685a" textAnchor="end">{c.cycle} j (DAS)</text>
        <path d={path} fill="none" stroke="#1f6b45" strokeWidth="2.5" />
      </svg>
      <div className="hist-stage-legend">
        {STAGE_DEFS.slice(0, 4).map(s => (
          <span key={s.key} className="hist-stage-chip" style={{ background: s.color }}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function Historique({ auth }) {
  const cultures = getCultures();
  const [parcelles, setParcelles] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [selectedId, setSelectedId] = useState('');

  // Chaque utilisateur ne voit que ses propres parcelles (l'admin les voit toutes) —
  // un compte qui vient de s'inscrire n'a aucune parcelle, donc aucun historique : c'est attendu.
  // reloadParcelles() peut être rappelée manuellement (bouton Actualiser) sans se reconnecter.
  async function reloadParcelles() {
    setLoading(true); setError('');
    try {
      const list = await listParcelles(auth.token, auth.role === 'admin' ? {} : { owner: auth.email });
      setParcelles(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { reloadParcelles(); }, []);

  const parc = parcelles.find(p => p.id === selectedId);
  // L'historique réel n'existe que pour les parcelles ayant réellement été suivies pendant
  // l'expérimentation (données mesurées) — identifiées par leur nom exact, pas par culture,
  // pour ne jamais mélanger les données d'une parcelle avec celles d'une autre.
  const records = parc ? dataset[parc.nom] : null;

  const jours = useMemo(() => {
    if (!parc || !records) return [];
    const sol = getSol(parc.sol);
    let cumul = 0;
    return records.map(r => {
      const j = calculerJour(r, parc, cultures, sol);
      cumul += j.Di;
      return { ...j, cumulDi: cumul };
    });
  }, [selectedId]);

  const joursAvecReleve = jours.filter(j => j.matin || j.soir);
  const nbDeclenchements = jours.filter(j => j.matin?.decl || j.soir?.decl).length;

  function exportPDF() {
    const sol = getSol(parc.sol);
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`AgriSens — Historique expérimental — ${parc.nom}`, 14, 12);
    doc.setFontSize(9);
    doc.text(
      `Culture : ${parc.culture} — Sol : ${parc.sol} (Hcc=${sol.cc}%, Hpf=${sol.pf}%) — ` +
      `Semis : ${new Date(parc.semis).toLocaleDateString('fr-FR')} — ` +
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      14, 18
    );

    autoTable(doc, {
      startY: 24,
      head: [['Date', 'DAS', 'Stade', 'Tmax', 'Tmin', 'ETo', 'Kc', 'ETc', 'RU', 'Sc',
        'Hum. matin', 'Sa matin', 'Décision matin', 'Hum. soir', 'Sa soir', 'Décision soir', 'Di']],
      body: jours.map(j => [
        new Date(j.date + 'T12:00:00').toLocaleDateString('fr-FR'), j.das, j.stage,
        j.Tmax.toFixed(1), j.Tmin.toFixed(1), j.ETo.toFixed(2), j.Kc.toFixed(2), j.ETc.toFixed(2),
        j.RU.toFixed(1), j.Sc.toFixed(1),
        j.matinData ? j.matinData.humidite.toFixed(1) + '%' : '—',
        j.matin ? j.matin.Sa.toFixed(1) : '—',
        j.matin ? (j.matin.decl ? 'Irrigation' : 'Suffisant') : '—',
        j.soirData ? j.soirData.humidite.toFixed(1) + '%' : '—',
        j.soir ? j.soir.Sa.toFixed(1) : '—',
        j.soir ? (j.soir.decl ? 'Irrigation' : 'Suffisant') : '—',
        j.Di.toFixed(2),
      ]),
      styles: { fontSize: 6.5 },
      headStyles: { fillColor: [27, 94, 32] },
    });
    doc.save(`agrisens_historique_${parc.nom}.pdf`);
  }

  return (
    <div className="hist-wrap">
      <div className="hist-header" style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'12px', flexWrap:'wrap'}}>
        <div>
          <div className="hist-title"><IconCalendar size={19}/> Historique de l'expérimentation</div>
          <div className="hist-sub">
            ETo, ETc, RU, Sc et Sa recalculés jour par jour avec les formules de l'app,
            à partir des données réellement mesurées pendant l'expérimentation
            (météo de terrain + capteur 8-en-1) — propres à chaque parcelle, aucune valeur inventée.
          </div>
        </div>
        <button className="btn-refresh" onClick={reloadParcelles} disabled={loading} title="Recharger sans se reconnecter">
          <IconRefresh size={14} className={loading ? 'spin' : ''}/> Actualiser
        </button>
      </div>

      {error && <div className="hist-empty">{error}</div>}

      {loading ? (
        <div className="hist-empty"><IconLoader size={16} className="spin"/> Chargement des parcelles (Orion via Wilma)…</div>
      ) : parcelles.length === 0 ? (
        <div className="hist-empty">
          <IconCompass size={16}/> Aucune parcelle. Créez-en une depuis "Parcelles" pour voir son historique ici.
        </div>
      ) : (
        <>
          <div className="hist-tabs">
            {parcelles.map(p => (
              <button key={p.id} className={`htab ${selectedId === p.id ? 'active' : ''}`} onClick={() => setSelectedId(p.id)}>
                {CULTURE_ICONS[p.culture] || '🌱'} {p.nom}
              </button>
            ))}
          </div>

          {!records ? (
            <div className="hist-empty">
              <IconInfo size={16}/> Aucun historique disponible pour "{parc.nom}" — cette parcelle n'a pas de données
              mesurées importées (uniquement les 3 parcelles de l'expérimentation du mémoire en ont).
            </div>
          ) : (
            <>
              <div className="hist-toolbar">
                <div className="hist-meta">
                  Semis : <b>{new Date(parc.semis).toLocaleDateString('fr-FR')}</b> ·
                  {' '}{jours.length} jours de météo réelle ·
                  {' '}{joursAvecReleve.length} jours avec relevé capteur ·
                  {' '}<span className={nbDeclenchements > 0 ? 'hist-alert-count' : ''}>{nbDeclenchements} déclenchement(s) d'irrigation</span>
                </div>
                <button className="btn-pdf" onClick={exportPDF}><IconArrowDown size={15}/> Télécharger en PDF</button>
              </div>

              <TimeChart
                title={<><IconDroplet size={15}/> Stock d'eau mesuré (Sa, matin) vs seuil critique (Sc)</>}
                jours={jours} culture={cultures[parc.culture]} unit=" mm"
                series={[
                  { key: 'Sc', label: 'Sc — seuil critique', color: '#b5730a', dash: '4,3', get: j => j.Sc },
                  { key: 'Sa', label: 'Sa — stock mesuré (matin)', color: '#2a628f', get: j => j.matin?.Sa ?? null },
                ]}
              />

              <TimeChart
                title={<><IconSun size={15}/> Évapotranspiration — ETo (référence) vs ETc (culture)</>}
                jours={jours} culture={cultures[parc.culture]} unit=" mm/j"
                series={[
                  { key: 'ETo', label: 'ETo', color: '#d9a441', get: j => j.ETo },
                  { key: 'ETc', label: 'ETc', color: '#1f6b45', get: j => j.ETc },
                ]}
              />

              <TimeChart
                title={<><IconLeaf size={15}/> Humidité du sol mesurée — matin vs soir</>}
                jours={jours} culture={cultures[parc.culture]} unit="%"
                series={[
                  { key: 'hm', label: 'Humidité matin', color: '#2a628f', get: j => j.matinData?.humidite ?? null },
                  { key: 'hs', label: 'Humidité soir', color: '#6a4c8c', dash: '4,3', get: j => j.soirData?.humidite ?? null },
                ]}
              />

              <TimeChart
                title={<><IconTrendUp size={15}/> Dose d'irrigation théorique cumulée (Di) sur le cycle</>}
                jours={jours} culture={cultures[parc.culture]} unit=" mm"
                series={[
                  { key: 'cum', label: 'Cumul Di', color: '#00897b', get: j => j.cumulDi },
                ]}
              />

              <KcCurveChart cultures={cultures} culture={parc.culture} />

              <div className="hist-table-wrap">
                <table className="hist-table">
                  <thead>
                    <tr>
                      <th>Date</th><th>DAS</th><th>Stade</th>
                      <th>Tmax</th><th>Tmin</th><th>ETo</th><th>Kc</th><th>ETc</th>
                      <th>RU</th><th>Sc</th>
                      <th>Hum. matin</th><th>Sa matin</th><th>Décision matin</th>
                      <th>Hum. soir</th><th>Sa soir</th><th>Décision soir</th>
                      <th>Di</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jours.map(j => (
                      <tr key={j.date} className={(j.matin?.decl || j.soir?.decl) ? 'row-alert' : ''}>
                        <td>{new Date(j.date + 'T12:00:00').toLocaleDateString('fr-FR')}</td>
                        <td>{j.das}</td>
                        <td>{j.stage}</td>
                        <td>{j.Tmax.toFixed(1)}°C</td>
                        <td>{j.Tmin.toFixed(1)}°C</td>
                        <td>{j.ETo.toFixed(2)}</td>
                        <td>{j.Kc.toFixed(2)}</td>
                        <td>{j.ETc.toFixed(2)}</td>
                        <td>{j.RU.toFixed(1)}</td>
                        <td>{j.Sc.toFixed(1)}</td>
                        <td>{j.matinData ? j.matinData.humidite.toFixed(1) + '%' : '—'}</td>
                        <td>{j.matin ? j.matin.Sa.toFixed(1) : '—'}</td>
                        <td className={j.matin?.decl ? 'cell-danger' : j.matin ? 'cell-ok' : ''}>
                          {j.matin ? (j.matin.decl ? <><IconAlertTriangle size={11}/> Irrigation</> : <><IconCheck size={11}/> Suffisant</>) : '—'}
                        </td>
                        <td>{j.soirData ? j.soirData.humidite.toFixed(1) + '%' : '—'}</td>
                        <td>{j.soir ? j.soir.Sa.toFixed(1) : '—'}</td>
                        <td className={j.soir?.decl ? 'cell-danger' : j.soir ? 'cell-ok' : ''}>
                          {j.soir ? (j.soir.decl ? <><IconAlertTriangle size={11}/> Irrigation</> : <><IconCheck size={11}/> Suffisant</>) : '—'}
                        </td>
                        <td>{j.Di.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
