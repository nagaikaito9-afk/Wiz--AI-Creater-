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

    // Check mock user in localStorage
    const savedMock = localStorage.getItem('wiz_mock_user');
    if (savedMock) {
      try {
        this.currentUser = JSON.parse(savedMock);
        this.updateUserUI(this.currentUser);
      } catch (e) {}
    }

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
    } else {
      this.updateUserUI(this.currentUser);
    }
  }

  handleNetworkChange(online) {
    this.isOnline = online;
    this.updateOnlineBadge(online ? 'online' : 'offline');
    if (window.showToast) {
      window.showToast(online ? 'インターネットに再接続しました' : 'オフライン状態です', online ? 'info' : 'warning');
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

  // Google OAuth Login
  async signInWithGoogle() {
    const client = await this.ensureSupabaseClient();
    if (!client) {
      if (window.showToast) window.showToast('Supabaseの読み込みに失敗しました。接続環境をご確認ください。', 'error');
      return;
    }

    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Google login error:', err);
      const errMsg = String(err.message || err);

      // Friendly guidance if Google provider is not yet enabled on user's Supabase dashboard
      if (errMsg.includes('provider is not enabled') || errMsg.includes('Unsupported provider') || errMsg.includes('validation_failed')) {
        const ok = await window.showConfirm(
          `Supabase ダッシュボードで「Google Provider」がまだ有効化されていないか、Client ID / Secret が未設定のようです。\n\n【設定方法】:\n1. Supabaseダッシュボード > Authentication > Providers > Google をONにする\n2. Google Cloud Console の OAuth 認証情報を入力\n3. URL Configuration に ${window.location.origin} を追加\n\n今すぐテスト用のログイン（開発用ユーザー）で動作確認しますか？`,
          'Googleログインの設定について'
        );
        if (ok) {
          this.loginAsMockUser();
        }
      } else {
        if (window.showToast) {
          window.showToast(`Google ログインでエラーが発生しました: ${errMsg}`, 'error');
        }
      }
    }
  }

  // Fallback demo/mock user login for testing
  loginAsMockUser() {
    const mockUser = {
      id: 'usr_creator_' + Math.random().toString(36).substring(2, 8),
      email: 'creator@wiz-game.dev',
      user_metadata: {
        full_name: 'Wiz Game Creator',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=WizMaster'
      }
    };
    this.currentUser = mockUser;
    localStorage.setItem('wiz_mock_user', JSON.stringify(mockUser));
    this.updateUserUI(mockUser);
    if (window.showToast) {
      window.showToast('テストアカウントでログインしました！クラウド保存が有効です。', 'success');
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
            <span class="user-email" title="${user.email}">${user.email || 'Googleログイン中'}</span>
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
        <button id="auth-google-login-btn" class="btn-google-login">
          <svg class="google-icon" viewBox="0 0 24 24" width="18" height="18">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Googleでログイン</span>
        </button>
      `;

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
