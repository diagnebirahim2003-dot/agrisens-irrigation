// Client NGSI-v2 minimal pour les entités "Parcelle", via Wilma (PEP Proxy)
// devant Orion Context Broker. Toute requête doit porter le jeton JWT de
// l'utilisateur connecté — Wilma la valide (wilma-auth/Keycloak) avant de la
// transmettre à Orion ; le header FIWARE-Service est ajouté par nginx.
import { CONFIG } from './config';

function headers(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function readBody(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

function toEntity(p) {
  return {
    id: p.id || `Parcelle-${Date.now()}`,
    type: 'Parcelle',
    nom:        { value: p.nom,        type: 'Text' },
    culture:    { value: p.culture,    type: 'Text' },
    sol:        { value: p.sol,        type: 'Text' },
    semis:      { value: p.semis,      type: 'Text' },
    superficie: { value: p.superficie, type: 'Number' },
    lat:        { value: p.lat,        type: 'Number' },
    lng:        { value: p.lng,        type: 'Number' },
    region:     { value: p.region,     type: 'Text' },
    owner:      { value: p.owner,      type: 'Text' },
    ownerName:  { value: p.ownerName,  type: 'Text' },
    createdAt:  { value: p.createdAt,  type: 'DateTime' },
  };
}

function fromEntity(e) {
  return {
    id: e.id,
    nom: e.nom?.value,
    culture: e.culture?.value,
    sol: e.sol?.value,
    semis: e.semis?.value,
    superficie: e.superficie?.value,
    lat: e.lat?.value,
    lng: e.lng?.value,
    region: e.region?.value,
    owner: e.owner?.value,
    ownerName: e.ownerName?.value,
    createdAt: e.createdAt?.value,
  };
}

// Liste les parcelles ; { owner } restreint via le query language NGSI-v2 (q=owner:<email>).
export async function listParcelles(token, { owner } = {}) {
  const params = new URLSearchParams({ type: 'Parcelle', limit: '1000' });
  if (owner) params.set('q', `owner:${owner}`);
  const res = await fetch(`${CONFIG.WILMA_URL}/entities?${params}`, { headers: headers(token) });
  if (!res.ok) {
    const body = await readBody(res);
    throw new Error(`Orion (${res.status}) — lecture des parcelles impossible : ${body?.description || res.statusText}`);
  }
  const entities = await res.json();
  return entities.map(fromEntity);
}

export async function createParcelle(token, parcelle) {
  const entity = toEntity(parcelle);
  const res = await fetch(`${CONFIG.WILMA_URL}/entities`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(entity),
  });
  if (!res.ok) {
    const body = await readBody(res);
    throw new Error(`Orion (${res.status}) — création de la parcelle impossible : ${body?.description || res.statusText}`);
  }
  return fromEntity(entity);
}

export async function deleteParcelle(token, id) {
  const res = await fetch(`${CONFIG.WILMA_URL}/entities/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(token),
  });
  if (!res.ok) {
    const body = await readBody(res);
    throw new Error(`Orion (${res.status}) — suppression de la parcelle impossible : ${body?.description || res.statusText}`);
  }
}
