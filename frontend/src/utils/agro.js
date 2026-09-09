// Fonctions de calcul agronomique partagées (Chapitre III du mémoire + FAO-56).
// Utilisées à la fois par la page Calculs (météo API en direct) et par la page
// Historique (données réelles mesurées pendant l'expérimentation) : mêmes
// formules exactes des deux côtés, aucune divergence possible.

export const SITE = { alt: 3, KRs: 0.16 };

export function getDOY(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

// das = jours après semis, calculés à la date `asOf` (par défaut aujourd'hui)
export function getDAS(semis, asOf = new Date()) {
  if (!semis) return 0;
  return Math.max(0, Math.floor((asOf - new Date(semis)) / 86400000));
}

export function getKc(cultures, culture, das) {
  const c = cultures[culture];
  if (!c) return 0.75;
  const [Li, Ld, Lm, Ll] = c.L;
  const [Ki, Km, Ke]     = c.Kc;
  if (das <= Li)          return Ki;
  if (das <= Li+Ld)       return Ki + (Km-Ki)*(das-Li)/Ld;
  if (das <= Li+Ld+Lm)    return Km;
  if (das <= Li+Ld+Lm+Ll) return Km + (Ke-Km)*(das-Li-Ld-Lm)/Ll;
  return Ke;
}

export function getStage(cultures, culture, das) {
  const c = cultures[culture];
  if (!c) return 'Inconnu';
  const [Li, Ld, Lm] = c.L;
  if (das <= Li)       return 'Initial';
  if (das <= Li+Ld)    return 'Développement';
  if (das <= Li+Ld+Lm) return 'Mi-saison';
  if (das <= c.cycle)  return 'Fin de saison';
  return 'Récolte';
}

// Ra extraterrestre (MJ/m²/j)
export function calcRa(lat, doy) {
  const phi = lat * Math.PI / 180;
  const dr  = 1 + 0.033 * Math.cos(2*Math.PI/365*doy);
  const dec = 0.409 * Math.sin(2*Math.PI/365*doy - 1.39);
  const ws  = Math.acos(-Math.tan(phi)*Math.tan(dec));
  return 24*60/Math.PI * 0.0820 * dr *
    (ws*Math.sin(phi)*Math.sin(dec) + Math.cos(phi)*Math.cos(dec)*Math.sin(ws));
}

// Rs — Hargreaves (Chapitre 3 mémoire: KRs=0.16)
export function calcRs(Tmax, Tmin, Ra) {
  return SITE.KRs * Math.sqrt(Math.max(0, Tmax - Tmin)) * Ra;
}

// ETo — Penman-Monteith FAO-56 (Chapitre 3 mémoire). u2 = vent à 2m (m/s).
export function calcETo(Tmax, Tmin, HR, u2, Rs, Ra) {
  const T   = (Tmax + Tmin) / 2;
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

// Vent à 2m (m/s) à partir d'un vent mesuré à 10m (m/s) — conversion FAO-56.
export function u2FromU10(u10) {
  return u10 * 0.748;
}

// P ajusté (mémoire: p_table + 0.04×(5-ETc), limité [0.1, 0.8])
export function calcPajuste(p_table, ETc) {
  return Math.min(0.8, Math.max(0.1, p_table + 0.04*(5-ETc)));
}

// RU = (Hcc-Hpf)/100 × Zr × 1000 (Chapitre III, mémoire — sans densité apparente)
export function calcRU(Hcc, Hpf, Zr) {
  return (Hcc - Hpf) / 100 * Zr * 1000;
}

// Seuil critique: Sc = Hcc/100 × Zr × 1000 - RFU (Chapitre III, mémoire)
export function calcSc(Hcc, Zr, RFU) {
  return (Hcc / 100) * Zr * 1000 - RFU;
}

// Stock d'eau actuel: Sa = θactuel × Zr × 1000 (Chapitre III, mémoire)
export function calcSa(humidite, Zr) {
  return (humidite / 100) * Zr * 1000;
}

// Di = ETc × superficie_plot (mémoire: plot 2m²)
export function calcDi(ETc, superficie) {
  return ETc * superficie;
}
