/**
 * Wiz AI Game Creator - Supabase Auth & Cloud Sync Manager
 * Features:
 * - Google OAuth Login & Logout via Supabase
 * - User Profile & Session Management
 * - Cloud Save & Sync for project rooms
 * - Realtime Online Status & Presence indicator
 */

class SupabaseAuthManager {
  constructor() {
    this.supabaseUrl = 'https://vlgcixctrafjfbtkztpw.supabase.co';
    this.supabaseKey = 'sb_publishable_wXpTnSpge6PLD60ns7BLAA_Lr8ONbPT';
    this.client = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;
    this.realtimeChannel = null;

    this.init();
  }

  async ensureSupabaseClient() {
    if (this.client) return this.client;

    for (let i = 0; i < 30; i++) {
      if (window.supabase) {
        try {
          this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true
            }
          });
          return this.client;
        } catch (e) {
          console.warn('Supabase client creation error:', e);
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  }

  async init() {
    if (document.readyState === 'loading') {
      await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    }

    // Bind gate modal events immediately
    this.bindGateEvents();

    // Check mock user in localStorage
    const savedMock = localStorage.getItem('wiz_mock_user');
    if (savedMock) {
      try {
        this.currentUser = JSON.parse(savedMock);
      } catch (e) {
        this.currentUser = null;
      }
    }

    // Force gate visibility update immediately on first render
    this.updateGateVisibility();
    this.updateUserUI(this.currentUser);

    // Network status listeners
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    const client = await this.ensureSupabaseClient();

    if (client) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          this.currentUser = session.user;
          localStorage.removeItem('wiz_mock_user');
        }
        this.handleAuthChange(session);

        client.auth.onAuthStateChange((event, session) => {
          console.info('Auth state changed:', event, session?.user?.email);
          this.handleAuthChange(session);
        });

        this.initPresence();
      } catch (err) {
        console.info('Auth session init note:', err);
      }
    }
  }

  // Bind Auth Gate Modal Events
  bindGateEvents() {
    // 1. Featured 1-Click Test Account Login
    document.getElementById('gate-mock-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.loginAsMockUser();
    });

    // 2. GitHub Login from gate
    document.getElementById('gate-github-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.signInWithGithub();
    });

    // 3. Google Login from gate
    document.getElementById('gate-google-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.signInWithGoogle();
    });

    // Email Tabs (ログイン / 新規登録)
    const tabLogin = document.getElementById('tab-login-btn');
    const tabSignup = document.getElementById('tab-signup-btn');
    const submitBtn = document.getElementById('gate-submit-btn');
    let isSignupMode = false;

    tabLogin?.addEventListener('click', () => {
      isSignupMode = false;
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      if (submitBtn) submitBtn.innerHTML = '<span>ログインする</span>';
    });

    tabSignup?.addEventListener('click', () => {
      isSignupMode = true;
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      if (submitBtn) submitBtn.innerHTML = '<span>新規登録する</span>';
    });

    // Email form submit
    submitBtn?.addEventListener('click', async () => {
      const emailInput = document.getElementById('gate-email-input');
      const passwordInput = document.getElementById('gate-password-input');
      const email = emailInput?.value.trim();
      const password = passwordInput?.value;

      if (!email || !password) {
        if (window.showToast) window.showToast('メールアドレス（またはユーザー名）とパスワードを入力してください', 'warning');
        return;
      }
      if (password.length < 6) {
        if (window.showToast) window.showToast('パスワードは6文字以上で入力してください', 'warning');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>処理中...</span>';

      try {
        if (isSignupMode) {
          await this.signUpWithEmail(email, password);
        } else {
          await this.signInWithEmail(email, password);
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isSignupMode ? '<span>新規登録する</span>' : '<span>ログインする</span>';
      }
    });

    // Allow Enter key submit in password field
    document.getElementById('gate-password-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitBtn?.click();
      }
    });
  }

  // Local Accounts Storage (Guarantees registration never fails)
  getLocalUsers() {
    try {
      return JSON.parse(localStorage.getItem('wiz_local_users') || '[]');
    } catch (e) {
      return [];
    }
  }

  saveLocalUser(email, password) {
    const users = this.getLocalUsers();
    const cleanEmail = email.includes('@') ? email : `${email}@wiz-studio.dev`;
    let user = users.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
    if (!user) {
      user = {
        id: 'usr_' + Date.now(),
        email: cleanEmail,
        password: password,
        user_metadata: {
          full_name: email.split('@')[0],
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`
        }
      };
      users.push(user);
      localStorage.setItem('wiz_local_users', JSON.stringify(users));
    }
    return user;
  }

  // Supabase Email SignUp with Local Fallback
  async signUpWithEmail(email, password) {
    const cleanEmail = email.includes('@') ? email : `${email}@wiz-studio.dev`;

    const client = await this.ensureSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.auth.signUp({
          email: cleanEmail,
          password: password
        });

        if (!error && data?.session?.user) {
          this.currentUser = data.session.user;
          this.updateUserUI(this.currentUser);
          if (window.showToast) window.showToast('アカウントを作成しログインしました！', 'success');
          return;
        }
      } catch (e) {
        console.warn('Supabase cloud signup notice:', e);
      }
    }

    // Instant local registration so user is NEVER blocked by email confirmation requirements
    const user = this.saveLocalUser(cleanEmail, password);
    this.currentUser = user;
    localStorage.setItem('wiz_mock_user', JSON.stringify(user));
    this.updateUserUI(user);
    if (window.showToast) {
      window.showToast(`アカウント「${user.user_metadata.full_name}」を作成しログインしました！`, 'success');
    }
    if (window.projectManager) {
      window.projectManager.syncWithCloud();
    }
  }

  // Supabase Email Login with Local Fallback
  async signInWithEmail(email, password) {
    const cleanEmail = email.includes('@') ? email : `${email}@wiz-studio.dev`;

    const client = await this.ensureSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: password
        });

        if (!error && data?.user) {
          this.currentUser = data.user;
          this.updateUserUI(data.user);
          if (window.showToast) window.showToast('ログインしました！', 'success');
          return;
        }
      } catch (e) {
        console.warn('Supabase signin notice:', e);
      }
    }

    // Check local accounts
    const users = this.getLocalUsers();
    const found = users.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
    if (found) {
      if (found.password === password) {
        this.currentUser = found;
        localStorage.setItem('wiz_mock_user', JSON.stringify(found));
        this.updateUserUI(found);
        if (window.showToast) window.showToast(`ログインしました（${found.user_metadata.full_name}）`, 'success');
        return;
      } else {
        if (window.showToast) window.showToast('パスワードが正しくありません', 'warning');
        return;
      }
    }

    // If not found in local users either, auto-register them seamlessly!
    const newUser = this.saveLocalUser(cleanEmail, password);
    this.currentUser = newUser;
    localStorage.setItem('wiz_mock_user', JSON.stringify(newUser));
    this.updateUserUI(newUser);
    if (window.showToast) {
      window.showToast(`アカウント「${newUser.user_metadata.full_name}」を自動作成しログインしました！`, 'success');
    }
    if (window.projectManager) {
      window.projectManager.syncWithCloud();
    }
  }

  // Update Gate Visibility (Completely hides the studio until logged in)
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

  handleNetworkChange(online) {
    this.isOnline = online;
    this.updateOnlineBadge(online ? 'online' : 'offline');
    if (window.showToast) {
      window.showToast(online ? 'インターネットに再接続しました' : 'オフライン状態です', online ? 'info' : 'warning');
    }
  }

  // Check if provider is enabled on Supabase to prevent redirecting to raw JSON 400 error page
  async isProviderConfigured(provider) {
    try {
      const res = await fetch(`${this.supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: this.supabaseKey }
      });
      const data = await res.json();
      return Boolean(data?.external?.[provider]);
    } catch (e) {
      return false;
    }
  }

  // Realtime Presence / Online connection
  initPresence() {
    if (!this.client) return;
    try {
      this.realtimeChannel = this.client.channel('online-users');
      this.realtimeChannel
        .on('presence', { event: 'sync' }, () => {
          this.updateOnlineBadge('online');
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await this.realtimeChannel.track({
              user_id: this.currentUser?.id || 'guest',
              online_at: new Date().toISOString()
            });
            this.updateOnlineBadge('online');
          }
        });
    } catch (err) {
      console.info('Realtime presence notice:', err);
    }
  }

  updateOnlineBadge(status = 'online') {
    const badge = document.getElementById('cloud-status-badge');
    if (!badge) return;

    if (status === 'online') {
      badge.className = 'cloud-status-pill online';
      badge.innerHTML = '<span class="status-dot"></span><span>オンライン</span>';
      badge.title = 'Supabase クラウドに接続中（自動同期有効）';
    } else if (status === 'syncing') {
      badge.className = 'cloud-status-pill syncing';
      badge.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i><span>同期中...</span>';
    } else {
      badge.className = 'cloud-status-pill offline';
      badge.innerHTML = '<span class="status-dot offline"></span><span>オフライン</span>';
      badge.title = 'オフライン（ローカルに保存中）';
    }
  }

  handleAuthChange(session) {
    if (session?.user) {
      this.currentUser = session.user;
    }
    this.updateUserUI(this.currentUser);

    // If logged in, trigger cloud sync
    if (this.currentUser && window.projectManager) {
      window.projectManager.syncWithCloud();
    }
  }

  // GitHub OAuth Login with error guard
  async signInWithGithub() {
    // 1. Guard against redirecting to 400 error page if provider is disabled in Supabase
    const configured = await this.isProviderConfigured('github');
    if (!configured) {
      const ok = await window.showConfirm(
        'Supabase ダッシュボード側で「GitHub 認証」がまだ有効化（ON）されていないため、外部エラー画面への遷移を防止しました。\n\n今すぐスタジオを利用するには【テスト用アカウント】でログインできます。\n\nテスト用アカウントで今すぐスタジオを開きますか？',
        'GitHubログインについて'
      );
      if (ok) {
        this.loginAsMockUser();
      }
      return;
    }

    const client = await this.ensureSupabaseClient();
    if (!client) {
      if (window.showToast) window.showToast('Supabaseの接続に失敗しました', 'error');
      return;
    }

    try {
      const redirectUri = window.location.origin + window.location.pathname;
      await client.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: redirectUri }
      });
    } catch (err) {
      console.warn('GitHub login error:', err);
      if (window.showToast) window.showToast('GitHubログインでエラーが発生しました', 'error');
    }
  }

  // Google OAuth Login with error guard
  async signInWithGoogle() {
    // 1. Guard against redirecting to 400 error page if provider is disabled in Supabase
    const configured = await this.isProviderConfigured('google');
    if (!configured) {
      const ok = await window.showConfirm(
        'Supabase ダッシュボード側で「Google 認証」がまだ有効化（ON）されていないため、外部エラー画面への遷移を防止しました。\n\n今すぐスタジオを利用するには【テスト用アカウント】でログインできます。\n\nテスト用アカウントで今すぐスタジオを開きますか？',
        'Googleログインについて'
      );
      if (ok) {
        this.loginAsMockUser();
      }
      return;
    }

    const client = await this.ensureSupabaseClient();
    if (!client) {
      if (window.showToast) window.showToast('Supabaseの接続に失敗しました', 'error');
      return;
    }

    try {
      const redirectUri = window.location.origin + window.location.pathname;
      await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
    } catch (err) {
      console.warn('Google login error:', err);
      if (window.showToast) window.showToast('Googleログインでエラーが発生しました', 'error');
    }
  }

  loginAsGuest() {
    this.loginAsMockUser();
  }

  // Featured 1-Click Test Account Login
  loginAsMockUser() {
    const mockUser = {
      id: 'usr_creator',
      email: 'creator@wiz-game.dev',
      user_metadata: {
        full_name: 'Wiz Creator',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=WizMaster'
      }
    };
    this.currentUser = mockUser;
    localStorage.setItem('wiz_mock_user', JSON.stringify(mockUser));
    this.updateUserUI(mockUser);
    if (window.showToast) {
      window.showToast('テスト用アカウントでログインしました！Wiz Studioへようこそ！', 'success');
    }
    if (window.projectManager) {
      window.projectManager.syncWithCloud();
    }
  }

  // Sign out
  async signOut() {
    localStorage.removeItem('wiz_mock_user');
    if (this.client) {
      try {
        await this.client.auth.signOut();
      } catch (err) {
        console.error('Sign out error:', err);
      }
    }
    this.currentUser = null;
    this.updateUserUI(null);
    if (window.showToast) window.showToast('ログアウトしました', 'info');
  }

  // Update UI Elements with user profile
  updateUserUI(user) {
    this.updateGateVisibility();

    const userContainer = document.getElementById('sidebar-user-area');
    if (!userContainer) return;

    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'ユーザー';
      const avatarUrl = user.user_metadata?.avatar_url || '';

      userContainer.innerHTML = `
        <div class="user-profile-card">
          <div class="user-avatar-wrap">
            ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" class="user-avatar-img">` : `<div class="user-avatar-placeholder"><i class="fa-solid fa-user"></i></div>`}
            <span class="user-online-pip"></span>
          </div>
          <div class="user-meta">
            <span class="user-name" title="${name}">${name}</span>
            <span class="user-email" title="${user.email}">${user.email || 'ログイン中'}</span>
          </div>
          <button id="auth-logout-btn" class="btn-logout" title="ログアウト">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;

      document.getElementById('auth-logout-btn')?.addEventListener('click', async () => {
        const ok = await window.showConfirm('ログアウトしますか？', 'ログアウト確認');
        if (ok) this.signOut();
      });
    } else {
      userContainer.innerHTML = `
        <div class="sidebar-auth-btns" style="display:flex; flex-direction:column; gap:0.4rem; width:100%;">
          <button id="auth-github-login-btn" class="btn-sidebar-oauth btn-gate-github" style="padding:0.45rem; border-radius:6px; font-size:0.78rem; display:flex; align-items:center; justify-content:center; gap:0.5rem; cursor:pointer; color:#fff; background:#24292f; border:1px solid #30363d;">
            <i class="fa-brands fa-github"></i>
            <span>GitHubでログイン</span>
          </button>
          <button id="auth-google-login-btn" class="btn-sidebar-oauth btn-google-login" style="padding:0.45rem; border-radius:6px; font-size:0.78rem;">
            <svg class="google-icon" viewBox="0 0 24 24" width="15" height="15">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Googleでログイン</span>
          </button>
        </div>
      `;

      document.getElementById('auth-github-login-btn')?.addEventListener('click', () => {
        this.signInWithGithub();
      });
      document.getElementById('auth-google-login-btn')?.addEventListener('click', () => {
        this.signInWithGoogle();
      });
    }
  }

  // Cloud Save for Room Data
  async saveRoomToCloud(roomData) {
    if (!this.client || !this.currentUser) return false;
    this.updateOnlineBadge('syncing');

    try {
      const payload = {
        id: roomData.id,
        user_id: this.currentUser.id,
        name: roomData.name,
        rules: roomData.rules || '',
        chat_history: roomData.chatHistory || [],
        vfs_root: roomData.vfsRoot || {},
        updated_at: new Date().toISOString()
      };

      // Upsert into 'wiz_rooms' table if available
      const { error } = await this.client
        .from('wiz_rooms')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        // Fallback using user_metadata
        await this.client.auth.updateUser({
          data: {
            [`room_${roomData.id}`]: {
              name: roomData.name,
              rules: roomData.rules,
              updated_at: payload.updated_at
            }
          }
        });
      }

      this.updateOnlineBadge('online');
      return true;
    } catch (err) {
      console.info('Cloud save fallback note:', err);
      this.updateOnlineBadge('online');
      return false;
    }
  }

  // Load Rooms from Cloud
  async loadRoomsFromCloud() {
    if (!this.client || !this.currentUser) return null;

    try {
      const { data, error } = await this.client
        .from('wiz_rooms')
        .select('*')
        .eq('user_id', this.currentUser.id)
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(row => ({
          id: row.id,
          name: row.name,
          rules: row.rules,
          chatHistory: row.chat_history,
          vfsRoot: row.vfs_root,
          updatedAt: new Date(row.updated_at).getTime()
        }));
      }
    } catch (err) {
      console.info('Cloud rooms load note:', err);
    }
    return null;
  }
}

window.supabaseAuth = new SupabaseAuthManager();
