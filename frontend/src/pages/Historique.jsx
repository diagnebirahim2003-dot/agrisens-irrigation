import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dataset from '../data/historique_experimentation.json';
import { getCultures } from '../utils/cultures';
import { getSol } from '../utils/sols';
import {
  getDOY, getDAS, getKc, getStage, calcRa, calcRs, calcETo,
  calcPajuste, calcRU, calcSc, calcSa, calcDi,
} from '../utils/agro';
import './Historique.css';

// Site expérimental — ET0_ETc_Calculateur.xlsx, feuille "Paramètres du site"
const SITE_LAT = 14.1667;
// Dates de semis réelles — ET0_ETc_Calculateur.xlsx, feuille "Cultures"
const SEMIS = { Navet: '2026-06-25', Gombo: '2026-06-25', Laitue: '2026-07-25' };
// Sol mesuré sur le site expérimental (Chapitre III du mémoire)
const SOL_NOM = 'Sablo-limoneux';
const CULTURE_ICONS = { Laitue: '🥬', Navet: '🌿', Gombo: '🫛' };

function calculerJour(record, culture, cultures, sol) {
  const date  = new Date(record.date + 'T12:00:00');
  const doy   = getDOY(date);
  const das   = getDAS(SEMIS[culture], date);
  const c     = cultures[culture];

  const Ra    = calcRa(SITE_LAT, doy);
  const Rs    = calcRs(record.Tmax, record.Tmin, Ra);
  const RHmoy = (record.RHmax + record.RHmin) / 2;
  const u2    = record.ventKmh / 3.6; // déjà à 2m (feuille ET0 FAO-56, colonne "Vent à 2m")
  const ETo   = calcETo(record.Tmax, record.Tmin, RHmoy, u2, Rs, Ra);
  const Kc    = getKc(cultures, culture, das);
  const ETc   = Kc * ETo;
  const stage = getStage(cultures, culture, das);

  const RU    = calcRU(sol.cc, sol.pf, c.Zr);
  const Pajus = calcPajuste(c.p, ETc);
  const RFU   = Pajus * RU;
  const Sc    = calcSc(sol.cc, c.Zr, RFU);
  const Di    = calcDi(ETc, 2);

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

// Graphique Sa (matin) vs Sc — deux courbes superposées + points rouges quand Sa < Sc
function ChartSaSc({ jours }) {
  const pts = jours.filter(j => j.matin);
  if (pts.length < 2) return <div className="hist-empty">Pas assez de jours avec relevé pour tracer un graphique.</div>;

  const W = 720, H = 240, PAD = 40;
  const allVals = pts.flatMap(j => [j.matin.Sa, j.Sc]);
  const min = Math.min(...allVals, 0), max = Math.max(...allVals);
  const range = (max - min) || 1;
  const stepX = (W - 2 * PAD) / (pts.length - 1);
  const x = i => PAD + i * stepX;
  const y = v => H - PAD - ((v - min) / range) * (H - 2 * PAD);

  const pathSa = pts.map((j, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(j.matin.Sa)}`).join(' ');
  const pathSc = pts.map((j, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(j.Sc)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Sa vs Sc">
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#dde5d7" />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#dde5d7" />
      <text x={2} y={PAD} fontSize="10" fill="#4b5d51">{max.toFixed(0)} mm</text>
      <text x={2} y={H - PAD} fontSize="10" fill="#4b5d51">{min.toFixed(0)} mm</text>
      <path d={pathSc} fill="none" stroke="#e65100" strokeWidth="2" strokeDasharray="4,3" />
      <path d={pathSa} fill="none" stroke="#1565c0" strokeWidth="2" />
      {pts.map((j, i) => (
        <circle key={j.date} cx={x(i)} cy={y(j.matin.Sa)} r={j.matin.decl ? 4 : 2.5}
          fill={j.matin.decl ? '#c62828' : '#1565c0'} />
      ))}
      <text x={PAD} y={14} fontSize="11" fill="#1565c0">— Sa (stock mesuré, matin)</text>
      <text x={PAD + 220} y={14} fontSize="11" fill="#e65100">┅ Sc (seuil critique)</text>
    </svg>
  );
}

export default function Historique() {
  const cultures = getCultures();
  const sol = getSol(SOL_NOM);
  const cultureKeys = Object.keys(dataset);
  const [culture, setCulture] = useState(cultureKeys[0] || 'Gombo');

  const jours = useMemo(
    () => (dataset[culture] || []).map(r => calculerJour(r, culture, cultures, sol)),
    [culture]
  );
  const joursAvecReleve = jours.filter(j => j.matin || j.soir);
  const nbDeclenchements = jours.filter(j => j.matin?.decl || j.soir?.decl).length;

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(`AgriSens — Historique expérimental — ${culture}`, 14, 12);
    doc.setFontSize(9);
    doc.text(
      `Site : Sinsing / Kaolack — Sol : ${SOL_NOM} (Hcc=${sol.cc}%, Hpf=${sol.pf}%) — ` +
      `Semis : ${new Date(SEMIS[culture]).toLocaleDateString('fr-FR')} — ` +
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
    doc.save(`agrisens_historique_${culture}.pdf`);
  }

  return (
    <div className="hist-wrap">
      <div className="hist-header">
        <div className="hist-title">📅 Historique de l'expérimentation</div>
        <div className="hist-sub">
          ETo, ETc, RU, Sc et Sa recalculés jour par jour avec les formules de l'app,
          à partir des données réellement mesurées pendant l'expérimentation
          (météo de terrain + capteur 8-en-1) — aucune valeur inventée.
        </div>
      </div>

      <div className="hist-tabs">
        {cultureKeys.map(cu => (
          <button key={cu} className={`htab ${culture === cu ? 'active' : ''}`} onClick={() => setCulture(cu)}>
            {CULTURE_ICONS[cu] || '🌱'} {cu}
          </button>
        ))}
      </div>

      <div className="hist-toolbar">
        <div className="hist-meta">
          Semis : <b>{new Date(SEMIS[culture]).toLocaleDateString('fr-FR')}</b> ·
          {' '}{jours.length} jours de météo réelle ·
          {' '}{joursAvecReleve.length} jours avec relevé capteur ·
          {' '}<span className={nbDeclenchements > 0 ? 'hist-alert-count' : ''}>{nbDeclenchements} déclenchement(s) d'irrigation</span>
        </div>
        <button className="btn-pdf" onClick={exportPDF}>⬇️ Télécharger en PDF</button>
      </div>

      <div className="hist-card">
        <div className="hist-card-title">💧 Stock d'eau mesuré (Sa) vs seuil critique (Sc) — relevés du matin</div>
        <ChartSaSc jours={jours} />
      </div>

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
                  {j.matin ? (j.matin.decl ? '🚨 Irrigation' : '✅ Suffisant') : '—'}
                </td>
                <td>{j.soirData ? j.soirData.humidite.toFixed(1) + '%' : '—'}</td>
                <td>{j.soir ? j.soir.Sa.toFixed(1) : '—'}</td>
                <td className={j.soir?.decl ? 'cell-danger' : j.soir ? 'cell-ok' : ''}>
                  {j.soir ? (j.soir.decl ? '🚨 Irrigation' : '✅ Suffisant') : '—'}
                </td>
                <td>{j.Di.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
