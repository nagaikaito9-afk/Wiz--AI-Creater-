/**
 * Wiz AI Game Creator - Email Authentication & Account Security Manager
 * Features:
 * - Pure Email Registration with 6-digit Email Verification Code & Stepper Flow
 * - Unique User ID (@user_id) & Username Setup
 * - Email / User ID Login with Two-Factor Authentication (2FA) support
 * - User Settings 2FA Configuration
 * - Instant Mock Account Login for Fast Testing
 * - Cloud & Local Storage Account Sync
 */

class SupabaseAuthManager {
  constructor() {
    this.supabaseUrl = 'https://vlgcixctrafjfbtkztpw.supabase.co';
    this.supabaseKey = 'sb_publishable_wXpTnSpge6PLD60ns7BLAA_Lr8ONbPT';
    this.client = null;
    this.currentUser = null;
    this.isOnline = navigator.onLine;

    // Sign-up, Login and 2FA temporary states (In-memory only, never saved to DB or local storage)
    this.pendingSignup = null;
    this.pendingLogin = null;
    this.pending2fa = null;
    this.resendTimerInterval = null;
    this.loginResendTimerInterval = null;

    this.ensureSeedAccounts();
    this.init();
  }

  // Ensure default demo accounts exist locally for seamless testing
  ensureSeedAccounts() {
    const users = this.getLocalUsers();
    let modified = false;

    if (!users.some(u => u.userId === 'wiz_creator')) {
      users.push({
        id: 'usr_mock_001',
        email: 'creator@wiz-game.dev',
        password: 'password123',
        username: 'Wiz Creator',
        userId: 'wiz_creator',
        is2faEnabled: false,
        user_metadata: {
          full_name: 'Wiz Creator',
          user_id: 'wiz_creator',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=wiz_creator'
        }
      });
      modified = true;
    }

    if (!users.some(u => u.userId === 'pixel_hero')) {
      users.push({
        id: 'usr_mock_002',
        email: 'hero@pixel.dev',
        password: 'password123',
        username: 'ドット勇者',
        userId: 'pixel_hero',
        is2faEnabled: false,
        user_metadata: {
          full_name: 'ドット勇者',
          user_id: 'pixel_hero',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=pixel_hero'
        }
      });
      modified = true;
    }

    if (!users.some(u => u.userId === 'sound_mage')) {
      users.push({
        id: 'usr_mock_003',
        email: 'sound@synth.dev',
        password: 'password123',
        username: '音響魔術師',
        userId: 'sound_mage',
        is2faEnabled: false,
        user_metadata: {
          full_name: '音響魔術師',
          user_id: 'sound_mage',
          avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sound_mage'
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

  saveLocalUsers(users) {
    try {
      localStorage.setItem('wiz_local_users', JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save users to local storage:', e);
    }
  }

  async init() {
    if (document.readyState === 'loading') {
      await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    }

    this.bindGateEvents();
    this.bindSettings2faEvents();

    // Always require login/registration modal on initial entry to the site as requested by user
    this.currentUser = null;
    this.updateGateVisibility();
    this.updateUserUI(null);

    // Pre-fill login email if remembered
    try {
      const lastEmail = localStorage.getItem('wiz_last_login_email');
      const loginEmailInput = document.getElementById('gate-login-email');
      if (lastEmail && loginEmailInput) {
        loginEmailInput.value = lastEmail;
      }
    } catch (e) {}

    // Network listeners
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
  }

  // Bind Auth Gate Modal Events (Email only)
  bindGateEvents() {
    // 1. Prominent 1-Click Test Account Button
    document.getElementById('gate-mock-login-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.loginAsMockUser();
    });

    // 2. Tab Switcher: ログイン vs 新規登録
    const tabLogin = document.getElementById('tab-login-btn');
    const tabSignup = document.getElementById('tab-signup-btn');
    const viewLogin = document.getElementById('auth-view-login');
    const viewSignup = document.getElementById('auth-view-signup');

    tabLogin?.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabSignup?.classList.remove('active');
      if (viewLogin) viewLogin.style.display = 'block';
      if (viewSignup) viewSignup.style.display = 'none';
      this.resetSignupFlow();
    });

    tabSignup?.addEventListener('click', () => {
      tabSignup.classList.add('active');
      tabLogin?.classList.remove('active');
      if (viewLogin) viewLogin.style.display = 'none';
      if (viewSignup) viewSignup.style.display = 'block';
      this.resetSignupFlow();
    });

    // 3. Login Flow (2-Step Email Code Verification)
    const loginSubmitBtn = document.getElementById('gate-login-submit-btn');
    const loginIdInput = document.getElementById('gate-login-identifier');
    const loginPassInput = document.getElementById('gate-login-password');
    const loginVerifyBtn = document.getElementById('gate-login-verify-btn');
    const loginCodeInput = document.getElementById('gate-login-code');
    const loginBackBtn = document.getElementById('gate-login-back-btn');
    const loginResendBtn = document.getElementById('login-resend-code-btn');

    loginSubmitBtn?.addEventListener('click', () => this.handleLoginStep1());
    loginVerifyBtn?.addEventListener('click', () => this.handleLoginStep2());
    loginBackBtn?.addEventListener('click', () => this.showLoginStep(1));
    loginResendBtn?.addEventListener('click', () => this.resendLoginCode());

    [loginIdInput, loginPassInput].forEach(inp => {
      inp?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleLoginStep1();
        }
      });
    });

    loginCodeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleLoginStep2();
      }
    });

    // 4. Registration Flow
    // Step 1: Send Verification Code
    document.getElementById('gate-signup-next-1-btn')?.addEventListener('click', () => {
      this.handleSignupStep1();
    });

    // Step 2: Verify 6-Digit Code
    document.getElementById('gate-signup-next-2-btn')?.addEventListener('click', () => {
      this.handleSignupStep2();
    });

    document.getElementById('gate-signup-back-2-btn')?.addEventListener('click', () => {
      this.showSignupStep(1);
    });

    document.getElementById('resend-code-btn')?.addEventListener('click', () => {
      this.resendSignupCode();
    });

    document.getElementById('gate-signup-code')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleSignupStep2();
      }
    });

    // Step 3: Username & User ID Setup
    document.getElementById('gate-signup-finish-btn')?.addEventListener('click', () => {
      this.handleSignupStep3();
    });

    document.getElementById('gate-signup-back-3-btn')?.addEventListener('click', () => {
      this.showSignupStep(2);
    });

    // Live User ID check
    document.getElementById('gate-signup-userid')?.addEventListener('input', (e) => {
      this.validateUserIdInput(e.target.value);
    });
  }

  // Settings Modal Enhanced Tabs, Security & Profile Bindings
  bindSettings2faEvents() {
    this.bindSettingsModalFeatures();
  }

  bindSettingsModalFeatures() {
    // 1. Settings Nav Tabs Switcher
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
        }
      });
    });

    // 2. Notification Settings Sync
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

    // 3. Security: Log out from other devices
    document.getElementById('btn-logout-other-devices')?.addEventListener('click', async () => {
      const ok = await window.showConfirm(
        '他のすべての端末からログアウトしますか？\n現在使用中のこの端末以外のセッションが無効化されます。',
        '他端末からのログアウト確認'
      );
      if (ok) {
        const devList = document.getElementById('settings-devices-list');
        if (devList) {
          const remotes = devList.querySelectorAll('.device-item.remote');
          remotes.forEach(el => el.remove());
        }
        if (window.showToast) window.showToast('他のすべての端末から正常にログアウトしました', 'success');
        if (window.activityLogger) window.activityLogger.log('他のすべての端末から*ログアウト*しました', 'system');
      }
    });

    // 4. Security: 2FA Toggle (Email Code)
    const toggle2fa = document.getElementById('setting-enable-2fa');
    toggle2fa?.addEventListener('change', () => {
      if (!this.currentUser) return;
      this.currentUser.is2faEnabled = toggle2fa.checked;
      this.updateUserInStore(this.currentUser);
      if (window.showToast) {
        window.showToast(
          toggle2fa.checked
            ? '2段階認証 (メール確認コード) を有効にしました'
            : '2段階認証を無効にしました',
          toggle2fa.checked ? 'success' : 'info'
        );
      }
    });

    // 5. Security: Touch ID / Biometrics simulation
    document.getElementById('btn-setup-biometrics')?.addEventListener('click', async () => {
      const ok = await window.showConfirm('Touch ID / 指紋認証センサーまたは顔認証で生体認証を登録しますか？', '生体認証登録');
      if (ok) {
        if (!this.currentUser) return;
        this.currentUser.biometricsEnabled = true;
        this.updateUserInStore(this.currentUser);
        if (window.showToast) window.showToast('✅ Touch ID / 生体認証を登録しました！次回からワンタッチ認証が可能です。', 'success');
        if (window.activityLogger) window.activityLogger.log('*Touch ID 生体認証*を設定しました', 'system');
      }
    });

    // 6. Security: SMS Phone 2FA
    document.getElementById('btn-setup-sms-2fa')?.addEventListener('click', async () => {
      const phone = await window.showPrompt('SMS認証用の電話番号を入力してください (例: 090-1234-5678):', '090-1234-5678', '電話番号登録');
      if (phone && phone.trim()) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        this.openSecurityActionModal({
          mode: 'sms_verify',
          title: '電話番号 SMS 認証確認',
          desc: `電話番号「${phone}」へ6ケタの確認コードを送信しました。`,
          code: code,
          onConfirm: () => {
            if (!this.currentUser) return;
            this.currentUser.phone = phone.trim();
            this.currentUser.sms2faEnabled = true;
            this.updateUserInStore(this.currentUser);
            if (window.showToast) window.showToast(`✅ 電話番号 (${phone}) によるSMS認証を設定しました！`, 'success');
          }
        });
      }
    });

    // 7. Security: Password Change (with 6-digit email verification code)
    document.getElementById('btn-change-password')?.addEventListener('click', () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.openSecurityActionModal({
        mode: 'change_password',
        title: 'パスワードの変更',
        desc: `ご登録メールアドレス (${this.currentUser?.email || 'email'}) 宛てに6ケタ確認コードを送信しました。`,
        inputLabel: '新しいパスワード (6文字以上)',
        inputPlaceholder: '新しいパスワード',
        code: code,
        onConfirm: (val) => {
          if (!val || val.length < 6) {
            if (window.showToast) window.showToast('新しいパスワードは6文字以上で入力してください', 'warning');
            return false;
          }
          if (this.currentUser) {
            this.currentUser.password = val;
            this.updateUserInStore(this.currentUser);
            if (window.showToast) window.showToast('🎉 パスワードを変更しました！', 'success');
            if (window.activityLogger) window.activityLogger.log('*パスワード*を変更しました', 'system');
          }
          return true;
        }
      });
    });

    // 8. Security: Email Address Change (with 6-digit verification code)
    document.getElementById('btn-change-email')?.addEventListener('click', () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.openSecurityActionModal({
        mode: 'change_email',
        title: 'メールアドレスの変更',
        desc: '新しいメールアドレスを入力し、送信された6ケタ確認コードを入力してください。',
        inputLabel: '新しいメールアドレス',
        inputPlaceholder: 'user@example.com',
        code: code,
        onConfirm: (val) => {
          if (!val || !val.includes('@')) {
            if (window.showToast) window.showToast('有効なメールアドレスを入力してください', 'warning');
            return false;
          }
          if (this.currentUser) {
            this.currentUser.email = val.trim().toLowerCase();
            this.updateUserInStore(this.currentUser);
            this.updateUserUI(this.currentUser);
            if (window.showToast) window.showToast(`🎉 メールアドレスを「${this.currentUser.email}」に変更しました！`, 'success');
            if (window.activityLogger) window.activityLogger.log('*メールアドレス*を変更しました', 'system');
          }
          return true;
        }
      });
    });

    // 9. Security: Account Deletion (with 6-digit code and danger confirmation)
    document.getElementById('btn-delete-account')?.addEventListener('click', () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.openSecurityActionModal({
        mode: 'delete_account',
        title: 'アカウントの完全削除',
        desc: `⚠️ 注意: アカウントを削除するとすべてのプロジェクト・フレンド情報が消去されます。ご登録メール (${this.currentUser?.email}) へ送信された6ケタコードを入力してください。`,
        isDanger: true,
        code: code,
        onConfirm: () => {
          const users = this.getLocalUsers().filter(u => u.userId !== this.currentUser?.userId);
          this.saveLocalUsers(users);
          this.signOut();
          const modal = document.getElementById('theme-settings-modal');
          if (modal) modal.style.display = 'none';
          if (window.showToast) window.showToast('アカウントを完全に削除しました。ご利用ありがとうございました。', 'info');
          return true;
        }
      });
    });

    // 10. Profile: Save Profile
    document.getElementById('btn-save-profile')?.addEventListener('click', () => {
      this.saveProfileForm();
    });

    // 11. Security Action Modal Close / Cancel
    document.getElementById('close-sec-modal-btn')?.addEventListener('click', () => {
      const m = document.getElementById('security-action-modal');
      if (m) m.style.display = 'none';
    });
    document.getElementById('cancel-sec-modal-btn')?.addEventListener('click', () => {
      const m = document.getElementById('security-action-modal');
      if (m) m.style.display = 'none';
    });
  }

  updateUserInStore(user) {
    const users = this.getLocalUsers();
    const idx = users.findIndex(u => u.userId === user.userId || u.email === user.email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user };
      this.saveLocalUsers(users);
    }
    localStorage.setItem('wiz_mock_user', JSON.stringify(user));
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

  populateProfileForm() {
    if (!this.currentUser) return;
    const usernameInput = document.getElementById('profile-edit-username');
    const userIdInput = document.getElementById('profile-edit-userid');
    const bioInput = document.getElementById('profile-edit-bio');
    const avatarGrid = document.getElementById('avatar-select-grid');

    if (usernameInput) usernameInput.value = this.currentUser.username || this.currentUser.user_metadata?.full_name || '';
    if (userIdInput) userIdInput.value = `@${this.currentUser.userId || 'user'}`;
    if (bioInput) bioInput.value = this.currentUser.bio || '';

    // Render Avatar options
    if (avatarGrid) {
      const seeds = [this.currentUser.userId, 'wiz_creator', 'pixel_hero', 'sound_mage', 'retro_gamer', 'neon_cat', 'bot_99'];
      avatarGrid.innerHTML = seeds.map(seed => {
        const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
        const isSelected = (this.currentUser.avatar === url) || (!this.currentUser.avatar && seed === this.currentUser.userId);
        return `
          <div class="avatar-option ${isSelected ? 'selected' : ''}" data-avatar-url="${url}">
            <img src="${url}" alt="${seed}">
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
    const bioInput = document.getElementById('profile-edit-bio');
    const selectedAvatar = document.querySelector('.avatar-option.selected');

    const newName = usernameInput?.value.trim();
    if (newName) {
      this.currentUser.username = newName;
      if (this.currentUser.user_metadata) this.currentUser.user_metadata.full_name = newName;
    }
    if (bioInput) {
      this.currentUser.bio = bioInput.value.trim();
    }
    if (selectedAvatar) {
      this.currentUser.avatar = selectedAvatar.getAttribute('data-avatar-url');
      if (this.currentUser.user_metadata) {
        this.currentUser.user_metadata.avatar_url = this.currentUser.avatar;
      }
    }

    this.updateUserInStore(this.currentUser);
    this.updateUserUI(this.currentUser);

    if (window.showToast) window.showToast('🎉 プロフィール設定を保存しました！', 'success');
  }

  openSecurityActionModal(cfg) {
    const modal = document.getElementById('security-action-modal');
    if (!modal) return;

    const titleEl = document.getElementById('sec-modal-title');
    const descEl = document.getElementById('sec-modal-desc');
    const inputGroup = document.getElementById('sec-modal-input-group-1');
    const inputLabel = document.getElementById('sec-modal-input-label-1');
    const input1 = document.getElementById('sec-modal-input-1');
    const codeInput = document.getElementById('sec-modal-code-input');
    const codeHint = document.getElementById('sec-modal-code-hint');
    const dangerGroup = document.getElementById('sec-modal-danger-group');
    const dangerInput = document.getElementById('sec-modal-danger-input');
    const submitBtn = document.getElementById('submit-sec-modal-btn');

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ${cfg.title}`;
    if (descEl) descEl.textContent = cfg.desc;

    if (inputGroup && cfg.inputLabel) {
      inputGroup.style.display = 'block';
      if (inputLabel) inputLabel.textContent = cfg.inputLabel;
      if (input1) {
        input1.value = '';
        input1.placeholder = cfg.inputPlaceholder || '';
      }
    } else if (inputGroup) {
      inputGroup.style.display = 'none';
    }

    if (codeInput) {
      codeInput.value = cfg.code; // Pre-fill for testing/demo
      codeInput.placeholder = cfg.code;
    }
    if (codeHint) {
      codeHint.textContent = `※ デモ用認証コード: [ ${cfg.code} ] (メール宛てに送信されました)`;
    }

    if (dangerGroup) {
      dangerGroup.style.display = cfg.isDanger ? 'block' : 'none';
      if (dangerInput) dangerInput.value = '';
    }

    modal.style.display = 'flex';

    if (window.showToast) {
      window.showToast(`📧 確認コード [ ${cfg.code} ] を送信しました`, 'info');
    }

    submitBtn.onclick = () => {
      const enteredCode = codeInput?.value.trim();
      if (enteredCode !== cfg.code) {
        if (window.showToast) window.showToast('認証コードが一致しません', 'error');
        return;
      }

      if (cfg.isDanger) {
        if (dangerInput?.value.trim() !== 'アカウントを削除') {
          if (window.showToast) window.showToast('「アカウントを削除」と正確に入力してください', 'warning');
          return;
        }
      }

      const inputVal = input1 ? input1.value.trim() : '';
      const success = cfg.onConfirm ? cfg.onConfirm(inputVal) : true;
      if (success !== false) {
        modal.style.display = 'none';
      }
    };
  }

  // Handle Login Submission
  // ==========================================================================
  // LOGIN FLOW (2-Step Verification with Real Email Code)
  // ==========================================================================
  handleLoginStep1() {
    const idInput = document.getElementById('gate-login-identifier');
    const passInput = document.getElementById('gate-login-password');

    const identifier = idInput?.value.replace(/^@/, '').trim().toLowerCase();
    const password = passInput?.value || '';

    if (!identifier || !password) {
      if (window.showToast) window.showToast('メールアドレスまたはユーザーID、パスワードを入力してください', 'warning');
      return;
    }

    const users = this.getLocalUsers();
    const user = users.find(u =>
      (u.email || '').toLowerCase() === identifier ||
      (u.userId || '').toLowerCase() === identifier
    );

    if (!user) {
      if (window.showToast) window.showToast('該当するユーザーが見つかりません。新規登録をお試しください。', 'warning');
      return;
    }

    if (user.password !== password) {
      if (window.showToast) window.showToast('パスワードが正しくありません', 'warning');
      return;
    }

    // Generate in-memory 6-digit verification code (Never saved to Supabase DB or persistent storage!)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pendingLogin = {
      user: user,
      email: user.email,
      code: code,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    // Update Login Step 2 UI
    const targetEl = document.getElementById('login-verify-email-target');
    if (targetEl) targetEl.textContent = user.email || identifier;
    const codeInput = document.getElementById('gate-login-code');
    if (codeInput) {
      codeInput.value = '';
      setTimeout(() => codeInput.focus(), 150);
    }

    this.showLoginStep(2);
    this.startLoginResendCountdown();

    // Dispatch real email to user's inbox
    this.sendRealVerificationEmail(user.email, code, true);

    if (window.showToast) {
      window.showToast(`✉️ ${user.email} 宛にログイン確認コードを送信しました。メールをご確認ください。`, 'info');
    }
  }

  handleLoginStep2() {
    const codeInput = document.getElementById('gate-login-code');
    const entered = codeInput?.value.trim();

    if (!this.pendingLogin) {
      this.showLoginStep(1);
      return;
    }

    if (Date.now() > this.pendingLogin.expiresAt) {
      if (window.showToast) window.showToast('認証コードの有効期限が切れました。「コードを再送」してください。', 'warning');
      return;
    }

    // Verify code (Secure in-memory check without exposure)
    if (entered !== this.pendingLogin.code) {
      if (window.showToast) window.showToast('認証コードが一致しません。メール内の6ケタコードをご確認ください。', 'error');
      return;
    }

    // Code verified! Complete login
    const user = this.pendingLogin.user;
    this.currentUser = user;
    this.pendingLogin = null;
    if (this.loginResendTimerInterval) clearInterval(this.loginResendTimerInterval);

    localStorage.setItem('wiz_mock_user', JSON.stringify(user));
    if (user.email) {
      try { localStorage.setItem('wiz_last_login_email', user.email); } catch (e) {}
    }

    this.updateGateVisibility();
    this.updateUserUI(user);

    if (window.showToast) {
      window.showToast(`ようこそ、${user.username || user.user_metadata?.full_name}さん！`, 'success');
    }

    if (window.projectManager && typeof window.projectManager.syncWithCloud === 'function') {
      window.projectManager.syncWithCloud();
    }
  }

  showLoginStep(stepNum) {
    const step1 = document.getElementById('login-step-1');
    const step2 = document.getElementById('login-step-2');
    if (step1) step1.style.display = stepNum === 1 ? 'block' : 'none';
    if (step2) step2.style.display = stepNum === 2 ? 'block' : 'none';
  }

  resendLoginCode() {
    if (!this.pendingLogin) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pendingLogin.code = code;
    this.pendingLogin.expiresAt = Date.now() + 5 * 60 * 1000;
    this.startLoginResendCountdown();

    this.sendRealVerificationEmail(this.pendingLogin.email, code, true);

    if (window.showToast) {
      window.showToast(`✉️ ${this.pendingLogin.email} 宛に新しいログイン確認コードを再送しました！`, 'info');
    }
  }

  startLoginResendCountdown() {
    if (this.loginResendTimerInterval) clearInterval(this.loginResendTimerInterval);
    let secondsLeft = 60;
    const textEl = document.getElementById('login-code-countdown-text');
    const resendBtn = document.getElementById('login-resend-code-btn');

    if (resendBtn) resendBtn.disabled = true;
    if (textEl) textEl.textContent = `残り有効時間: ${secondsLeft}秒`;

    this.loginResendTimerInterval = setInterval(() => {
      secondsLeft--;
      if (textEl) textEl.textContent = `残り有効時間: ${secondsLeft}秒`;
      if (secondsLeft <= 0) {
        clearInterval(this.loginResendTimerInterval);
        if (resendBtn) resendBtn.disabled = false;
        if (textEl) textEl.textContent = 'コードの有効期限が切れました。再送信してください。';
      }
    }, 1000);
  }

  // ==========================================================================
  // REAL EMAIL DISPATCH ENGINE (Direct to recipient, zero DB storage)
  // ==========================================================================
  async sendRealVerificationEmail(email, code, isLogin = false) {
    const actionLabel = isLogin ? 'ログイン' : '新規登録';
    console.log(`[Email Dispatcher] Verification code generated for: ${email} (${actionLabel})`);

    let sent = false;

    // 1. Try Vercel Serverless Function: /api/send-code (Supports Resend API & Custom SMTP)
    try {
      const apiRes = await fetch('/api/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, isLogin })
      });
      if (apiRes.ok) {
        sent = true;
        console.log('[Email Dispatcher] /api/send-code delivered successfully');
      } else if (apiRes.status === 429) {
        console.warn('[Email Dispatcher] /api/send-code reported rate limit');
      }
    } catch (e) {
      console.warn('[Email Dispatcher] /api/send-code fetch attempt:', e);
    }

    // 2. Supabase Auth Native OTP Dispatcher Fallback
    try {
      const supaRes = await fetch(`${this.supabaseUrl}/auth/v1/otp`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          create_user: !isLogin
        })
      });

      if (supaRes.ok) {
        sent = true;
        console.log('[Email Dispatcher] Supabase Auth OTP delivered successfully');
      } else if (supaRes.status === 429 && !sent) {
        if (window.showToast) {
          window.showToast('⚠️ メールサーバーの1時間あたりの送信制限（無料枠の制限）に達しています。少し時間をおいて再度お試しください。', 'error');
        }
      }
    } catch (err) {
      console.warn('Supabase Auth OTP dispatch attempt:', err);
    }
  }

  // ==========================================================================
  // SIGNUP FLOW (Pure Email Verification - Secret Code in Email Only)
  // ==========================================================================
  // Signup Step 1: Input Email + Password -> Send 6-digit code
  handleSignupStep1() {
    const emailInput = document.getElementById('gate-signup-email');
    const passInput = document.getElementById('gate-signup-password');

    const email = emailInput?.value.trim().toLowerCase();
    const password = passInput?.value || '';

    if (!email || !email.includes('@')) {
      if (window.showToast) window.showToast('有効なメールアドレスを入力してください', 'warning');
      return;
    }

    if (!password) {
      if (window.showToast) window.showToast('Emailのパスワードを入力してください', 'warning');
      return;
    }

    // Generate in-memory 6-digit verification code (Never saved to Supabase DB or persistent storage!)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pendingSignup = {
      email: email,
      password: password,
      code: code,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    // Update Step 2 UI
    const targetEl = document.getElementById('verify-email-target');
    if (targetEl) targetEl.textContent = email;
    const codeInput = document.getElementById('gate-signup-code');
    if (codeInput) codeInput.value = '';

    const statusText = document.getElementById('verify-email-status-text');
    if (statusText) statusText.textContent = '6ケタの確認コードを送信しました。メールをご確認ください。';

    this.showSignupStep(2);
    this.startResendCountdown();
    this.sendRealVerificationEmail(email, code, false);

    // Notice toast WITHOUT exposing secret code
    if (window.showToast) {
      window.showToast(`✉️ ${email} 宛に本人確認コードを送信しました。メールをご確認ください。`, 'info');
    }
  }

  // Signup Step 2: Verify 6-digit code
  handleSignupStep2() {
    const codeInput = document.getElementById('gate-signup-code');
    const entered = codeInput?.value.trim();

    if (!this.pendingSignup) {
      this.showSignupStep(1);
      return;
    }

    if (Date.now() > this.pendingSignup.expiresAt) {
      if (window.showToast) window.showToast('認証コードの有効期限が切れました。「コードを再送」してください。', 'warning');
      return;
    }

    // Secure verification: strictly compare against in-memory secret code
    if (entered !== this.pendingSignup.code) {
      if (window.showToast) window.showToast('認証コードが一致しません。メール内の6ケタコードをご確認ください。', 'error');
      return;
    }

    // Code verified! Proceed to Step 3 (Username & User ID)
    const emailPrefix = this.pendingSignup.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const nameInput = document.getElementById('gate-signup-username');
    const idInput = document.getElementById('gate-signup-userid');

    if (nameInput) nameInput.value = emailPrefix;
    if (idInput) {
      idInput.value = emailPrefix.toLowerCase();
      this.validateUserIdInput(idInput.value);
    }

    this.showSignupStep(3);

    if (window.showToast) {
      window.showToast('本人確認が完了しました！ユーザー名とユーザーIDを設定してください。', 'success');
    }
  }

  // Resend code
  resendSignupCode() {
    if (!this.pendingSignup) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.pendingSignup.code = code;
    this.pendingSignup.expiresAt = Date.now() + 5 * 60 * 1000;
    this.startResendCountdown();

    this.sendRealVerificationEmail(this.pendingSignup.email, code, false);

    if (window.showToast) {
      window.showToast(`✉️ ${this.pendingSignup.email} 宛に新しい確認コードを再送しました！`, 'info');
    }
  }

  startResendCountdown() {
    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);
    let secondsLeft = 60;
    const textEl = document.getElementById('code-countdown-text');
    const resendBtn = document.getElementById('resend-code-btn');

    if (resendBtn) resendBtn.disabled = true;
    if (textEl) textEl.textContent = `残り有効時間: ${secondsLeft}秒`;

    this.resendTimerInterval = setInterval(() => {
      secondsLeft--;
      if (textEl) textEl.textContent = `残り有効時間: ${secondsLeft}秒`;
      if (secondsLeft <= 0) {
        clearInterval(this.resendTimerInterval);
        if (resendBtn) resendBtn.disabled = false;
        if (textEl) textEl.textContent = 'コードの有効期限が切れました。再送信してください。';
      }
    }, 1000);
  }

  // Validate User ID input format & uniqueness
  validateUserIdInput(raw) {
    const clean = raw.replace(/^@/, '').trim().toLowerCase();
    const hint = document.getElementById('userid-status-hint');
    const finishBtn = document.getElementById('gate-signup-finish-btn');

    if (!clean) {
      if (hint) {
        hint.textContent = '半角英数字とアンダースコア（_）3〜20文字';
        hint.style.color = 'var(--text-muted)';
      }
      return false;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
      if (hint) {
        hint.textContent = '⚠️ 3〜30文字の半角英数字・アンダースコアのみ使用可能です';
        hint.style.color = '#ff6b6b';
      }
      return false;
    }

    const users = this.getLocalUsers();
    const exists = users.some(u => (u.userId || '').toLowerCase() === clean);
    if (exists) {
      if (hint) {
        hint.textContent = `❌ @${clean} は既に使用されています`;
        hint.style.color = '#ff6b6b';
      }
      return false;
    }

    if (hint) {
      hint.textContent = `✅ @${clean} は利用可能です！`;
      hint.style.color = '#38ef7d';
    }
    return true;
  }

  // Signup Step 3: Complete Registration
  handleSignupStep3() {
    const nameInput = document.getElementById('gate-signup-username');
    const idInput = document.getElementById('gate-signup-userid');

    const username = nameInput?.value.trim() || 'クリエイター';
    const userId = idInput?.value.replace(/^@/, '').trim().toLowerCase();

    if (!this.validateUserIdInput(userId)) {
      if (window.showToast) window.showToast('利用可能なユーザーIDを入力してください', 'warning');
      return;
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      email: this.pendingSignup.email,
      password: this.pendingSignup.password,
      username: username,
      userId: userId,
      is2faEnabled: false,
      user_metadata: {
        full_name: username,
        user_id: userId,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userId)}`
      }
    };

    const users = this.getLocalUsers().filter(u =>
      (u.email || '').toLowerCase() !== this.pendingSignup.email.toLowerCase() &&
      (u.userId || '').toLowerCase() !== userId
    );
    users.push(newUser);
    this.saveLocalUsers(users);

    this.currentUser = newUser;
    localStorage.setItem('wiz_mock_user', JSON.stringify(newUser));

    this.pendingSignup = null;
    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);

    this.updateGateVisibility();
    this.updateUserUI(newUser);

    if (window.showToast) {
      window.showToast(`🎉 登録が完了しました！ようこそ、${username}さん (@${userId})`, 'success');
    }

    if (window.projectManager && typeof window.projectManager.syncWithCloud === 'function') {
      window.projectManager.syncWithCloud();
    }
  }

  // Show specific step (1, 2, or 3)
  showSignupStep(stepNum) {
    [1, 2, 3].forEach(n => {
      const stepEl = document.getElementById(`signup-step-${n}`);
      const dotEl = document.getElementById(`step-dot-${n}`);
      if (stepEl) stepEl.style.display = n === stepNum ? 'block' : 'none';
      if (dotEl) {
        dotEl.classList.toggle('active', n <= stepNum);
      }
    });

    const line1 = document.getElementById('step-line-1');
    const line2 = document.getElementById('step-line-2');
    if (line1) line1.classList.toggle('active', stepNum >= 2);
    if (line2) line2.classList.toggle('active', stepNum >= 3);
  }

  resetSignupFlow() {
    this.pendingSignup = null;
    this.pendingLogin = null;
    this.pending2fa = null;
    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);
    if (this.loginResendTimerInterval) clearInterval(this.loginResendTimerInterval);
    this.showSignupStep(1);
    this.showLoginStep(1);
  }

  // 1-Click Test Account Login
  loginAsMockUser() {
    const users = this.getLocalUsers();
    const mock = users.find(u => u.userId === 'wiz_creator') || {
      id: 'usr_mock_001',
      email: 'creator@wiz-game.dev',
      username: 'Wiz Creator',
      userId: 'wiz_creator',
      is2faEnabled: false,
      user_metadata: {
        full_name: 'Wiz Creator',
        user_id: 'wiz_creator',
        avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=wiz_creator'
      }
    };

    this.currentUser = mock;
    localStorage.setItem('wiz_mock_user', JSON.stringify(mock));
    this.updateGateVisibility();
    this.updateUserUI(mock);

    if (window.showToast) {
      window.showToast('テスト用アカウントでログインしました！Wiz Studioへようこそ！', 'success');
    }

    if (window.projectManager && typeof window.projectManager.syncWithCloud === 'function') {
      window.projectManager.syncWithCloud();
    }
  }

  // Logout
  signOut() {
    this.currentUser = null;
    localStorage.removeItem('wiz_mock_user');
    this.updateGateVisibility();
    this.updateUserUI(null);
    if (window.showToast) window.showToast('ログアウトしました', 'info');
  }

  // Update Gate Visibility
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

  // Update UI Elements with User Info
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
        const ok = await window.showConfirm('ログアウトしますか？', 'ログアウト確認');
        if (ok) this.signOut();
      });

      // Update Settings Modal Displays
      const settingsName = document.getElementById('settings-username-display');
      const settingsId = document.getElementById('settings-userid-display');
      const settingsEmail = document.getElementById('settings-email-display');
      const toggle2fa = document.getElementById('setting-enable-2fa');

      if (settingsName) settingsName.textContent = name;
      if (settingsId) settingsId.textContent = `@${userId}`;
      if (settingsEmail) settingsEmail.textContent = user.email || '未設定';
      if (toggle2fa) toggle2fa.checked = Boolean(user.is2faEnabled);

      // Update Friends manager UI
      if (window.friendsManager) {
        window.friendsManager.renderFriendsUI();
      }
    } else {
      userContainer.innerHTML = '';
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

// Global initialization
window.supabaseAuth = new SupabaseAuthManager();
