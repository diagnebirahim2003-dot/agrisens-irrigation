export const CONFIG = {
  // Passe par Wilma (nginx, port 1027) plutôt que directement par Keycloak (8080) :
  // c'est nginx qui gère le CORS preflight (OPTIONS), y compris en local.
  KEYCLOAK_BASE_URL: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:1027',
  KEYCLOAK_REALM: import.meta.env.VITE_KEYCLOAK_REALM || 'agrotic',
  KEYCLOAK_CLIENT: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'orion-pep',
  WILMA_URL: import.meta.env.VITE_WILMA_URL || 'http://localhost:1027/v2',
  APP_NAME: 'AgriSens',
  APP_VERSION: '1.0.0',
};

export const KEYCLOAK_TOKEN_URL =
  `${CONFIG.KEYCLOAK_BASE_URL}/realms/${CONFIG.KEYCLOAK_REALM}/protocol/openid-connect/token`;
