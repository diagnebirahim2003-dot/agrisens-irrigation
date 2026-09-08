// Historique des relevés du capteur 8-en-1 — chaque lecture est horodatée
// et ajoutée à un tableau borné (au lieu d'écraser la précédente comme le
// faisait agrisens_sol8 seul). Alimente la page Graphes.
const HIST_KEY = 'agrisens_sol8_historique';
const MAX_ENTRIES = 500;

export function pushReleve(reading) {
  try {
    const hist = getHistorique();
    hist.push({ ...reading, date: new Date().toISOString() });
    if (hist.length > MAX_ENTRIES) hist.splice(0, hist.length - MAX_ENTRIES);
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  } catch { /* quota localStorage dépassé ou indisponible : on ignore */ }
}

export function getHistorique() {
  try {
    const hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    return Array.isArray(hist) ? hist : [];
  } catch { return []; }
}

export function clearHistorique() {
  localStorage.removeItem(HIST_KEY);
}
