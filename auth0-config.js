/**
 * Auth0 Production Configuration for Wiz AI Game Creator
 * 
 * Secure, immutable production configuration.
 * Client-side tampering via localStorage or input injection is strictly prevented.
 */

const PRODUCTION_AUTH0_DOMAIN = 'dev-xjylz200ex5v8gyt.jp.auth0.com';
const PRODUCTION_AUTH0_CLIENT_ID = 'X7Z5kU5v0fuobpqvDlZoXf0IkWYlPp2q';

// Clean up any legacy localStorage tampering overrides
try {
  localStorage.removeItem('wiz_auth0_domain');
  localStorage.removeItem('wiz_auth0_client_id');
} catch (e) {}

// Immutable, read-only configuration
window.AUTH0_CONFIG = Object.freeze({
  domain: PRODUCTION_AUTH0_DOMAIN,
  clientId: PRODUCTION_AUTH0_CLIENT_ID,
  isConfigured() {
    return true;
  }
});
