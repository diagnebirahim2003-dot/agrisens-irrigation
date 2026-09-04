import express from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const app = express();
const PORT = 4000;

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
const REALM = process.env.KEYCLOAK_REALM || 'agrotic';

const client = jwksClient({
  jwksUri: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

app.get('/validate', (req, res) => {
  const authHeader = req.headers['x-original-authorization'] || req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Missing token');
  }
  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
    if (err) {
      console.log('Token invalide:', err.message);
      return res.status(401).send('Invalid token');
    }
    res.status(200).json({ user: decoded.preferred_username, sub: decoded.sub });
  });
});

app.listen(PORT, () => console.log(`wilma-auth en écoute sur le port ${PORT}`));
