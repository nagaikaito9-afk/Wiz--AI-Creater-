/**
 * Auth0 Configuration for Wiz AI Game Creator
 * 
 * Auth0のダッシュボードで取得した「Domain」と「Client ID」をここに設定します。
 * 画面上の設定フォームから入力してlocalStorageに保存することも可能です。
 */

const DEFAULT_AUTH0_DOMAIN = 'dev-xjylz200ex5v8gyt.jp.auth0.com';
const DEFAULT_AUTH0_CLIENT_ID = 'X7Z5kU5v0fuobpqvDlZoXf0IkWYlPp2q';

window.AUTH0_CONFIG = {
  // localStorageに保存されている値があれば優先
  get domain() {
    return localStorage.getItem('wiz_auth0_domain') || DEFAULT_AUTH0_DOMAIN;
  },
  set domain(val) {
    if (val) localStorage.setItem('wiz_auth0_domain', val.trim());
    else localStorage.removeItem('wiz_auth0_domain');
  },

  get clientId() {
    return localStorage.getItem('wiz_auth0_client_id') || DEFAULT_AUTH0_CLIENT_ID;
  },
  set clientId(val) {
    if (val) localStorage.setItem('wiz_auth0_client_id', val.trim());
    else localStorage.removeItem('wiz_auth0_client_id');
  },

  isConfigured() {
    return Boolean(this.domain && this.clientId);
  }
};
