// Constantes agronomiques par culture (Kc, durées de stades, Zr, p, NPK optimal).
// Valeurs par défaut alignées sur le Protocole d'expérimentation et le
// Chapitre III du mémoire. Un Administrateur peut les surcharger depuis
// AdminPanel (persistées dans localStorage) — RG-I6.
const STORAGE_KEY = 'agrisens_cultures';

export const DEFAULT_CULTURES = {
  Laitue: {
    icon: '🥬', cycle: 55,
    Kc: [0.70, 1.05, 0.95],
    L:  [10, 15, 15, 15],
    Zr: 0.35, p: 0.30,
    NPK: { N: 150, P: 40, K: 120 },
  },
  Navet: {
    icon: '🌿', cycle: 55,
    Kc: [0.70, 1.00, 0.95],
    L:  [10, 15, 15, 15],
    Zr: 0.50, p: 0.50,
    NPK: { N: 100, P: 30, K: 100 },
  },
  Gombo: {
    icon: '🫛', cycle: 100,
    Kc: [0.40, 1.00, 0.75],
    L:  [20, 20, 30, 30],
    Zr: 0.60, p: 0.50,
    NPK: { N: 120, P: 60, K: 150 },
  },
};

// Fusionne la configuration enregistrée par l'Administrateur avec les
// valeurs par défaut, pour qu'un champ jamais modifié garde sa valeur de base.
export function getCultures() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && typeof stored === 'object') {
      const merged = {};
      for (const nom of Object.keys(DEFAULT_CULTURES)) {
        merged[nom] = {
          ...DEFAULT_CULTURES[nom],
          ...(stored[nom] || {}),
          NPK: { ...DEFAULT_CULTURES[nom].NPK, ...(stored[nom]?.NPK || {}) },
        };
      }
      return merged;
    }
  } catch { /* config invalide, on retombe sur les valeurs par défaut */ }
  return DEFAULT_CULTURES;
}

export function saveCultures(cultures) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cultures));
}

export function resetCultures() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getCulturesList() {
  const c = getCultures();
  return Object.entries(c).map(([nom, v]) => ({ nom, ...v }));
}
