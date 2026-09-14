/**
 * Wiz AI Game Creator - Auth0 Authentication Manager
 * 
 * Fully manages:
 * - Auth0 SPA SDK Login / Sign Up / Redirect Handling / Logout
 * - User Profile Synchronization (sub, email, nickname, avatar picture)
 * - Quick UI Setup for Auth0 Domain & Client ID
 * - Backward Compatibility for Studio Workspace, Marketplace, and Friends Manager
 */

class Auth0AuthManager {
  constructor() {
    this.auth0Client = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;

    // Initialize mock users for offline or test mode
    this.ensureSeedAccounts();

    // DOM Ready hook
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  ensureSeedAccounts() {
    const users = this.getLocalUsers();
    let modified = false;

    if (!users.some(u => u.userId === 'wiz_creator')) {
      users.push({
        id: 'usr_mock_001',
        email: 'creator@wiz-game.dev',
        username: 'Wiz Creator',
        userId: 'wiz_creator',
        user_metadata: {
          full_name: 'Wiz Creator',
          user_id: 'wiz_creator',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=wiz_creator'
        }
      });
      modified = true;
    }

    if (modified) {
      localStorage.setItem('wiz_local_users', JSON.stringify(users));
    }
  }

  getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem('wiz_local_users') || '[]');
    } catch (e) {
      return [];
    }
  }

  async init() {
    this.bindUI();
    this.updateConfigStatusUI();

    // Check if network status changes
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // Initialize Auth0 Client if configured
    await this.initAuth0Client();
  }

  updateConfigStatusUI() {
    const badge = document.getElementById('auth0-status-badge');
    const text = document.getElementById('auth0-status-text');
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

  bindUI() {
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
    // If not configured, check for mock user session
    if (!window.AUTH0_CONFIG?.isConfigured()) {
      this.checkLocalMockSession();
      return;
    }

    // Check if auth0 SPA SDK is available
    if (typeof auth0 === 'undefined') {
      console.warn('Auth0 SPA SDK is not loaded yet.');
      this.checkLocalMockSession();
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
          if (window.showToast) window.showToast('Auth0 ログインが完了しました！', 'success');
        } catch (err) {
          console.error('Error handling redirect callback:', err);
          if (window.showToast) window.showToast('ログインコールバック処理に失敗しました: ' + err.message, 'error');
        }
      }

      // Check if user is authenticated
      const isAuthenticated = await this.auth0Client.isAuthenticated();
      if (isAuthenticated) {
        const user = await this.auth0Client.getUser();
        this.setAuth0User(user);
        return;
      }
    } catch (err) {
      console.error('Auth0 Client Initialization Error:', err);
    }

    // If not authenticated via Auth0, check for existing mock session
    this.checkLocalMockSession();
  }

  setAuth0User(auth0User) {
    if (!auth0User) return;

    const email = auth0User.email || '';
    const name = auth0User.name || auth0User.nickname || (email ? email.split('@')[0] : 'Auth0 User');
    const rawId = auth0User.nickname || auth0User.preferred_username || (email ? email.split('@')[0] : 'auth0_user');
    const userId = rawId.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 20);
    const avatar = auth0User.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

    this.currentUser = {
      id: auth0User.sub,
      email: email,
      username: name,
      userId: userId,
      user_metadata: {
        full_name: name,
        user_id: userId,
        avatar_url: avatar
      },
      auth0_profile: auth0User
    };

    localStorage.setItem('wiz_auth0_user', JSON.stringify(this.currentUser));
    localStorage.removeItem('wiz_mock_user');

    this.updateGateVisibility();
    this.updateUserUI(this.currentUser);
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

  checkLocalMockSession() {
    const savedMock = localStorage.getItem('wiz_mock_user');
    if (savedMock) {
      try {
        this.currentUser = JSON.parse(savedMock);
        this.updateGateVisibility();
        this.updateUserUI(this.currentUser);
        this.showHomeDashboard();
        return;
      } catch (e) {}
    }

    this.updateGateVisibility();
    this.updateUserUI(null);
  }

  loginAsMockUser() {
    this.currentUser = {
      id: 'usr_mock_001',
      email: 'creator@wiz-game.dev',
      username: 'Wiz Creator',
      userId: 'wiz_creator',
      user_metadata: {
        full_name: 'Wiz Creator',
        user_id: 'wiz_creator',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=wiz_creator'
      }
    };
    localStorage.setItem('wiz_mock_user', JSON.stringify(this.currentUser));
    localStorage.removeItem('wiz_auth0_user');

    if (window.showToast) {
      window.showToast('テストアカウントでログインしました', 'success');
    }

    this.updateGateVisibility();
    this.updateUserUI(this.currentUser);
    this.showHomeDashboard();
  }

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

    if (this.currentUser) {
      if (gateModal) gateModal.style.display = 'none';
      if (studioRoot) studioRoot.style.display = 'flex';
      document.body.classList.remove('auth-locked');
    } else {
      if (gateModal) gateModal.style.display = 'flex';
      if (studioRoot) studioRoot.style.display = 'none';
      document.body.classList.add('auth-locked');
    }
  }

  updateUserUI(user) {
    const userContainer = document.getElementById('sidebar-user-area');
    if (!userContainer) return;

    if (user) {
      const name = user.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'クリエイター';
      const userId = user.userId || user.user_metadata?.user_id || 'wiz_user';
      const avatarUrl = user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

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
    // Synchronize room to localStorage rooms
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
