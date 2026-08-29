import { useState, useEffect, useRef } from 'react';
import './Parcelles.css';

const CULTURES = [
  { nom:'Laitue', icon:'🥬', cycle:55,  prof:0.30, Kc:[0.70,1.05,0.95], L:[10,15,15,15] },
  { nom:'Navet',  icon:'🌿', cycle:55,  prof:0.50, Kc:[0.70,1.00,0.95], L:[10,15,15,15] },
  { nom:'Gombo',  icon:'🫛', cycle:100, prof:0.60, Kc:[0.40,1.00,0.75], L:[20,20,30,30] },
];

const SOLS = [
  { nom:'Sableux',         cc:10, pf:4,  da:1.6,  f:0.50 },
  { nom:'Sablo-limoneux',  cc:18, pf:8,  da:1.5,  f:0.50 },
  { nom:'Limoneux',        cc:28, pf:14, da:1.4,  f:0.50 },
  { nom:'Limono-argileux', cc:32, pf:16, da:1.35, f:0.50 },
  { nom:'Argileux',        cc:36, pf:20, da:1.3,  f:0.45 },
];

function getDAS(semis) {
  if (!semis) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(semis)) / 86400000));
}

function getStage(culture, das) {
  const c = CULTURES.find(x => x.nom === culture);
  if (!c) return { label:'Inconnu', css:'stage-ini' };
  const [Li, Ld, Lm] = c.L;
  if (das <= Li)        return { label:'Initial',       css:'stage-ini'  };
  if (das <= Li+Ld)     return { label:'Développement', css:'stage-dev'  };
  if (das <= Li+Ld+Lm)  return { label:'Mi-saison',     css:'stage-mid'  };
  if (das <= c.cycle)   return { label:'Fin de saison', css:'stage-late' };
  return                       { label:'Récolte',       css:'stage-done' };
}

function getKc(culture, das) {
  const c = CULTURES.find(x => x.nom === culture);
  if (!c) return 0.75;
  const [Li, Ld, Lm, Ll] = c.L;
  const [Ki, Km, Ke]     = c.Kc;
  if (das <= Li)           return Ki;
  if (das <= Li+Ld)        return Ki + (Km-Ki)*(das-Li)/Ld;
  if (das <= Li+Ld+Lm)     return Km;
  if (das <= Li+Ld+Lm+Ll)  return Km + (Ke-Km)*(das-Li-Ld-Lm)/Ll;
  return Ke;
}

function getParcelles(email, role) {
  const all = JSON.parse(localStorage.getItem('agrisens_parcelles') || '[]');
  if (role === 'admin') return all;
  return all.filter(p => p.owner === email);
}

function saveParcelles(list) {
  localStorage.setItem('agrisens_parcelles', JSON.stringify(list));
}

let mapInstance = null;

export default function Parcelles({ auth }) {
  const [parcelles, setParcelles] = useState([]);
  const [view,      setView]      = useState('list');
  const [selected,  setSelected]  = useState(null);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const mapRef = useRef(null);

  const [fNom,       setFNom]       = useState('');
  const [fCulture,   setFCulture]   = useState('Laitue');
  const [fSol,       setFSol]       = useState('Limono-argileux');
  const [fSemis,     setFSemis]     = useState(new Date().toISOString().split('T')[0]);
  const [fSup,       setFSup]       = useState('');
  const [fLat,       setFLat]       = useState('14.1500');
  const [fLng,       setFLng]       = useState('-16.0700');
  const [fRegion,    setFRegion]    = useState('Kaolack');

  useEffect(() => {
    setParcelles(getParcelles(auth.email, auth.role));
  }, []);

  useEffect(() => {
    if (view === 'map' && selected) setTimeout(() => initMap(selected), 200);
    return () => { if (mapInstance) { mapInstance.remove(); mapInstance = null; } };
  }, [view, selected]);

  function initMap(p) {
    const el = mapRef.current;
    if (!el || !window.L) return;
    if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    mapInstance = window.L.map(el).setView([p.lat, p.lng], 15);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution:'© OpenStreetMap' }).addTo(mapInstance);
    const icon = window.L.divIcon({
      html:`<div style="background:#2e7d32;color:#fff;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🧭 ${p.nom}</div>`,
      className:'', iconAnchor:[40,20]
    });
    window.L.marker([p.lat, p.lng], {icon}).addTo(mapInstance)
      .bindPopup(`<b>${p.nom}</b><br>${p.culture} · ${p.superficie} ha`).openPopup();
    const off = 0.0018;
    window.L.polygon([
      [p.lat+off,p.lng-off],[p.lat+off,p.lng+off],
      [p.lat-off,p.lng+off],[p.lat-off,p.lng-off],
    ], {color:'#2e7d32',fillColor:'#a5d6a7',fillOpacity:0.3,weight:2}).addTo(mapInstance);
  }

  function addParcelle(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!fNom || !fSup || !fLat || !fLng) { setError('Remplissez tous les champs obligatoires.'); return; }
    const lat = parseFloat(fLat), lng = parseFloat(fLng);
    if (isNaN(lat) || isNaN(lng)) { setError('Coordonnées GPS invalides.'); return; }
    const all = JSON.parse(localStorage.getItem('agrisens_parcelles') || '[]');
    all.push({ id:Date.now().toString(), nom:fNom, culture:fCulture, sol:fSol,
      semis:fSemis, superficie:parseFloat(fSup), lat, lng, region:fRegion,
      owner:auth.email, ownerName:auth.user, createdAt:new Date().toISOString() });
    saveParcelles(all);
    setParcelles(getParcelles(auth.email, auth.role));
    setSuccess(`✅ Parcelle "${fNom}" ajoutée !`);
    setFNom(''); setFSup(''); setView('list');
  }

  function deleteParcelle(id) {
    if (!confirm('Supprimer cette parcelle ?')) return;
    const all = JSON.parse(localStorage.getItem('agrisens_parcelles') || '[]').filter(p => p.id !== id);
    saveParcelles(all);
    setParcelles(getParcelles(auth.email, auth.role));
    if (selected?.id === id) { setSelected(null); setView('list'); }
  }

  const cInfo = name => CULTURES.find(x => x.nom === name) || CULTURES[0];

  return (
    <div className="parc-wrap">
      <div className="parc-toolbar">
        <div className="parc-toolbar-left">
          {view !== 'list' && (
            <button className="btn-back-sm" onClick={() => {
              if (view === 'map') setView('detail');
              else { setView('list'); setSelected(null); }
            }}>← Retour</button>
          )}
          <span className="parc-toolbar-title">
            {view === 'list'   && `🧭 Mes parcelles (${parcelles.length})`}
            {view === 'add'    && '➕ Nouvelle parcelle'}
            {view === 'detail' && `🧭 ${selected?.nom}`}
            {view === 'map'    && `📍 Carte — ${selected?.nom}`}
          </span>
        </div>
        {view === 'list' && auth.role !== 'agronome' && (
          <button className="btn-add-parc" onClick={() => { setView('add'); setError(''); setSuccess(''); }}>
            ➕ Ajouter
          </button>
        )}
        {view === 'detail' && (
          <button className="btn-map" onClick={() => setView('map')}>📍 Carte</button>
        )}
      </div>

      {error   && <div className="parc-error">{error}</div>}
      {success && <div className="parc-success">{success}</div>}

      {view === 'list' && (
        parcelles.length === 0 ? (
          <div className="parc-empty">
            <div className="parc-empty-icon">🧭</div>
            <div className="parc-empty-title">Aucune parcelle</div>
            <div className="parc-empty-sub">
              {auth.role === 'agronome' ? 'Aucune parcelle assignée.' : 'Cliquez sur "+ Ajouter" pour commencer.'}
            </div>
          </div>
        ) : (
          <div className="parc-grid">
            {parcelles.map(p => {
              const das=getDAS(p.semis), kc=getKc(p.culture,das), stage=getStage(p.culture,das), ci=cInfo(p.culture);
              const pct=Math.min(100, Math.round(das/ci.cycle*100));
              return (
                <div key={p.id} className="parc-card" onClick={() => { setSelected(p); setView('detail'); }}>
                  <div className="parc-card-header">
                    <div className="parc-card-icon">{ci.icon}</div>
                    <div className="parc-card-info">
                      <div className="parc-card-nom">{p.nom}</div>
                      <div className="parc-card-sub">{p.culture} · {p.superficie} ha · {p.region}</div>
                    </div>
                    {auth.role !== 'agronome' && (
                      <button className="btn-del-parc" onClick={e => { e.stopPropagation(); deleteParcelle(p.id); }}>🗑️</button>
                    )}
                  </div>
                  <div className="parc-card-body">
                    <div className="parc-stats">
                      <div className="parc-stat"><div className="ps-val">{das}</div><div className="ps-lbl">JAS</div></div>
                      <div className="parc-stat"><div className="ps-val">{kc.toFixed(2)}</div><div className="ps-lbl">Kc</div></div>
                      <div className="parc-stat"><div className="ps-val">{stage.label}</div><div className="ps-lbl">Stade</div></div>
                    </div>
                    <div className="parc-progress">
                      <div className="pp-label">
                        <span className={`stage-badge ${stage.css}`}>{stage.label}</span>
                        <span className="pp-pct">{pct}%</span>
                      </div>
                      <div className="pp-bar"><div className="pp-fill" style={{width:pct+'%'}}/></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {view === 'add' && (
        <form className="parc-form" onSubmit={addParcelle}>
          <div className="form-section">
            <div className="form-section-title">🌾 Informations générales</div>
            <div className="form-row">
              <div className="inp-group"><label>Nom *</label><input type="text" placeholder="Parcelle Nord" value={fNom} onChange={e=>setFNom(e.target.value)}/></div>
              <div className="inp-group"><label>Région</label><input type="text" placeholder="Kaolack" value={fRegion} onChange={e=>setFRegion(e.target.value)}/></div>
            </div>
            <div className="form-row">
              <div className="inp-group"><label>Superficie (m²) *</label><input type="number" placeholder="2" step="0.1" value={fSup} onChange={e=>setFSup(e.target.value)}/></div>
              <div className="inp-group"><label>Date de semis</label><input type="date" value={fSemis} onChange={e=>setFSemis(e.target.value)}/></div>
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">🌱 Culture</div>
            <div className="culture-grid">
              {CULTURES.map(c => (
                <div key={c.nom} className={`culture-item ${fCulture===c.nom?'selected':''}`} onClick={() => setFCulture(c.nom)}>
                  <span className="culture-icon">{c.icon}</span>
                  <span className="culture-nom">{c.nom}</span>
                  <span className="culture-cycle">{c.cycle}j</span>
                </div>
              ))}
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">🪨 Type de sol</div>
            <div className="sol-grid">
              {SOLS.map(s => (
                <div key={s.nom} className={`sol-item ${fSol===s.nom?'selected':''}`} onClick={() => setFSol(s.nom)}>
                  <span className="sol-nom">{s.nom}</span>
                  <span className="sol-cc">Hcc={s.cc}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="form-section">
            <div className="form-section-title">📍 Coordonnées GPS</div>
            <div className="form-row">
              <div className="inp-group"><label>Latitude *</label><input type="number" placeholder="14.1500" step="0.0001" value={fLat} onChange={e=>setFLat(e.target.value)}/></div>
              <div className="inp-group"><label>Longitude *</label><input type="number" placeholder="-16.0700" step="0.0001" value={fLng} onChange={e=>setFLng(e.target.value)}/></div>
            </div>
            <div className="gps-hint">💡 Google Maps → appui long → copier les coordonnées</div>
          </div>
          <button className="btn-save-parc" type="submit">💾 Enregistrer la parcelle</button>
        </form>
      )}

      {view === 'detail' && selected && (() => {
        const p=selected, das=getDAS(p.semis), kc=getKc(p.culture,das), stage=getStage(p.culture,das);
        const ci=cInfo(p.culture), sol=SOLS.find(s=>s.nom===p.sol)||SOLS[3];
        const ru=(ci.prof*(sol.cc-sol.pf)/100*sol.da*1000), rfu=ru*sol.f, pct=Math.min(100,Math.round(das/ci.cycle*100));
        return (
          <div>
            <div className="detail-section">
              <div className="detail-grid">
                <div className="detail-item"><div className="di-val">{ci.icon} {p.culture}</div><div className="di-lbl">Culture</div></div>
                <div className="detail-item"><div className="di-val">{p.superficie} m²</div><div className="di-lbl">Superficie</div></div>
                <div className="detail-item"><div className="di-val">{p.region}</div><div className="di-lbl">Région</div></div>
                <div className="detail-item"><div className="di-val">{new Date(p.semis).toLocaleDateString('fr-FR')}</div><div className="di-lbl">Semis</div></div>
                <div className="detail-item"><div className="di-val">{das} j</div><div className="di-lbl">DAS</div></div>
                <div className="detail-item"><div className="di-val">{Math.max(0,ci.cycle-das)} j</div><div className="di-lbl">Restants</div></div>
              </div>
              <div className="parc-progress" style={{marginTop:'12px'}}>
                <div className="pp-label">
                  <span className={`stage-badge ${stage.css}`}>{stage.label}</span>
                  <span className="pp-pct">{pct}% du cycle ({ci.cycle}j)</span>
                </div>
                <div className="pp-bar"><div className="pp-fill" style={{width:pct+'%'}}/></div>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">🧮 Paramètres agronomiques</div>
              <div className="detail-grid">
                <div className="detail-item highlight"><div className="di-val green">{kc.toFixed(3)}</div><div className="di-lbl">Kc actuel</div></div>
                <div className="detail-item"><div className="di-val">{p.sol}</div><div className="di-lbl">Type de sol</div></div>
                <div className="detail-item"><div className="di-val">{ci.prof*100} cm</div><div className="di-lbl">Prof. racinaire</div></div>
                <div className="detail-item"><div className="di-val">{ru.toFixed(1)} mm</div><div className="di-lbl">RU</div></div>
                <div className="detail-item highlight"><div className="di-val green">{rfu.toFixed(1)} mm</div><div className="di-lbl">RFU</div></div>
                <div className="detail-item"><div className="di-val">{p.lat}°, {p.lng}°</div><div className="di-lbl">GPS</div></div>
              </div>
            </div>
            <div className="detail-section">
              <div className="detail-section-title">📊 Kc par stade (FAO-56 + Protocole)</div>
              <div className="kc-table">
                {[
                  {label:'Initial',       days:`0–${ci.L[0]}j`,                              kc:ci.Kc[0], active:das<=ci.L[0]},
                  {label:'Développement', days:`${ci.L[0]}–${ci.L[0]+ci.L[1]}j`,             kc:'interp.', active:das>ci.L[0]&&das<=ci.L[0]+ci.L[1]},
                  {label:'Mi-saison',     days:`${ci.L[0]+ci.L[1]}–${ci.L[0]+ci.L[1]+ci.L[2]}j`, kc:ci.Kc[1], active:das>ci.L[0]+ci.L[1]&&das<=ci.L[0]+ci.L[1]+ci.L[2]},
                  {label:'Fin saison',    days:`${ci.L[0]+ci.L[1]+ci.L[2]}–${ci.cycle}j`,   kc:ci.Kc[2], active:das>ci.L[0]+ci.L[1]+ci.L[2]},
                ].map(row => (
                  <div key={row.label} className={`kc-row ${row.active?'kc-active':''}`}>
                    <span className="kc-label">{row.active?'▶ ':''}{row.label}</span>
                    <span className="kc-days">{row.days}</span>
                    <span className="kc-val">{typeof row.kc==='number'?row.kc.toFixed(2):row.kc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {view === 'map' && <div className="map-container" ref={mapRef}/>}
    </div>
  );
}
