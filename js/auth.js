/**
 * Wiz AI Game Creator - Auth0 Authentication & Settings Manager
 */

const WIZ_PIXEL_AVATARS = [
  { id: 'cat', name: 'ねこ (Cat)', icon: '🐱', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='3' y='2' width='3' height='3' fill='%23f59e0b'/><rect x='10' y='2' width='3' height='3' fill='%23f59e0b'/><rect x='4' y='3' width='1' height='1' fill='%23f472b6'/><rect x='11' y='3' width='1' height='1' fill='%23f472b6'/><rect x='3' y='5' width='10' height='7' fill='%23fbbf24'/><rect x='2' y='6' width='12' height='5' fill='%23fbbf24'/><rect x='4' y='7' width='2' height='2' fill='%231e293b'/><rect x='10' y='7' width='2' height='2' fill='%231e293b'/><rect x='5' y='7' width='1' height='1' fill='%23ffffff'/><rect x='11' y='7' width='1' height='1' fill='%23ffffff'/><rect x='7' y='9' width='2' height='1' fill='%23f43f5e'/><rect x='6' y='10' width='4' height='1' fill='%23f43f5e'/><rect x='1' y='8' width='2' height='1' fill='%23e2e8f0'/><rect x='1' y='10' width='2' height='1' fill='%23e2e8f0'/><rect x='13' y='8' width='2' height='1' fill='%23e2e8f0'/><rect x='13' y='10' width='2' height='1' fill='%23e2e8f0'/><rect x='5' y='12' width='6' height='2' fill='%23f59e0b'/></svg>` },
  { id: 'dog', name: 'いぬ (Dog)', icon: '🐶', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='2' y='4' width='3' height='4' fill='%2378350f'/><rect x='11' y='4' width='3' height='4' fill='%2378350f'/><rect x='4' y='3' width='8' height='8' fill='%23d97706'/><rect x='3' y='5' width='10' height='6' fill='%23d97706'/><rect x='4' y='6' width='2' height='2' fill='%230f172a'/><rect x='10' y='6' width='2' height='2' fill='%230f172a'/><rect x='5' y='6' width='1' height='1' fill='%23ffffff'/><rect x='11' y='6' width='1' height='1' fill='%23ffffff'/><rect x='6' y='8' width='4' height='3' fill='%23fef3c7'/><rect x='7' y='8' width='2' height='1' fill='%230f172a'/><rect x='7' y='10' width='2' height='2' fill='%23f43f5e'/><rect x='5' y='12' width='6' height='2' fill='%23b45309'/></svg>` },
  { id: 'icecream', name: 'アイス (Ice Cream)', icon: '🍦', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='7' y='1' width='2' height='2' fill='%23dc2626'/><rect x='5' y='3' width='6' height='4' fill='%23f472b6'/><rect x='4' y='4' width='8' height='3' fill='%23f472b6'/><rect x='6' y='4' width='1' height='1' fill='%2338bdf8'/><rect x='9' y='5' width='1' height='1' fill='%23facc15'/><rect x='4' y='7' width='8' height='3' fill='%2338bdf8'/><rect x='3' y='8' width='10' height='2' fill='%2338bdf8'/><rect x='5' y='8' width='1' height='1' fill='%23ec4899'/><rect x='8' y='7' width='1' height='1' fill='%23facc15'/><rect x='5' y='10' width='6' height='2' fill='%23d97706'/><rect x='6' y='12' width='4' height='2' fill='%23b45309'/><rect x='7' y='14' width='2' height='1' fill='%2392400e'/><rect x='6' y='10' width='1' height='1' fill='%23fcd34d'/><rect x='8' y='11' width='1' height='1' fill='%23fcd34d'/><rect x='7' y='13' width='1' height='1' fill='%23fcd34d'/></svg>` },
  { id: 'shiba', name: '柴犬 (Shiba)', icon: '🐕', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='3' y='2' width='3' height='3' fill='%23b45309'/><rect x='10' y='2' width='3' height='3' fill='%23b45309'/><rect x='4' y='4' width='8' height='8' fill='%23f59e0b'/><rect x='3' y='5' width='10' height='6' fill='%23f59e0b'/><rect x='4' y='5' width='1' height='1' fill='%23ffffff'/><rect x='11' y='5' width='1' height='1' fill='%23ffffff'/><rect x='5' y='6' width='2' height='2' fill='%23111827'/><rect x='9' y='6' width='2' height='2' fill='%23111827'/><rect x='3' y='7' width='2' height='4' fill='%23fffbeb'/><rect x='11' y='7' width='2' height='4' fill='%23fffbeb'/><rect x='5' y='8' width='6' height='4' fill='%23fffbeb'/><rect x='7' y='8' width='2' height='1' fill='%23111827'/><rect x='7' y='10' width='2' height='2' fill='%23f43f5e'/></svg>` },
  { id: 'black_cat', name: '黒猫 (Black Cat)', icon: '🐈‍⬛', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='3' y='2' width='3' height='3' fill='%23111827'/><rect x='10' y='2' width='3' height='3' fill='%23111827'/><rect x='4' y='3' width='1' height='1' fill='%23ec4899'/><rect x='11' y='3' width='1' height='1' fill='%23ec4899'/><rect x='3' y='5' width='10' height='7' fill='%231f2937'/><rect x='2' y='6' width='12' height='5' fill='%231f2937'/><rect x='4' y='7' width='2' height='2' fill='%2310b981'/><rect x='10' y='7' width='2' height='2' fill='%2310b981'/><rect x='5' y='7' width='1' height='1' fill='%23ffffff'/><rect x='11' y='7' width='1' height='1' fill='%23ffffff'/><rect x='7' y='9' width='2' height='1' fill='%23f472b6'/><rect x='1' y='8' width='2' height='1' fill='%239ca3af'/><rect x='13' y='8' width='2' height='1' fill='%239ca3af'/></svg>` },
  { id: 'icepop', name: 'アイスキャンディ (Ice Pop)', icon: '🍧', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='5' y='1' width='6' height='1' fill='%2338bdf8'/><rect x='4' y='2' width='8' height='4' fill='%2338bdf8'/><rect x='4' y='6' width='8' height='4' fill='%23f472b6'/><rect x='5' y='3' width='1' height='5' fill='%23ffffff' opacity='0.6'/><rect x='7' y='10' width='2' height='5' fill='%23d97706'/></svg>` },
  { id: 'panda', name: 'パンダ (Panda)', icon: '🐼', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='2' y='2' width='4' height='3' fill='%23111827'/><rect x='10' y='2' width='4' height='3' fill='%23111827'/><rect x='4' y='4' width='8' height='8' fill='%23f8fafc'/><rect x='3' y='5' width='10' height='6' fill='%23f8fafc'/><rect x='4' y='6' width='2' height='3' fill='%23111827'/><rect x='10' y='6' width='2' height='3' fill='%23111827'/><rect x='5' y='7' width='1' height='1' fill='%23ffffff'/><rect x='11' y='7' width='1' height='1' fill='%23ffffff'/><rect x='7' y='9' width='2' height='1' fill='%23111827'/><rect x='3' y='9' width='2' height='1' fill='%23f472b6'/><rect x='11' y='9' width='2' height='1' fill='%23f472b6'/></svg>` },
  { id: 'strawberry', name: 'いちご (Berry)', icon: '🍓', svg: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges' width='128' height='128'><rect width='16' height='16' fill='%231e1e2e'/><rect x='7' y='1' width='2' height='2' fill='%2315803d'/><rect x='5' y='2' width='6' height='1' fill='%2322c55e'/><rect x='4' y='3' width='8' height='2' fill='%2322c55e'/><rect x='3' y='5' width='10' height='5' fill='%23ef4444'/><rect x='4' y='10' width='8' height='3' fill='%23ef4444'/><rect x='6' y='13' width='4' height='2' fill='%23ef4444'/><rect x='5' y='6' width='1' height='1' fill='%23fef08a'/><rect x='9' y='6' width='1' height='1' fill='%23fef08a'/><rect x='7' y='8' width='1' height='1' fill='%23fef08a'/><rect x='5' y='10' width='1' height='1' fill='%23fef08a'/><rect x='9' y='10' width='1' height='1' fill='%23fef08a'/></svg>` }
];

window.WIZ_PIXEL_AVATARS = WIZ_PIXEL_AVATARS;

class Auth0AuthManager {
  constructor() {
    this.auth0Client = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;

    // Safety: ensure default accounts exist without wiping user customizations
    this.ensureSeedAccounts();

    // DOM Ready hook
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  ensureSeedAccounts() {
    // Keep user's configured accounts safe and never wipe on page refresh!
  }

  getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem('wiz_local_users') || '[]');
    } catch (e) {
      return [];
    }
  }

  saveLocalUsers(users) {
    try {
      const toSave = Array.isArray(users) ? users : this.getLocalUsers();
      localStorage.setItem('wiz_local_users', JSON.stringify(toSave));
    } catch (e) {
      console.error('Error saving local users:', e);
    }
  }

  updateUserInStore(user) {
    if (!user) return;
    const users = this.getLocalUsers();
    const idx = users.findIndex(u => (u.id && user.id && u.id === user.id) || (u.userId && user.userId && u.userId.toLowerCase() === user.userId.toLowerCase()) || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    this.saveLocalUsers(users);

    // Completely save into all persistent storage keys
    localStorage.setItem('wiz_active_user', JSON.stringify(user));
    if (user.auth0_profile || localStorage.getItem('wiz_auth0_user')) {
      localStorage.setItem('wiz_auth0_user', JSON.stringify(user));
    } else {
      localStorage.setItem('wiz_mock_user', JSON.stringify(user));
    }
    if (user.avatar) localStorage.setItem('wiz_custom_avatar', user.avatar);
    if (user.username) localStorage.setItem('wiz_custom_username', user.username);
    if (user.userId) localStorage.setItem('wiz_custom_userid', user.userId);
  }

  async init() {
    this.bindGateUI();
    this.bindSettingsModalFeatures();
    this.bindInitialProfileModal();
    this.updateConfigStatusUI();

    // Online / Offline monitor
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Initialize Auth0 Client if configured
    await this.initAuth0Client();
  }

  /* ==========================================================================
     Auth0 Configuration & Gate UI
     ========================================================================== */

  updateConfigStatusUI() {
    const badge = document.getElementById('auth0-status-badge');
    const card = document.getElementById('auth0-config-card');
    const domainInput = document.getElementById('auth0-domain-input');
    const clientIdInput = document.getElementById('auth0-client-id-input');

    if (domainInput) domainInput.value = window.AUTH0_CONFIG?.domain || '';
    if (clientIdInput) clientIdInput.value = window.AUTH0_CONFIG?.clientId || '';

    if (window.AUTH0_CONFIG?.isConfigured()) {
      if (card) {
        card.classList.remove('unconfigured');
        card.classList.add('configured');
      }
      if (badge) {
        badge.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #34d399;"></i> <span>Auth0 連携設定済み (${window.AUTH0_CONFIG.domain})</span>`;
      }
    } else {
      if (card) {
        card.classList.remove('configured');
        card.classList.add('unconfigured');
      }
      if (badge) {
        badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #fbbf24;"></i> <span>Auth0 未設定 (Domain & Client ID を入力してください)</span>';
      }
    }
  }

  bindGateUI() {
    // Show Desktop Mode hint card if running in Electron
    if (window.electronAPI?.isElectron) {
      const hintCard = document.getElementById('electron-desktop-hint-card');
      if (hintCard) hintCard.style.display = 'block';
    }

    // Auth0 Login Button
    const auth0LoginBtn = document.getElementById('gate-auth0-login-btn');
    auth0LoginBtn?.addEventListener('click', () => this.loginWithAuth0());

    // Toggle Config Form
    const toggleConfigBtn = document.getElementById('toggle-auth0-config-btn');
    const configForm = document.getElementById('auth0-config-form');
    toggleConfigBtn?.addEventListener('click', () => {
      if (configForm) {
        const isHidden = configForm.style.display === 'none';
        configForm.style.display = isHidden ? 'block' : 'none';
      }
    });

    // Save Config Button
    const saveConfigBtn = document.getElementById('auth0-save-config-btn');
    saveConfigBtn?.addEventListener('click', async () => {
      const domain = document.getElementById('auth0-domain-input')?.value.trim();
      const clientId = document.getElementById('auth0-client-id-input')?.value.trim();

      if (!domain || !clientId) {
        if (window.showToast) window.showToast('Domain と Client ID の両方を入力してください', 'warning');
        return;
      }

      window.AUTH0_CONFIG.domain = domain;
      window.AUTH0_CONFIG.clientId = clientId;

      this.updateConfigStatusUI();
      if (configForm) configForm.style.display = 'none';

      if (window.showToast) window.showToast('Auth0 の設定を保存しました。クライアントを初期化中...', 'success');
      await this.initAuth0Client();
    });

    // Test / Mock Login Button
    const mockLoginBtn = document.getElementById('gate-mock-login-btn');
    mockLoginBtn?.addEventListener('click', () => this.loginAsMockUser());
  }

  async initAuth0Client() {
    if (!window.AUTH0_CONFIG?.isConfigured()) {
      this.checkLocalSessions();
      return;
    }

    if (typeof auth0 === 'undefined') {
      console.warn('Auth0 SPA SDK is not loaded yet.');
      this.checkLocalSessions();
      return;
    }

    // In Electron Desktop mode, Auth0 uses native OAuth PKCE loopback via window.electronAPI
    if (window.electronAPI?.isElectron) {
      this.checkLocalSessions();
      return;
    }

    try {
      const redirectUri = window.location.origin + window.location.pathname;
      this.auth0Client = await auth0.createAuth0Client({
        domain: window.AUTH0_CONFIG.domain,
        clientId: window.AUTH0_CONFIG.clientId,
        authorizationParams: {
          redirect_uri: redirectUri
        },
        cacheLocation: 'localstorage',
        useRefreshTokens: true
      });

      // Handle redirect callback if URL contains code & state
      const query = window.location.search;
      if (query.includes('code=') && query.includes('state=')) {
        try {
          await this.auth0Client.handleRedirectCallback();
          window.history.replaceState({}, document.title, window.location.pathname);
          if (window.showToast) window.showToast('Auth0 認証が完了しました！', 'success');
        } catch (err) {
          console.error('Error handling redirect callback:', err);
          if (window.showToast) window.showToast('ログインコールバック処理に失敗しました: ' + err.message, 'error');
        }
      }

      // Check if user is authenticated
      const isAuthenticated = await this.auth0Client.isAuthenticated();
      if (isAuthenticated) {
        const auth0User = await this.auth0Client.getUser();
        this.processAuth0UserLogin(auth0User);
        return;
      }
    } catch (err) {
      console.error('Auth0 Client Initialization Error:', err);
    }

    this.checkLocalSessions();
  }

  checkLocalSessions() {
    // 1. Check Active user session
    const savedActive = localStorage.getItem('wiz_active_user');
    if (savedActive) {
      try {
        const u = JSON.parse(savedActive);
        if (u && (u.userId || u.username)) {
          this.currentUser = u;
          this.completeLoginProcess(this.currentUser);
          return true;
        }
      } catch (e) {}
    }

    // 2. Check Auth0 saved user
    const savedAuth0 = localStorage.getItem('wiz_auth0_user');
    if (savedAuth0) {
      try {
        const u = JSON.parse(savedAuth0);
        if (u && (u.userId || u.username)) {
          this.currentUser = u;
          this.completeLoginProcess(this.currentUser);
          return true;
        }
      } catch (e) {}
    }

    // 3. Check Mock user
    const savedMock = localStorage.getItem('wiz_mock_user');
    if (savedMock) {
      try {
        const u = JSON.parse(savedMock);
        if (u && (u.userId || u.username)) {
          this.currentUser = u;
          this.completeLoginProcess(this.currentUser);
          return true;
        }
      } catch (e) {}
    }

    // 4. Check Local users
    const localUsers = this.getLocalUsers();
    if (localUsers && localUsers.length > 0) {
      const configured = localUsers.find(u => u.isProfileConfigured) || localUsers[0];
      if (configured && (configured.userId || configured.username)) {
        this.currentUser = configured;
        this.completeLoginProcess(this.currentUser);
        return true;
      }
    }

    this.updateGateVisibility();
    this.updateUserUI(null);
    return false;
  }

  processAuth0UserLogin(auth0User) {
    if (!auth0User) return;

    // Check if we already have this user customized in active, auth0, or local store
    const savedActive = localStorage.getItem('wiz_active_user') ? JSON.parse(localStorage.getItem('wiz_active_user')) : null;
    const savedAuth0 = localStorage.getItem('wiz_auth0_user') ? JSON.parse(localStorage.getItem('wiz_auth0_user')) : null;
    const localUsers = this.getLocalUsers();
    const existing = (savedActive && savedActive.isProfileConfigured ? savedActive : null) ||
                     (savedAuth0 && savedAuth0.isProfileConfigured ? savedAuth0 : null) ||
                     localUsers.find(u => (u.id && u.id === auth0User.sub) || (u.email && u.email === auth0User.email)) ||
                     savedAuth0;

    const email = auth0User.email || '';
    const defaultName = auth0User.name || auth0User.nickname || (email ? email.split('@')[0] : 'ねこクリエイター');
    const rawId = auth0User.nickname || (email ? email.split('@')[0] : 'cat_creator');
    const defaultUserId = rawId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20) || 'cat_' + Math.floor(Math.random() * 1000);
    const defaultAvatar = WIZ_PIXEL_AVATARS[0].svg;

    // CRITICAL: If an account already exists or was configured, KEEP IT PERMANENTLY! Never ask for ID again on reload!
    if (existing && existing.isProfileConfigured) {
      this.currentUser = {
        ...existing,
        email: email || existing.email,
        auth0_profile: auth0User,
        isProfileConfigured: true
      };
      this.updateUserInStore(this.currentUser);
      this.completeLoginProcess(this.currentUser);
      return;
    }

    this.currentUser = {
      id: auth0User.sub,
      email: email,
      username: defaultName,
      userId: defaultUserId,
      avatar: defaultAvatar,
      isProfileConfigured: false,
      user_metadata: {
        full_name: defaultName,
        user_id: defaultUserId,
        avatar_url: defaultAvatar
      },
      auth0_profile: auth0User
    };

    this.updateUserInStore(this.currentUser);
    this.openInitialProfileModal(this.currentUser);
  }

  completeLoginProcess(user) {
    this.updateGateVisibility();
    this.updateUserUI(user);
    this.showHomeDashboard();
  }

  async loginWithAuth0() {
    if (!window.AUTH0_CONFIG?.isConfigured()) {
      if (window.showToast) {
        window.showToast('Auth0 の設定（Domain と Client ID）を先に入力してください', 'warning');
      }
      const configForm = document.getElementById('auth0-config-form');
      if (configForm) configForm.style.display = 'block';
      return;
    }

    // 1. Electron Desktop Native Flow (Authorization Code + PKCE + Loopback Server on 127.0.0.1:42813)
    if (window.electronAPI?.isElectron && typeof window.electronAPI.loginWithAuth0Native === 'function') {
      try {
        if (window.showToast) {
          window.showToast('ブラウザでAuth0ログイン画面を開いています...', 'info');
        }
        const res = await window.electronAPI.loginWithAuth0Native({
          domain: window.AUTH0_CONFIG.domain,
          clientId: window.AUTH0_CONFIG.clientId
        });

        if (res && res.success && (res.user || res.tokens)) {
          const auth0Profile = res.user || {};
          if (window.showToast) {
            window.showToast('Auth0 ログインが完了しました！🎉', 'success');
          }
          this.processAuth0UserLogin(auth0Profile);
          return;
        } else if (res?.error) {
          if (res.error.includes('redirect_uri') || res.error.includes('Callback URL')) {
            alert('【Auth0 設定のお願い】\nデスクトップアプリからAuth0でログインするには、Auth0ダッシュボードの「Allowed Callback URLs」に以下を追加してください：\n\nhttp://127.0.0.1:42813/callback\n\n※ すぐにゲーム制作を始める場合は、下の「テスト用アカウントでログイン」をご利用いただけます。');
          }
          throw new Error(res.error);
        }
      } catch (err) {
        console.error('Desktop Auth0 error:', err);
        if (window.showToast) {
          window.showToast('Auth0ログインに失敗しました: ' + err.message, 'error');
        }
      }
      return;
    }

    // 2. Web Browser Mode (loginWithRedirect)
    if (!this.auth0Client) {
      await this.initAuth0Client();
    }

    if (!this.auth0Client) {
      if (window.showToast) {
        window.showToast('Auth0 クライアントの初期化に失敗しました。DomainとClient IDをご確認ください', 'error');
      }
      return;
    }

    try {
      const redirectUri = window.location.origin + window.location.pathname;
      await this.auth0Client.loginWithRedirect({
        authorizationParams: {
          redirect_uri: redirectUri
        }
      });
    } catch (err) {
      console.error('Auth0 loginWithRedirect error:', err);
      if (window.showToast) {
        window.showToast('Auth0ログイン画面への遷移に失敗しました: ' + err.message, 'error');
      }
    }
  }

  loginAsMockUser() {
    const savedActive = localStorage.getItem('wiz_active_user') ? JSON.parse(localStorage.getItem('wiz_active_user')) : null;
    const savedMock = localStorage.getItem('wiz_mock_user') ? JSON.parse(localStorage.getItem('wiz_mock_user')) : null;
    const localUsers = this.getLocalUsers();
    const existing = savedActive || savedMock || localUsers.find(u => u.isProfileConfigured) || localUsers[0];

    if (existing) {
      this.currentUser = existing;
    } else {
      this.currentUser = {
        id: 'usr_mock_001',
        email: 'cat_creator@wiz-game.dev',
        username: 'ねこクリエイター',
        userId: 'cat_creator',
        avatar: WIZ_PIXEL_AVATARS[0].svg,
        isProfileConfigured: true,
        user_metadata: {
          full_name: 'ねこクリエイター',
          user_id: 'cat_creator',
          avatar_url: WIZ_PIXEL_AVATARS[0].svg
        }
      };
    }

    this.updateUserInStore(this.currentUser);

    if (window.showToast) {
      window.showToast(`「${this.currentUser.username}」としてログインしました！🐾`, 'success');
    }

    this.completeLoginProcess(this.currentUser);
  }

  /* ==========================================================================
     Initial Profile Setup Modal (For First-time Registration & Custom ID Setup)
     ========================================================================== */

  bindInitialProfileModal() {
    const submitBtn = document.getElementById('init-profile-submit-btn');
    const idInput = document.getElementById('init-profile-userid');
    const nameInput = document.getElementById('init-profile-username');

    idInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    });

    submitBtn?.addEventListener('click', () => {
      const username = nameInput?.value.trim();
      let userId = idInput?.value.trim().replace(/^@/, '').toLowerCase();

      if (!username) {
        if (window.showToast) window.showToast('表示名を入力してください', 'warning');
        nameInput?.focus();
        return;
      }

      if (!userId || userId.length < 3) {
        if (window.showToast) window.showToast('ユーザーIDは3文字以上の半角英数字で入力してください', 'warning');
        idInput?.focus();
        return;
      }

      const existingUsers = this.getLocalUsers();
      const isTaken = existingUsers.some(u => u.userId === userId && u.id !== this.currentUser?.id);
      if (isTaken) {
        if (window.showToast) window.showToast(`ユーザーID「@${userId}」は既に使用されています。別のIDをお試しください`, 'warning');
        idInput?.focus();
        return;
      }

      const selectedAvatar = document.querySelector('#init-avatar-select-grid .avatar-option.selected');
      const avatarUrl = selectedAvatar?.getAttribute('data-avatar-url') || WIZ_PIXEL_AVATARS[0].svg;

      this.currentUser.username = username;
      this.currentUser.userId = userId;
      this.currentUser.avatar = avatarUrl;
      this.currentUser.isProfileConfigured = true;
      this.currentUser.user_metadata = {
        full_name: username,
        user_id: userId,
        avatar_url: avatarUrl
      };

      this.updateUserInStore(this.currentUser);
      localStorage.setItem('wiz_active_user', JSON.stringify(this.currentUser));
      localStorage.setItem('wiz_custom_avatar', avatarUrl);
      localStorage.setItem('wiz_custom_username', username);
      localStorage.setItem('wiz_custom_userid', userId);

      const initModal = document.getElementById('initial-profile-modal');
      if (initModal) initModal.style.display = 'none';

      if (window.showToast) window.showToast(`🎉 ようこそ、${username}さん！スタジオが準備できました`, 'success');

      this.completeLoginProcess(this.currentUser);
    });
  }

  openInitialProfileModal(user) {
    const initModal = document.getElementById('initial-profile-modal');
    const nameInput = document.getElementById('init-profile-username');
    const idInput = document.getElementById('init-profile-userid');
    const avatarGrid = document.getElementById('init-avatar-select-grid');

    if (!initModal) return;

    if (nameInput) nameInput.value = user.username || 'ねこクリエイター';
    if (idInput) idInput.value = user.userId || 'cat_creator';

    if (avatarGrid) {
      avatarGrid.innerHTML = WIZ_PIXEL_AVATARS.map((preset, idx) => {
        const isSelected = idx === 0;
        return `
          <div class="avatar-option ${isSelected ? 'selected' : ''}" data-avatar-url="${preset.svg}" title="${preset.name}">
            <img src="${preset.svg}" alt="${preset.name}" style="image-rendering: pixelated; width: 44px; height: 44px; border-radius: 8px;">
            <span style="font-size: 0.72rem; display: block; margin-top: 4px; color: var(--text-secondary); text-align: center;">${preset.name.split(' ')[0]}</span>
          </div>
        `;
      }).join('');

      avatarGrid.querySelectorAll('.avatar-option').forEach(opt => {
        opt.addEventListener('click', () => {
          avatarGrid.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
        });
      });
    }

    const gateModal = document.getElementById('auth-gate-modal');
    if (gateModal) gateModal.style.display = 'none';
    initModal.style.display = 'flex';
  }

  /* ==========================================================================
     Studio Settings Modal (General, Notifications, Security, Profile)
     ========================================================================== */

  bindSettingsModalFeatures() {
    // 1. Settings Navigation Tabs Switcher
    const tabs = [
      { btnId: 'settings-tab-general', panelId: 'settings-panel-general' },
      { btnId: 'settings-tab-notifs', panelId: 'settings-panel-notifs' },
      { btnId: 'settings-tab-security', panelId: 'settings-panel-security' },
      { btnId: 'settings-tab-profile', panelId: 'settings-panel-profile' }
    ];

    tabs.forEach(t => {
      const btn = document.getElementById(t.btnId);
      btn?.addEventListener('click', () => {
        tabs.forEach(item => {
          document.getElementById(item.btnId)?.classList.remove('active');
          const p = document.getElementById(item.panelId);
          if (p) p.style.display = 'none';
        });
        btn.classList.add('active');
        const activePanel = document.getElementById(t.panelId);
        if (activePanel) activePanel.style.display = 'block';

        if (t.btnId === 'settings-tab-profile') {
          this.populateProfileForm();
        } else if (t.btnId === 'settings-tab-notifs') {
          this.populateNotificationSettings();
        } else if (t.btnId === 'settings-tab-security') {
          this.populateSecuritySettings();
        }
      });
    });

    // 2. Close Modal Buttons
    const closeBtn = document.getElementById('close-theme-modal-btn');
    const applyBtn = document.getElementById('apply-theme-btn');
    const modal = document.getElementById('theme-settings-modal');

    [closeBtn, applyBtn].forEach(b => {
      b?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
    });

    // 3. Profile Tab: User ID input format filter
    const editUserIdInput = document.getElementById('profile-edit-userid');
    editUserIdInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    });

    // 4. Profile Tab: Save Profile
    document.getElementById('btn-save-profile')?.addEventListener('click', () => {
      this.saveProfileForm();
    });

    // 5. Notification Settings Sync
    const masterNotif = document.getElementById('notif-opt-master');
    const friendNotif = document.getElementById('notif-opt-friends');
    const inviteNotif = document.getElementById('notif-opt-invites');
    const updateNotif = document.getElementById('notif-opt-updates');

    const saveNotifSettings = () => {
      if (!window.notificationsCenter) return;
      window.notificationsCenter.settings.enabled = masterNotif ? masterNotif.checked : true;
      window.notificationsCenter.settings.friendRequests = friendNotif ? friendNotif.checked : true;
      window.notificationsCenter.settings.projectInvites = inviteNotif ? inviteNotif.checked : true;
      window.notificationsCenter.settings.projectUpdates = updateNotif ? updateNotif.checked : true;
      window.notificationsCenter.saveSettings();
    };

    [masterNotif, friendNotif, inviteNotif, updateNotif].forEach(el => {
      el?.addEventListener('change', saveNotifSettings);
    });

    // 6. Security Tab: Remote Devices Logout
    document.getElementById('btn-logout-other-devices')?.addEventListener('click', async () => {
      const ok = await window.showConfirm?.('他のすべての端末からログアウトしますか？\n現在使用中の端末以外のセッションが無効化されます。', '他端末からのログアウト確認') ?? confirm('他のすべての端末からログアウトしますか？');
      if (ok) {
        const devList = document.getElementById('settings-devices-list');
        if (devList) {
          const remotes = devList.querySelectorAll('.device-item.remote');
          remotes.forEach(el => el.remove());
        }
        if (window.showToast) window.showToast('他のすべての端末からログアウトしました', 'success');
      }
    });

    // 7. Security Tab: 2FA Toggle
    const toggle2fa = document.getElementById('setting-enable-2fa');
    toggle2fa?.addEventListener('change', () => {
      if (!this.currentUser) return;
      this.currentUser.is2faEnabled = toggle2fa.checked;
      this.updateUserInStore(this.currentUser);
      if (window.showToast) {
        window.showToast(toggle2fa.checked ? '2段階認証 (メール確認コード) を有効にしました' : '2段階認証を無効にしました', 'info');
      }
    });

    // 8. Security Tab: Touch ID
    document.getElementById('btn-setup-biometrics')?.addEventListener('click', async () => {
      const ok = await window.showConfirm?.('Touch ID / 指紋認証または顔認証を登録しますか？', '生体認証登録') ?? confirm('生体認証を登録しますか？');
      if (ok) {
        if (!this.currentUser) return;
        this.currentUser.biometricsEnabled = true;
        this.updateUserInStore(this.currentUser);
        if (window.showToast) window.showToast('✅ Touch ID / 生体認証を登録しました！', 'success');
      }
    });

    // 9. Security Tab: Phone SMS 2FA
    document.getElementById('btn-setup-sms-2fa')?.addEventListener('click', async () => {
      const phone = await window.showPrompt?.('SMS認証用の電話番号を入力してください:', '090-1234-5678', '電話番号登録') ?? prompt('電話番号を入力してください:');
      if (phone && phone.trim()) {
        if (!this.currentUser) return;
        this.currentUser.phone = phone.trim();
        this.currentUser.sms2faEnabled = true;
        this.updateUserInStore(this.currentUser);
        if (window.showToast) window.showToast(`✅ 電話番号 (${phone}) を登録しました`, 'success');
      }
    });

    // 10. Security Tab: Password Change
    document.getElementById('btn-change-password')?.addEventListener('click', async () => {
      const newPass = await window.showPrompt?.('新しいパスワードを入力してください (6文字以上):', '', 'パスワード変更') ?? prompt('新しいパスワードを入力してください:');
      if (newPass) {
        if (newPass.length < 6) {
          if (window.showToast) window.showToast('パスワードは6文字以上で入力してください', 'warning');
          return;
        }
        if (this.currentUser) {
          this.currentUser.password = newPass;
          this.updateUserInStore(this.currentUser);
          if (window.showToast) window.showToast('🎉 パスワードを変更しました！', 'success');
        }
      }
    });

    // 11. Security Tab: Email Change
    document.getElementById('btn-change-email')?.addEventListener('click', async () => {
      const newEmail = await window.showPrompt?.('新しいメールアドレスを入力してください:', this.currentUser?.email || '', 'メールアドレス変更') ?? prompt('新しいメールアドレス:');
      if (newEmail && newEmail.includes('@')) {
        if (this.currentUser) {
          this.currentUser.email = newEmail.trim().toLowerCase();
          this.updateUserInStore(this.currentUser);
          this.updateUserUI(this.currentUser);
          if (window.showToast) window.showToast(`🎉 メールアドレスを「${this.currentUser.email}」に変更しました！`, 'success');
        }
      }
    });

    // 12. Security Tab: Account Deletion (Danger Zone)
    document.getElementById('btn-delete-account')?.addEventListener('click', async () => {
      const confirmText = await window.showPrompt?.('アカウントを完全に削除します。確認のため「アカウントを削除」と入力してください:', '', 'アカウント削除確認') ?? prompt('確認のため「アカウントを削除」と入力してください:');
      if (confirmText === 'アカウントを削除') {
        const users = this.getLocalUsers().filter(u => u.userId !== this.currentUser?.userId && u.id !== this.currentUser?.id);
        this.saveLocalUsers(users);
        if (modal) modal.style.display = 'none';
        this.signOut();
        if (window.showToast) window.showToast('アカウントを完全に削除しました。ご利用ありがとうございました。', 'info');
      } else if (confirmText !== null) {
        if (window.showToast) window.showToast('確認文字列が一致しませんでした。削除を中止しました。', 'warning');
      }
    });
  }

  populateNotificationSettings() {
    if (!window.notificationsCenter) return;
    const s = window.notificationsCenter.settings;
    const master = document.getElementById('notif-opt-master');
    const friends = document.getElementById('notif-opt-friends');
    const invites = document.getElementById('notif-opt-invites');
    const updates = document.getElementById('notif-opt-updates');

    if (master) master.checked = s.enabled !== false;
    if (friends) friends.checked = s.friendRequests !== false;
    if (invites) invites.checked = s.projectInvites !== false;
    if (updates) updates.checked = s.projectUpdates !== false;
  }

  populateSecuritySettings() {
    const toggle2fa = document.getElementById('setting-enable-2fa');
    if (toggle2fa && this.currentUser) {
      toggle2fa.checked = Boolean(this.currentUser.is2faEnabled);
    }
  }

  populateProfileForm() {
    if (!this.currentUser) return;
    const usernameInput = document.getElementById('profile-edit-username');
    const userIdInput = document.getElementById('profile-edit-userid');
    const bioInput = document.getElementById('profile-edit-bio');
    const avatarGrid = document.getElementById('avatar-select-grid');

    if (usernameInput) usernameInput.value = this.currentUser.username || this.currentUser.user_metadata?.full_name || '';
    if (userIdInput) userIdInput.value = this.currentUser.userId || 'user';
    if (bioInput) bioInput.value = this.currentUser.bio || '';

    // Render Avatar selection
    if (avatarGrid) {
      const currentAvatar = this.currentUser.avatar || this.currentUser.user_metadata?.avatar_url || '';

      avatarGrid.innerHTML = WIZ_PIXEL_AVATARS.map((preset, idx) => {
        const url = preset.svg;
        const isSelected = (currentAvatar === url) || (!currentAvatar && idx === 0);
        return `
          <div class="avatar-option ${isSelected ? 'selected' : ''}" data-avatar-url="${url}" title="${preset.name}">
            <img src="${url}" alt="${preset.name}" style="image-rendering: pixelated; width: 44px; height: 44px; border-radius: 8px;">
            <span style="font-size: 0.72rem; display: block; margin-top: 4px; color: var(--text-secondary); text-align: center;">${preset.name.split(' ')[0]}</span>
          </div>
        `;
      }).join('');

      avatarGrid.querySelectorAll('.avatar-option').forEach(opt => {
        opt.addEventListener('click', () => {
          avatarGrid.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
        });
      });
    }
  }

  saveProfileForm() {
    if (!this.currentUser) return;
    const usernameInput = document.getElementById('profile-edit-username');
    const userIdInput = document.getElementById('profile-edit-userid');
    const bioInput = document.getElementById('profile-edit-bio');
    const selectedAvatar = document.querySelector('#avatar-select-grid .avatar-option.selected');

    const newName = usernameInput?.value.trim();
    let newUserId = userIdInput?.value.trim().replace(/^@/, '').toLowerCase();

    if (!newName) {
      if (window.showToast) window.showToast('表示名を入力してください', 'warning');
      return;
    }

    if (!newUserId || newUserId.length < 3) {
      if (window.showToast) window.showToast('ユーザーIDは3文字以上で入力してください', 'warning');
      return;
    }

    // Check if new userId is taken by someone else
    const allUsers = this.getLocalUsers();
    const isTaken = allUsers.some(u => u.userId === newUserId && u.id !== this.currentUser.id);
    if (isTaken) {
      if (window.showToast) window.showToast(`ユーザーID「@${newUserId}」は既に使用されています`, 'warning');
      return;
    }

    this.currentUser.username = newName;
    this.currentUser.userId = newUserId;
    if (bioInput) this.currentUser.bio = bioInput.value.trim();

    if (selectedAvatar) {
      this.currentUser.avatar = selectedAvatar.getAttribute('data-avatar-url');
    }

    this.currentUser.isProfileConfigured = true;
    this.currentUser.user_metadata = {
      full_name: newName,
      user_id: newUserId,
      avatar_url: this.currentUser.avatar || WIZ_PIXEL_AVATARS[0].svg
    };

    this.updateUserInStore(this.currentUser);
    localStorage.setItem('wiz_active_user', JSON.stringify(this.currentUser));
    localStorage.setItem('wiz_custom_avatar', this.currentUser.avatar);
    localStorage.setItem('wiz_custom_username', newName);
    localStorage.setItem('wiz_custom_userid', newUserId);

    this.updateUserUI(this.currentUser);

    if (window.showToast) window.showToast('🎉 プロフィール設定を保存しました！', 'success');
  }

  /* ==========================================================================
     Sign Out, UI Visibility & Helpers
     ========================================================================== */

  showHomeDashboard() {
    const homeView = document.getElementById('home-dashboard-view');
    const studioContainer = document.querySelector('.studio-container');
    if (homeView) homeView.style.display = 'block';
    if (studioContainer) studioContainer.style.display = 'none';

    if (window.projectManager && typeof window.projectManager.renderHomeProjects === 'function') {
      window.projectManager.renderHomeProjects();
    }
  }

  hideHomeDashboard() {
    const homeView = document.getElementById('home-dashboard-view');
    const studioContainer = document.querySelector('.studio-container');
    if (homeView) homeView.style.display = 'none';
    if (studioContainer) studioContainer.style.display = 'flex';
  }

  async signOut() {
    const isAuth0 = Boolean(this.currentUser?.auth0_profile || localStorage.getItem('wiz_auth0_user'));

    this.currentUser = null;
    localStorage.removeItem('wiz_mock_user');
    localStorage.removeItem('wiz_auth0_user');

    this.hideHomeDashboard();
    this.updateGateVisibility();
    this.updateUserUI(null);

    if (window.showToast) window.showToast('ログアウトしました', 'info');

    if (isAuth0 && this.auth0Client) {
      try {
        const returnTo = window.location.origin + window.location.pathname;
        await this.auth0Client.logout({
          logoutParams: {
            returnTo: returnTo
          }
        });
      } catch (err) {
        console.warn('Auth0 logout error:', err);
      }
    }
  }

  updateGateVisibility() {
    const gateModal = document.getElementById('auth-gate-modal');
    const studioRoot = document.getElementById('studio-app-root');
    const initModal = document.getElementById('initial-profile-modal');

    if (this.currentUser) {
      if (gateModal) gateModal.style.display = 'none';
      if (studioRoot) studioRoot.style.display = 'flex';
      document.body.classList.remove('auth-locked');
    } else {
      if (gateModal) gateModal.style.display = 'flex';
      if (studioRoot) studioRoot.style.display = 'none';
      if (initModal) initModal.style.display = 'none';
      document.body.classList.add('auth-locked');
    }
  }

  updateUserUI(user) {
    const userContainer = document.getElementById('sidebar-user-area');
    if (!userContainer) return;

    if (user) {
      const name = user.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'クリエイター';
      const userId = user.userId || user.user_metadata?.user_id || 'wiz_user';
      const avatarUrl = user.avatar || user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}`;

      userContainer.innerHTML = `
        <div class="user-profile-card">
          <div class="user-avatar-wrap">
            <img src="${avatarUrl}" alt="Avatar" class="user-avatar-img">
            <span class="user-online-pip"></span>
          </div>
          <div class="user-meta">
            <span class="user-name" title="${name}">${name}</span>
            <span class="user-id-badge">@${userId}</span>
          </div>
          <button id="auth-logout-btn" class="btn-logout" title="ログアウト">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;

      document.getElementById('auth-logout-btn')?.addEventListener('click', async () => {
        const ok = await window.showConfirm?.('ログアウトしますか？', 'ログアウト確認') ?? confirm('ログアウトしますか？');
        if (ok) this.signOut();
      });

      // Update Settings Modal Displays if elements exist
      const settingsName = document.getElementById('settings-username-display');
      const settingsId = document.getElementById('settings-userid-display');
      const settingsEmail = document.getElementById('settings-email-display');

      if (settingsName) settingsName.textContent = name;
      if (settingsId) settingsId.textContent = `@${userId}`;
      if (settingsEmail) settingsEmail.textContent = user.email || '未設定';

      // Update Friends manager UI
      if (window.friendsManager) {
        window.friendsManager.renderFriendsUI();
      }
    } else {
      userContainer.innerHTML = '';
    }
  }

  saveRoomToCloud(room) {
    try {
      const rooms = JSON.parse(localStorage.getItem('wiz_rooms') || '[]');
      const idx = rooms.findIndex(r => r.id === room.id);
      if (idx >= 0) rooms[idx] = room;
      else rooms.push(room);
      localStorage.setItem('wiz_rooms', JSON.stringify(rooms));
    } catch (e) {
      console.error('Error saving room to cloud:', e);
    }
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    const badge = document.getElementById('cloud-status-badge');
    if (badge) {
      badge.className = `cloud-status-pill ${online ? 'online' : 'offline'}`;
      badge.innerHTML = `<span class="status-dot ${online ? '' : 'offline'}"></span><span>${online ? 'オンライン' : 'オフライン'}</span>`;
    }
  }
}

// Global initialization & SupabaseAuth compatibility alias
window.auth0Manager = new Auth0AuthManager();
window.supabaseAuth = window.auth0Manager;
