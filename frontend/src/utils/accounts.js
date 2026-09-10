// Création de comptes Keycloak via wilma-auth (jamais directement depuis le
// navigateur — la création d'utilisateurs Keycloak exige un jeton de service
// que seul le serveur détient).
import { CONFIG } from './config';

async function readBody(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text }; }
}

// Inscription publique — toujours créée côté serveur avec le rôle "agronome".
export async function registerAccount({ username, email, password, nom, prenom }) {
  const res = await fetch(`${CONFIG.KEYCLOAK_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ username, email, password, nom, prenom }),
  });
  const body = await readBody(res);
  if (!res.ok) throw new Error(body.error || `Erreur (${res.status})`);
  return body;
}

// Création d'un compte par un administrateur — n'importe quel rôle, vérifié côté serveur.
export async function createAccountAsAdmin(token, { username, email, password, nom, prenom, role }) {
  const res = await fetch(`${CONFIG.KEYCLOAK_BASE_URL}/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ username, email, password, nom, prenom, role }),
  });
  const body = await readBody(res);
  if (!res.ok) throw new Error(body.error || `Erreur (${res.status})`);
  return body;
}
