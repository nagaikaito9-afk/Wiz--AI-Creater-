/**
 * Wiz AI Game Creator - Friends & Direct Chat Manager
 * Features:
 * - Friend Requests via Unique User ID (@user_id)
 * - Accept / Reject / Cancel Friend Requests
 * - Friends List with Online Presence
 * - Temporary Direct Chat (DM) with simulated smart replies
 * - Project Collaboration Invites
 */

class FriendsManager {
  constructor() {
    this.storageKey = 'wiz_friends_data_v2';
    this.activeChatPartnerId = null;
    this.data = this.loadData();
    this.init();
  }

  loadData() {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Clean out any legacy demo friends (pixel_hero, sound_mage, retro_gamer)
        if (parsed.friends) {
          parsed.friends = parsed.friends.filter(f => f.userId !== 'pixel_hero' && f.userId !== 'sound_mage');
        }
        if (parsed.incomingRequests) {
          parsed.incomingRequests = parsed.incomingRequests.filter(r => r.fromUserId !== 'retro_gamer');
        }
        return parsed;
      } catch (e) {
        console.warn('Failed to parse friends data, resetting:', e);
      }
    }
    // Clean slate for all users (0 demo friends)
    return {
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      directMessages: {}
    };
  }

  resetForUser(userId) {
    this.data = {
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      directMessages: {}
    };
    this.saveData();
    this.renderFriendsUI();
  }

  saveData() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save friends data:', e);
    }
  }

  getCurrentUserId() {
    return window.supabaseAuth?.currentUser?.user_metadata?.user_id ||
           window.supabaseAuth?.currentUser?.userId ||
           'wiz_creator';
  }

  getCurrentUsername() {
    return window.supabaseAuth?.currentUser?.user_metadata?.full_name ||
           window.supabaseAuth?.currentUser?.username ||
           'Wiz Creator';
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindEvents());
    } else {
      this.bindEvents();
    }
  }

  bindEvents() {
    // 1. Sidebar Tab Switcher: Projects vs Friends
    const tabProjects = document.getElementById('sidebar-tab-projects');
    const tabFriends = document.getElementById('sidebar-tab-friends');
    const panelProjects = document.getElementById('project-rooms-panel');
    const panelFriends = document.getElementById('friends-panel');

    tabProjects?.addEventListener('click', () => {
      tabProjects.classList.add('active');
      tabFriends?.classList.remove('active');
      if (panelProjects) panelProjects.style.display = 'flex';
      if (panelFriends) panelFriends.style.display = 'none';
    });

    tabFriends?.addEventListener('click', () => {
      tabFriends.classList.add('active');
      tabProjects?.classList.remove('active');
      if (panelProjects) panelProjects.style.display = 'none';
      if (panelFriends) panelFriends.style.display = 'flex';
      this.renderFriendsUI();
    });

    // Copy my User ID button
    document.getElementById('copy-my-id-btn')?.addEventListener('click', () => {
      const myId = '@' + this.getCurrentUserId();
      navigator.clipboard.writeText(myId).then(() => {
        if (window.showToast) window.showToast(`ユーザーID「${myId}」をコピーしました！`, 'success');
      });
    });

    // 2. Add Friend Modal
    const addFriendModal = document.getElementById('add-friend-modal');
    const openAddBtn = document.getElementById('open-add-friend-btn');
    const closeAddBtn = document.getElementById('close-add-friend-modal-btn');
    const cancelAddBtn = document.getElementById('cancel-add-friend-btn');
    const sendRequestBtn = document.getElementById('send-friend-request-btn');
    const userIdInput = document.getElementById('add-friend-userid-input');

    const openModal = () => {
      if (addFriendModal) addFriendModal.style.display = 'flex';
      if (userIdInput) {
        userIdInput.value = '';
        userIdInput.focus();
      }
      document.getElementById('friend-search-preview')?.style.setProperty('display', 'none');
    };

    const closeModal = () => {
      if (addFriendModal) addFriendModal.style.display = 'none';
    };

    openAddBtn?.addEventListener('click', openModal);
    closeAddBtn?.addEventListener('click', closeModal);
    cancelAddBtn?.addEventListener('click', closeModal);

    // Live search preview
    userIdInput?.addEventListener('input', () => {
      const val = userIdInput.value.replace(/^@/, '').trim().toLowerCase();
      const preview = document.getElementById('friend-search-preview');
      const nameEl = document.getElementById('friend-preview-name');
      const idEl = document.getElementById('friend-preview-id');

      if (!val) {
        if (preview) preview.style.display = 'none';
        return;
      }

      // Check registered users or demo users
      const registered = window.supabaseAuth?.getLocalUsers() || [];
      const targetUser = registered.find(u => (u.userId || '').toLowerCase() === val || (u.email || '').toLowerCase() === val) ||
                         this.data.friends.find(f => f.userId.toLowerCase() === val);

      if (preview && nameEl && idEl) {
        preview.style.display = 'block';
        nameEl.textContent = targetUser ? (targetUser.username || targetUser.user_metadata?.full_name || targetUser.userId) : `ユーザー (@${val})`;
        idEl.textContent = `@${val}`;
      }
    });

    // Send Friend Request
    sendRequestBtn?.addEventListener('click', () => {
      const rawVal = userIdInput?.value.replace(/^@/, '').trim();
      if (!rawVal) {
        if (window.showToast) window.showToast('フレンドのユーザーIDを入力してください', 'warning');
        return;
      }
      this.sendFriendRequest(rawVal);
      closeModal();
    });

    // 3. Direct Chat (DM) Drawer
    const chatDrawer = document.getElementById('friend-chat-drawer');
    const closeChatBtn = document.getElementById('close-friend-chat-btn');
    const sendDmBtn = document.getElementById('friend-chat-send-btn');
    const dmInput = document.getElementById('friend-chat-input');
    const dmInviteBtn = document.getElementById('friend-chat-invite-btn');

    closeChatBtn?.addEventListener('click', () => {
      if (chatDrawer) chatDrawer.style.display = 'none';
      this.activeChatPartnerId = null;
    });

    const handleSendDm = () => {
      const text = dmInput?.value.trim();
      if (!text || !this.activeChatPartnerId) return;
      dmInput.value = '';
      this.sendDirectMessage(this.activeChatPartnerId, text);
    };

    sendDmBtn?.addEventListener('click', handleSendDm);
    dmInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendDm();
      }
    });

    dmInviteBtn?.addEventListener('click', () => {
      if (this.activeChatPartnerId && window.projectManager) {
        window.projectManager.openTeamModal();
        // preselect this friend
        const select = document.getElementById('invite-friend-select');
        if (select) select.value = this.activeChatPartnerId;
      }
    });

    this.renderFriendsUI();
  }

  // Send friend request by User ID
  sendFriendRequest(targetUserId) {
    const cleanId = targetUserId.toLowerCase();
    const myId = this.getCurrentUserId().toLowerCase();

    if (cleanId === myId) {
      if (window.showToast) window.showToast('自分自身にフレンド申請は送れません', 'warning');
      return;
    }

    if (this.data.friends.some(f => f.userId.toLowerCase() === cleanId)) {
      if (window.showToast) window.showToast(`@${cleanId} さんとは既にフレンドです！`, 'info');
      return;
    }

    if (this.data.outgoingRequests.some(r => r.toUserId.toLowerCase() === cleanId)) {
      if (window.showToast) window.showToast(`@${cleanId} さんへは既に申請を送信済みです`, 'warning');
      return;
    }

    // Lookup user name if known
    const localUsers = window.supabaseAuth?.getLocalUsers() || [];
    const matched = localUsers.find(u => (u.userId || '').toLowerCase() === cleanId);
    const targetName = matched ? (matched.username || matched.userId) : cleanId;

    this.data.outgoingRequests.push({
      toUserId: cleanId,
      toUsername: targetName,
      sentAt: new Date().toISOString()
    });

    this.saveData();
    this.renderFriendsUI();

    if (window.showToast) {
      window.showToast(`@${cleanId} さんにフレンド申請を送信しました！`, 'success');
    }

    // If sending to a preset demo user, simulate approval after 4 seconds!
    if (['pixel_hero', 'sound_mage', 'retro_gamer'].includes(cleanId)) {
      setTimeout(() => {
        this.simulateApprovalFromDemo(cleanId, targetName);
      }, 4000);
    }
  }

  simulateApprovalFromDemo(userId, username) {
    // Remove from outgoing
    this.data.outgoingRequests = this.data.outgoingRequests.filter(r => r.toUserId !== userId);
    // Add to friends
    if (!this.data.friends.some(f => f.userId === userId)) {
      this.data.friends.push({
        userId: userId,
        username: username,
        email: `${userId}@game-dev.local`,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
        online: true,
        statusText: 'オンライン'
      });
      this.saveData();
      this.renderFriendsUI();
      if (window.showToast) {
        window.showToast(`🎉 @${userId} さんがフレンド申請を承認しました！`, 'success');
      }
    }
  }

  // Accept incoming friend request
  acceptFriendRequest(fromUserId) {
    const req = this.data.incomingRequests.find(r => r.fromUserId === fromUserId);
    if (!req) return;

    this.data.incomingRequests = this.data.incomingRequests.filter(r => r.fromUserId !== fromUserId);

    const newFriend = {
      userId: req.fromUserId,
      username: req.fromUsername || req.fromUserId,
      email: `${req.fromUserId}@demo.dev`,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${req.fromUserId}`,
      online: true,
      statusText: 'オンライン'
    };

    this.data.friends.unshift(newFriend);
    this.saveData();
    this.renderFriendsUI();

    if (window.showToast) {
      window.showToast(`「${newFriend.username}」さんとフレンドになりました！`, 'success');
    }
  }

  // Reject incoming friend request
  rejectFriendRequest(fromUserId) {
    this.data.incomingRequests = this.data.incomingRequests.filter(r => r.fromUserId !== fromUserId);
    this.saveData();
    this.renderFriendsUI();
    if (window.showToast) window.showToast('フレンド申請をお断りしました', 'info');
  }

  // Cancel outgoing friend request
  cancelOutgoingRequest(toUserId) {
    this.data.outgoingRequests = this.data.outgoingRequests.filter(r => r.toUserId !== toUserId);
    this.saveData();
    this.renderFriendsUI();
    if (window.showToast) window.showToast('送信したフレンド申請を取り消しました', 'info');
  }

  // Open Direct Chat with friend
  openDirectChat(friendUserId) {
    const friend = this.data.friends.find(f => f.userId === friendUserId);
    if (!friend) return;

    this.activeChatPartnerId = friendUserId;
    const drawer = document.getElementById('friend-chat-drawer');
    const nameEl = document.getElementById('friend-chat-partner-name');
    const idEl = document.getElementById('friend-chat-partner-id');
    const input = document.getElementById('friend-chat-input');

    if (nameEl) nameEl.textContent = friend.username;
    if (idEl) idEl.textContent = `@${friend.userId}`;
    if (drawer) drawer.style.display = 'flex';
    if (input) {
      input.value = '';
      input.focus();
    }

    this.renderDirectMessages(friendUserId);
  }

  // Send Direct Message
  sendDirectMessage(partnerId, text) {
    if (!this.data.directMessages[partnerId]) {
      this.data.directMessages[partnerId] = [];
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.data.directMessages[partnerId].push({
      sender: 'me',
      text: text,
      time: timeStr
    });

    this.saveData();
    this.renderDirectMessages(partnerId);

    // Simulate smart friend reply after 1.2s!
    setTimeout(() => {
      this.simulateFriendReply(partnerId, text);
    }, 1200);
  }

  simulateFriendReply(partnerId, userMessage) {
    const friend = this.data.friends.find(f => f.userId === partnerId);
    if (!friend) return;

    if (!this.data.directMessages[partnerId]) {
      this.data.directMessages[partnerId] = [];
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let reply = 'メッセージありがとう！いつでも一緒にゲーム作ろう！🎮';
    if (/ブロック|ゲーム|作ろ|コード|プロジェクト/.test(userMessage)) {
      reply = `いいね！『${userMessage}』面白そう！プロジェクトに招待してくれたら一緒にコード編集するよ！🤝`;
    } else if (/こんにちは|やあ|初めまして/.test(userMessage)) {
      reply = `こんにちは！調子はどう？今日もWiz Studioで最高のゲームを作ろうね！✨`;
    } else if (/BGM|音楽|音/.test(userMessage)) {
      reply = `効果音やBGMのアイデアなら任せて！レトロゲーム風のピコピコ音が最高だよ！🎶`;
    }

    this.data.directMessages[partnerId].push({
      sender: partnerId,
      text: reply,
      time: timeStr
    });

    this.saveData();
    if (this.activeChatPartnerId === partnerId) {
      this.renderDirectMessages(partnerId);
    } else {
      if (window.showToast) {
        window.showToast(`💬 @${partnerId} さんからメッセージ: 「${reply.substring(0, 24)}...」`, 'info');
      }
    }
  }

  renderDirectMessages(partnerId) {
    const container = document.getElementById('friend-chat-messages');
    if (!container) return;

    const msgs = this.data.directMessages[partnerId] || [];
    container.innerHTML = '';

    if (msgs.length === 0) {
      container.innerHTML = `
        <div class="dm-empty-hint">
          <i class="fa-regular fa-comment-dots"></i>
          <p>@${partnerId} さんとの一時チャットです。<br>メッセージを送信してみましょう！</p>
        </div>
      `;
      return;
    }

    msgs.forEach(m => {
      const isMe = m.sender === 'me';
      const bubble = document.createElement('div');
      bubble.className = `dm-message ${isMe ? 'me' : 'them'}`;
      bubble.innerHTML = `
        <div class="dm-bubble-text">${this.escapeHtml(m.text)}</div>
        <div class="dm-bubble-time">${m.time}</div>
      `;
      container.appendChild(bubble);
    });

    container.scrollTop = container.scrollHeight;
  }

  // Render Sidebar Friends UI
  renderFriendsUI() {
    // 1. My Profile Card
    const nameEl = document.getElementById('my-profile-name');
    const idEl = document.getElementById('my-profile-id');
    if (nameEl) nameEl.textContent = this.getCurrentUsername();
    if (idEl) idEl.textContent = `@${this.getCurrentUserId()}`;

    // 2. Badges
    const badge = document.getElementById('friend-requests-badge');
    const incomingBadge = document.getElementById('incoming-count-badge');
    const friendsBadge = document.getElementById('friends-count-badge');

    const inCount = this.data.incomingRequests.length;
    const friendsCount = this.data.friends.length;

    if (badge) {
      badge.textContent = inCount;
      badge.style.display = inCount > 0 ? 'inline-block' : 'none';
    }
    if (incomingBadge) incomingBadge.textContent = inCount;
    if (friendsBadge) friendsBadge.textContent = friendsCount;

    // 3. Incoming Requests Section
    const inSection = document.getElementById('incoming-requests-section');
    const inList = document.getElementById('incoming-requests-list');
    if (inSection && inList) {
      inSection.style.display = inCount > 0 ? 'block' : 'none';
      inList.innerHTML = '';
      this.data.incomingRequests.forEach(req => {
        const row = document.createElement('div');
        row.className = 'friend-request-row';
        row.innerHTML = `
          <div class="req-user-info">
            <strong>${this.escapeHtml(req.fromUsername || req.fromUserId)}</strong>
            <span>@${this.escapeHtml(req.fromUserId)}</span>
          </div>
          <div class="req-btn-group">
            <button class="btn-req-accept" title="承認"><i class="fa-solid fa-check"></i> 承認</button>
            <button class="btn-req-reject" title="拒否"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `;
        row.querySelector('.btn-req-accept').onclick = () => this.acceptFriendRequest(req.fromUserId);
        row.querySelector('.btn-req-reject').onclick = () => this.rejectFriendRequest(req.fromUserId);
        inList.appendChild(row);
      });
    }

    // 4. Friends List
    const friendsList = document.getElementById('friends-items-list');
    if (friendsList) {
      friendsList.innerHTML = '';
      if (this.data.friends.length === 0) {
        friendsList.innerHTML = `
          <div class="friends-empty-placeholder">
            <i class="fa-regular fa-face-smile"></i>
            <p>フレンドがいません<br>「フレンドを追加」からIDを入力して申請してみよう！</p>
          </div>
        `;
      } else {
        this.data.friends.forEach(f => {
          const item = document.createElement('div');
          item.className = 'friend-card-item';
          item.innerHTML = `
            <div class="friend-card-avatar">
              <i class="fa-solid fa-user"></i>
              <span class="friend-online-dot ${f.online ? 'online' : 'offline'}"></span>
            </div>
            <div class="friend-card-meta" onclick="window.openPublicProfile && window.openPublicProfile('${f.userId}')" style="cursor:pointer;" title="プロフィールを見る">
              <div class="friend-card-name-row">
                <strong>${this.escapeHtml(f.username)}</strong>
                <span class="friend-card-id">@${this.escapeHtml(f.userId)}</span>
              </div>
              <div class="friend-card-status">${this.escapeHtml(f.statusText || (f.online ? 'オンライン' : 'オフライン'))}</div>
            </div>
            <div class="friend-card-actions">
              <button class="btn-dm-chat" title="一時チャットを開く"><i class="fa-regular fa-comment-dots"></i></button>
              <button class="btn-invite-proj" title="プロジェクトに招待"><i class="fa-solid fa-share-nodes"></i></button>
              <button class="btn-unfriend" title="フレンド解除"><i class="fa-solid fa-user-minus"></i></button>
            </div>
          `;

          item.querySelector('.btn-dm-chat').onclick = () => this.openDirectChat(f.userId);
          item.querySelector('.btn-invite-proj').onclick = () => {
            if (window.projectManager) {
              window.projectManager.openTeamModal();
              const select = document.getElementById('invite-friend-select');
              if (select) select.value = f.userId;
            }
          };
          item.querySelector('.btn-unfriend').onclick = (e) => {
            e.stopPropagation();
            this.removeFriend(f.userId);
          };

          friendsList.appendChild(item);
        });
      }
    }

    // 5. Outgoing Requests Section
    const outSection = document.getElementById('outgoing-requests-section');
    const outList = document.getElementById('outgoing-requests-list');
    if (outSection && outList) {
      const outCount = this.data.outgoingRequests.length;
      outSection.style.display = outCount > 0 ? 'block' : 'none';
      outList.innerHTML = '';
      this.data.outgoingRequests.forEach(req => {
        const row = document.createElement('div');
        row.className = 'friend-outgoing-row';
        row.innerHTML = `
          <div class="out-info">
            <span>申請中: <strong>@${this.escapeHtml(req.toUserId)}</strong></span>
          </div>
          <button class="btn-cancel-req" title="申請を取り消す">取消</button>
        `;
        row.querySelector('.btn-cancel-req').onclick = () => this.cancelOutgoingRequest(req.toUserId);
        outList.appendChild(row);
      });
    }

    // Update invite friend select dropdown in project team modal
    const inviteSelect = document.getElementById('invite-friend-select');
    if (inviteSelect) {
      const currentVal = inviteSelect.value;
      inviteSelect.innerHTML = '<option value="">フレンドを選択してください</option>';
      this.data.friends.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.userId;
        opt.textContent = `${f.username} (@${f.userId})`;
        inviteSelect.appendChild(opt);
      });
      if (currentVal) inviteSelect.value = currentVal;
    }
  }

  removeFriend(userId) {
    const friend = this.data.friends.find(f => f.userId === userId);
    const friendName = friend ? friend.username : userId;
    if (!confirm(`本当に「${friendName} (@${userId})」さんのフレンド登録を解除しますか？`)) {
      return;
    }

    this.data.friends = this.data.friends.filter(f => f.userId !== userId);
    this.saveData();

    // Close DM if currently active with this friend
    if (this.activeChatPartnerId === userId) {
      const drawer = document.getElementById('friend-chat-drawer');
      if (drawer) drawer.style.display = 'none';
      this.activeChatPartnerId = null;
    }

    this.renderFriendsUI();

    if (window.showToast) {
      window.showToast(`@${userId} さんのフレンド登録を解除しました`, 'info');
    }

    // Also close public profile modal if open
    const modal = document.getElementById('public-profile-modal');
    if (modal && modal.style.display === 'flex') {
      this.openPublicProfile(userId);
    }
  }

  openPublicProfile(targetUserOrId) {
    let user = targetUserOrId;
    if (typeof targetUserOrId === 'string') {
      const uId = targetUserOrId.toLowerCase();
      user = this.data.friends.find(f => f.userId.toLowerCase() === uId) ||
             (window.supabaseAuth?.getLocalUsers() || []).find(u => (u.userId || '').toLowerCase() === uId) ||
             { userId: targetUserOrId, username: targetUserOrId };
    }

    if (!user || !user.userId) return;

    const modal = document.getElementById('public-profile-modal');
    if (!modal) return;

    const myId = this.getCurrentUserId().toLowerCase();
    const isMe = user.userId.toLowerCase() === myId;
    const isFriend = this.data.friends.some(f => f.userId.toLowerCase() === user.userId.toLowerCase());
    const isPending = this.data.outgoingRequests.some(r => r.toUserId.toLowerCase() === user.userId.toLowerCase());

    const avatarEl = document.getElementById('pub-profile-avatar');
    const nameEl = document.getElementById('pub-profile-name');
    const idEl = document.getElementById('pub-profile-id');
    const bioEl = document.getElementById('pub-profile-bio');
    const genresEl = document.getElementById('pub-profile-genres');
    const actionBtnContainer = document.getElementById('pub-profile-action-container');

    const avatarUrl = user.avatar || user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`;
    if (avatarEl) avatarEl.src = avatarUrl;
    if (nameEl) nameEl.textContent = user.username || user.user_metadata?.full_name || user.userId;
    if (idEl) idEl.textContent = `@${user.userId}`;
    if (bioEl) bioEl.textContent = user.bio || (isMe ? (window.supabaseAuth?.currentUser?.bio || 'プロフィール未設定') : 'Wiz AI Game Studioでゲーム制作を楽しんでいます！');

    if (genresEl) {
      const genres = user.genres || ['アクション', 'レトロ'];
      genresEl.innerHTML = genres.map(g => `<span class="profile-genre-tag">${this.escapeHtml(g)}</span>`).join('');
    }

    if (actionBtnContainer) {
      if (isMe) {
        actionBtnContainer.innerHTML = `
          <button class="btn btn-primary" onclick="document.getElementById('theme-settings-modal').style.display='flex'; document.getElementById('settings-tab-profile')?.click(); document.getElementById('public-profile-modal').style.display='none';">
            <i class="fa-solid fa-pen"></i> プロフィールを編集
          </button>
        `;
      } else if (isFriend) {
        actionBtnContainer.innerHTML = `
          <button class="btn btn-primary" onclick="window.friendsManager.openDirectChat('${user.userId}'); document.getElementById('public-profile-modal').style.display='none';">
            <i class="fa-regular fa-comment-dots"></i> 一時チャット (DM)
          </button>
          <button class="btn btn-danger" onclick="window.friendsManager.removeFriend('${user.userId}')">
            <i class="fa-solid fa-user-minus"></i> フレンド解除
          </button>
        `;
      } else if (isPending) {
        actionBtnContainer.innerHTML = `
          <button class="btn btn-ghost" disabled>
            <i class="fa-solid fa-clock"></i> 申請送信済み
          </button>
        `;
      } else {
        actionBtnContainer.innerHTML = `
          <button class="btn btn-primary" onclick="window.friendsManager.sendFriendRequest('${user.userId}'); window.friendsManager.openPublicProfile('${user.userId}');">
            <i class="fa-solid fa-user-plus"></i> フレンド申請を送る
          </button>
        `;
      }
    }

    modal.style.display = 'flex';
  }

  // Render PDF 3P Style Friends View
  renderFriendsPageView() {
    const grid = document.getElementById('friends-view-cards-grid');
    if (!grid) return;

    const friends = this.data?.friends || [];

    if (friends.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; border: 1px dashed var(--border-color); border-radius: 12px; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-user-group"></i></div>
          <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">フレンドがまだいません</h3>
          <p style="font-size: 0.9rem; margin-bottom: 1.2rem;">他のクリエイターのユーザーIDを検索して、フレンド申請を送りましょう！</p>
          <button class="btn btn-primary" onclick="document.getElementById('add-friend-modal').style.display='flex'">
            <i class="fa-solid fa-user-plus"></i> フレンドを追加する
          </button>
        </div>
      `;
      return;
    }

    // Check shared projects from projectManager
    const rooms = window.projectManager?.rooms || [];

    const cardsHtml = friends.map(friend => {
      // Find joint projects with this friend
      const sharedRooms = rooms.filter(r => 
        (r.team || []).some(m => (m.userId || '').toLowerCase() === friend.userId.toLowerCase())
      );

      let sharedProjectText = '個人制作中';
      if (sharedRooms.length > 0) {
        const roomNames = sharedRooms.map(r => `「${this.escapeHtml(r.name)}」`).join('、');
        sharedProjectText = `共同プロジェクト ${roomNames} のチームメンバー`;
      }

      const avatarUrl = friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.userId}`;
      const bio = friend.bio || friend.statusText || 'Wiz AI Game Creator クリエイター';

      return `
        <div class="pdf-friend-card">
          <div class="pdf-friend-card-body">
            <div class="pdf-friend-avatar-circle" onclick="window.friendsManager.openPublicProfile('${friend.userId}')" title="プロフィールを見る">
              <img src="${avatarUrl}" alt="${this.escapeHtml(friend.username)}" />
              <span class="avatar-tag-label">アカウント画像</span>
            </div>
            <div class="pdf-friend-info">
              <div class="pdf-friend-name" onclick="window.friendsManager.openPublicProfile('${friend.userId}')">${this.escapeHtml(friend.username)}</div>
              <div class="pdf-friend-id">@${this.escapeHtml(friend.userId)}</div>
              <div class="pdf-friend-bio">
                <span class="bio-label">プロフィール:</span> ${this.escapeHtml(bio)}
              </div>
              <div class="pdf-friend-collab-badge">
                <i class="fa-solid fa-users" style="color:var(--brand-primary); font-size:0.85rem;"></i>
                <span>${sharedProjectText}</span>
              </div>
            </div>
          </div>
          <div class="pdf-friend-card-actions">
            <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="window.friendsManager.openDirectChat('${friend.userId}')">
              <i class="fa-regular fa-comment-dots"></i> 一時チャット (DM)
            </button>
            <button class="btn btn-ghost btn-sm" onclick="window.friendsManager.openPublicProfile('${friend.userId}')" title="詳細プロフィール">
              <i class="fa-solid fa-id-card"></i> プロフィール
            </button>
            <button class="btn btn-ghost btn-sm" onclick="window.friendsManager.removeFriend('${friend.userId}')" title="フレンド解除" style="color:var(--brand-red);">
              <i class="fa-solid fa-user-xmark"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    grid.innerHTML = cardsHtml;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Global initialization
window.friendsManager = new FriendsManager();
window.openPublicProfile = (user) => window.friendsManager.openPublicProfile(user);


