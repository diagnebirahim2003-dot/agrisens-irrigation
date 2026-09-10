// Historique des relevés du capteur 8-en-1 — chaque lecture est horodatée
// ET rattachée à une parcelle précise (parcelleId), pour que chaque parcelle
// / culture garde ses propres données indépendantes dans la "base".
const HIST_KEY = 'agrisens_sol8_historique';
const MAX_ENTRIES = 500;
const SOL8_PREFIX = 'agrisens_sol8_';

export function pushReleve(reading, parcelleId) {
  try {
    const hist = getHistorique();
    hist.push({ ...reading, parcelleId: parcelleId || null, date: new Date().toISOString() });
    if (hist.length > MAX_ENTRIES) hist.splice(0, hist.length - MAX_ENTRIES);
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  } catch { /* quota localStorage dépassé ou indisponible : on ignore */ }
}

// Sans parcelleId : tout l'historique (usage admin/legacy). Avec parcelleId :
// uniquement les relevés de cette parcelle.
export function getHistorique(parcelleId) {
  try {
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    const arr = Array.isArray(hist) ? hist : [];
    return parcelleId ? arr.filter(h => h.parcelleId === parcelleId) : arr;
  } catch { return []; }
}

export function clearHistorique(parcelleId) {
  if (!parcelleId) { localStorage.removeItem(HIST_KEY); return; }
  try {
    const rest = getHistorique().filter(h => h.parcelleId !== parcelleId);
    localStorage.setItem(HIST_KEY, JSON.stringify(rest));
  } catch { /* ignore */ }
}

// Dernier relevé "instantané" du capteur 8-en-1, par parcelle (remplace
// l'ancienne clé globale unique agrisens_sol8 qui mélangeait toutes les parcelles).
export function getSol8(parcelleId) {
  if (!parcelleId) return null;
  try { return JSON.parse(localStorage.getItem(SOL8_PREFIX + parcelleId) || 'null'); }
  catch { return null; }
}

export function setSol8(parcelleId, data) {
  if (!parcelleId) return;
  try { localStorage.setItem(SOL8_PREFIX + parcelleId, JSON.stringify(data)); }
  catch { /* ignore */ }
}
