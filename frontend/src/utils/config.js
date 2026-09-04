export const CONFIG = {
  KEYCLOAK_BASE_URL: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  KEYCLOAK_REALM: import.meta.env.VITE_KEYCLOAK_REALM || 'agrotic',
  KEYCLOAK_CLIENT: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'orion-pep',
  WILMA_URL: import.meta.env.VITE_WILMA_URL || 'http://localhost:1027/v2',
  APP_NAME: 'AgriSens',
  APP_VERSION: '1.0.0',
};

export const KEYCLOAK_TOKEN_URL =
  `${CONFIG.KEYCLOAK_BASE_URL}/realms/${CONFIG.KEYCLOAK_REALM}/protocol/openid-connect/token`;
