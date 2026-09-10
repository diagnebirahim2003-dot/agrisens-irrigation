import express from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const app = express();
app.use(express.json());
const PORT = 4000;

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const REALM = process.env.KEYCLOAK_REALM || 'agrotic';
// Client confidentiel dédié à la création de comptes (compte de service), jamais exposé au navigateur.
const REG_CLIENT_ID = process.env.REGISTRATION_CLIENT_ID || 'registration-service';
const REG_CLIENT_SECRET = process.env.REGISTRATION_CLIENT_SECRET || '';
const ROLES_VALIDES = ['admin', 'technicien', 'agronome'];

const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function verifyToken(authHeader) {
  return new Promise((resolve, reject) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return reject(new Error('Token manquant'));
    const token = authHeader.split(' ')[1];
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

app.get('/validate', (req, res) => {
  const authHeader = req.headers['x-original-authorization'] || req.headers['authorization'];
  verifyToken(authHeader)
    .then(decoded => res.status(200).json({ user: decoded.preferred_username, sub: decoded.sub }))
    .catch(err => { console.log('Token invalide:', err.message); res.status(401).send('Invalid token'); });
});

// Token d'admin technique (compte de service) — jamais transmis au client.
async function getServiceToken() {
  const res = await fetch(`${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: REG_CLIENT_ID,
      client_secret: REG_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Impossible d'obtenir un jeton de service Keycloak (${res.status})`);
  const data = await res.json();
  return data.access_token;
}

// Crée un utilisateur Keycloak et lui assigne un rôle réaliste (realm role).
async function createKeycloakUser({ username, email, password, nom, prenom, role }, serviceToken) {
  const createRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceToken}` },
    body: JSON.stringify({
      username, email, firstName: prenom, lastName: nom, enabled: true, emailVerified: true,
      credentials: [{ type: 'password', value: password, temporary: false }],
    }),
  });
  if (createRes.status === 409) {
    const err = new Error('Ce nom d\'utilisateur ou cet email existe déjà.');
    err.status = 409;
    throw err;
  }
  if (!createRes.ok) {
    const body = await createRes.text();
    const err = new Error(`Keycloak (${createRes.status}) : ${body}`);
    err.status = createRes.status;
    throw err;
  }

  const location = createRes.headers.get('location');
  const userId = location?.split('/').pop();
  if (userId) {
    const roleRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${role}`, {
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    if (roleRes.ok) {
      const roleObj = await roleRes.json();
      await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${userId}/role-mappings/realm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceToken}` },
        body: JSON.stringify([roleObj]),
      });
    }
  }
}

// Inscription publique — toujours créée avec le rôle "agronome" (jamais celui demandé
// par le client, pour empêcher une auto-élévation de privilège via ce endpoint public).
app.post('/register', async (req, res) => {
  const { username, email, password, nom, prenom } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Champs manquants (username, email, password requis).' });
  }
  try {
    const serviceToken = await getServiceToken();
    await createKeycloakUser({ username, email, password, nom, prenom, role: 'agronome' }, serviceToken);
    res.status(201).json({ ok: true, username, role: 'agronome' });
  } catch (err) {
    console.log('Erreur inscription:', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur lors de la création du compte.' });
  }
});

// Vérifie que l'appelant est authentifié et possède le rôle "admin" dans son propre jeton.
// Renvoie le payload décodé, ou envoie directement la réponse d'erreur et renvoie null.
async function requireAdmin(req, res) {
  let decoded;
  try {
    decoded = await verifyToken(req.headers['authorization']);
  } catch (err) {
    res.status(401).json({ error: 'Jeton invalide ou expiré.' });
    return null;
  }
  const callerRoles = decoded.realm_access?.roles || [];
  if (!callerRoles.includes('admin')) {
    res.status(403).json({ error: 'Seul un administrateur peut effectuer cette action.' });
    return null;
  }
  return decoded;
}

// Création d'utilisateur par un admin — n'importe quel rôle, mais seulement si l'appelant
// possède déjà lui-même le rôle "admin" dans son propre jeton.
app.post('/admin/users', async (req, res) => {
  const decoded = await requireAdmin(req, res);
  if (!decoded) return;

  const { username, email, password, nom, prenom, role } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Champs manquants (username, email, password requis).' });
  }
  const finalRole = ROLES_VALIDES.includes(role) ? role : 'agronome';

  try {
    const serviceToken = await getServiceToken();
    await createKeycloakUser({ username, email, password, nom, prenom, role: finalRole }, serviceToken);
    res.status(201).json({ ok: true, username, role: finalRole });
  } catch (err) {
    console.log('Erreur création utilisateur (admin):', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur lors de la création du compte.' });
  }
});

async function findUserByUsername(username, serviceToken) {
  const findRes = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${REALM}/users?username=${encodeURIComponent(username)}&exact=true`,
    { headers: { Authorization: `Bearer ${serviceToken}` } }
  );
  if (!findRes.ok) throw Object.assign(new Error('Recherche de l\'utilisateur impossible.'), { status: findRes.status });
  const found = await findRes.json();
  if (!found.length) throw Object.assign(new Error('Aucun compte Keycloak avec ce nom d\'utilisateur.'), { status: 404 });
  return found[0];
}

// Suppression définitive d'un compte Keycloak par un admin. L'utilisateur supprimé
// perd immédiatement toute possibilité de connexion tant qu'il ne se réinscrit pas.
app.delete('/admin/users/:username', async (req, res) => {
  const decoded = await requireAdmin(req, res);
  if (!decoded) return;

  const { username } = req.params;
  if (decoded.preferred_username === username) {
    return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  }

  try {
    const serviceToken = await getServiceToken();
    const user = await findUserByUsername(username, serviceToken);

    const delRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    if (!delRes.ok) throw Object.assign(new Error(`Keycloak (${delRes.status})`), { status: delRes.status });

    res.status(200).json({ ok: true, username });
  } catch (err) {
    console.log('Erreur suppression utilisateur (admin):', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur lors de la suppression du compte.' });
  }
});

// Liste tous les comptes réels du realm (source de vérité = Keycloak, jamais le
// localStorage d'un navigateur) avec leur rôle, pour le tableau de bord admin.
app.get('/admin/users', async (req, res) => {
  const decoded = await requireAdmin(req, res);
  if (!decoded) return;

  try {
    const serviceToken = await getServiceToken();
    const listRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users?max=500`, {
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    if (!listRes.ok) throw Object.assign(new Error(`Keycloak (${listRes.status})`), { status: listRes.status });
    const users = await listRes.json();

    const withRoles = await Promise.all(users.map(async u => {
      const rolesRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${u.id}/role-mappings/realm`, {
        headers: { Authorization: `Bearer ${serviceToken}` },
      });
      const roles = rolesRes.ok ? (await rolesRes.json()).map(r => r.name) : [];
      const role = ROLES_VALIDES.find(r => roles.includes(r)) || 'agronome';
      return {
        username: u.username, email: u.email,
        nom: u.lastName || '', prenom: u.firstName || '',
        enabled: u.enabled, role,
        createdAt: u.createdTimestamp ? new Date(u.createdTimestamp).toISOString() : null,
      };
    }));

    res.status(200).json(withRoles);
  } catch (err) {
    console.log('Erreur listing utilisateurs (admin):', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur lors de la lecture des comptes.' });
  }
});

// Change le rôle réel (realm role) d'un utilisateur — remplace tout rôle
// admin/technicien/agronome existant par le nouveau.
app.put('/admin/users/:username/role', async (req, res) => {
  const decoded = await requireAdmin(req, res);
  if (!decoded) return;

  const { username } = req.params;
  const { role } = req.body || {};
  if (decoded.preferred_username === username) {
    return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle.' });
  }
  if (!ROLES_VALIDES.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide.' });
  }

  try {
    const serviceToken = await getServiceToken();
    const user = await findUserByUsername(username, serviceToken);
    const mappingsUrl = `${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}/role-mappings/realm`;

    const currentRes = await fetch(mappingsUrl, { headers: { Authorization: `Bearer ${serviceToken}` } });
    const current = currentRes.ok ? await currentRes.json() : [];
    const toRemove = current.filter(r => ROLES_VALIDES.includes(r.name));
    if (toRemove.length) {
      await fetch(mappingsUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceToken}` },
        body: JSON.stringify(toRemove),
      });
    }

    const roleRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/roles/${role}`, {
      headers: { Authorization: `Bearer ${serviceToken}` },
    });
    if (!roleRes.ok) throw Object.assign(new Error(`Rôle "${role}" introuvable dans Keycloak.`), { status: 500 });
    const roleObj = await roleRes.json();
    await fetch(mappingsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceToken}` },
      body: JSON.stringify([roleObj]),
    });

    res.status(200).json({ ok: true, username, role });
  } catch (err) {
    console.log('Erreur changement de rôle (admin):', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur lors du changement de rôle.' });
  }
});

// Réinitialise le mot de passe d'un utilisateur (nouveau mot de passe définitif,
// pas temporaire — l'utilisateur n'a rien à changer à sa prochaine connexion).
app.put('/admin/users/:username/password', async (req, res) => {
  const decoded = await requireAdmin(req, res);
  if (!decoded) return;

  const { username } = req.params;
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (minimum 6 caractères).' });
  }

  try {
    const serviceToken = await getServiceToken();
    const user = await findUserByUsername(username, serviceToken);
    const resetRes = await fetch(`${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user.id}/reset-password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceToken}` },
      body: JSON.stringify({ type: 'password', value: password, temporary: false }),
    });
    if (!resetRes.ok) throw Object.assign(new Error(`Keycloak (${resetRes.status})`), { status: resetRes.status });

    res.status(200).json({ ok: true, username });
  } catch (err) {
    console.log('Erreur réinitialisation mot de passe (admin):', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Erreur serveur lors de la réinitialisation.' });
  }
});

app.listen(PORT, () => console.log(`wilma-auth en écoute sur le port ${PORT}`));
