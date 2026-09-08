// Table des types de sol (Hcc, Hpf en %, f = fraction d'épuisement par défaut)
// "Sablo-limoneux" reprend les valeurs réellement mesurées sur le site
// expérimental USSEIN Kaolack (Chapitre III du mémoire, l.167 et l.175) :
// Hcc = 28 %, Hpf = 0,11 (11 %). Les autres textures sont des valeurs
// indicatives FAO/USDA pour les parcelles hors site expérimental.
// Un Administrateur peut surcharger ces valeurs depuis AdminPanel
// (persistées dans localStorage) — même mécanisme que cultures.js (RG-I6).
const STORAGE_KEY = 'agrisens_sols';

export const DEFAULT_SOLS = [
  { nom:'Sableux',         cc:10, pf:4,  f:0.50 },
  { nom:'Sablo-limoneux',  cc:28, pf:11, f:0.50 },
  { nom:'Limoneux',        cc:28, pf:14, f:0.50 },
  { nom:'Limono-argileux', cc:32, pf:16, f:0.50 },
  { nom:'Argileux',        cc:36, pf:20, f:0.45 },
];

// Fusionne la configuration enregistrée par l'Administrateur avec les
// valeurs par défaut, pour qu'un champ jamais modifié garde sa valeur de base.
export function getSols() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(stored)) {
      return DEFAULT_SOLS.map(d => ({ ...d, ...(stored.find(s => s.nom === d.nom) || {}) }));
    }
  } catch { /* config invalide, on retombe sur les valeurs par défaut */ }
  return DEFAULT_SOLS;
}

export function saveSols(sols) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sols));
}

export function resetSols() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSol(nom) {
  const sols = getSols();
  return sols.find(s => s.nom === nom) || sols.find(s => s.nom === 'Sablo-limoneux');
}
