// Table des types de sol (Hcc, Hpf en %, f = fraction d'épuisement par défaut)
// "Sablo-limoneux" reprend les valeurs réellement mesurées sur le site
// expérimental USSEIN Kaolack (Chapitre III du mémoire, l.167 et l.175) :
// Hcc = 28 %, Hpf = 0,11 (11 %). Les autres textures sont des valeurs
// indicatives FAO/USDA pour les parcelles hors site expérimental.
export const SOLS = [
  { nom:'Sableux',         cc:10, pf:4,  f:0.50 },
  { nom:'Sablo-limoneux',  cc:28, pf:11, f:0.50 },
  { nom:'Limoneux',        cc:28, pf:14, f:0.50 },
  { nom:'Limono-argileux', cc:32, pf:16, f:0.50 },
  { nom:'Argileux',        cc:36, pf:20, f:0.45 },
];

export function getSol(nom) {
  return SOLS.find(s => s.nom === nom) || SOLS.find(s => s.nom === 'Sablo-limoneux');
}
