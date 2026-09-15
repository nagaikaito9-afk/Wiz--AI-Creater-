/**
 * Wiz AI Game Creator - Project & Multi-Room Manager (Enhanced Edition)
 * Features:
 * - Multi-project rooms management (Create, Switch, Rename, Delete)
 * - Programmatic Wiz Agent Actions (createNewRoom, switchRoomByNameOrId, renameCurrentRoom)
 * - Shared Projects & Team Permissions (管理者 Admin, 編集者 Editor, 観覧者 Viewer)
 * - Project Invites & Join Requests
 * - Per-room project rules & Cross-room memory aggregator
 * - Automatic syncing with LocalStorage and Supabase Cloud
 */

class ProjectManager {
  constructor() {
    this.storageKey = 'wiz_game_studio_rooms_v2';
    this.activeRoomIdKey = 'wiz_active_room_id_v2';
    this.crossMemoryKey = 'wiz_cross_room_memory';

    this.rooms = [];
    this.activeRoomId = null;
    this.crossRoomMemoryEnabled = localStorage.getItem(this.crossMemoryKey) === 'true';
    this.searchQuery = '';

    // Realtime Database & Co-dev Channel
    try {
      this.realtimeChannel = new BroadcastChannel('wiz_realtime_db_channel');
      this.realtimeChannel.onmessage = (e) => this.handleRealtimeEvent(e.data);
    } catch (err) {
      console.warn('BroadcastChannel not supported:', err);
    }

    // DOM Elements
    this.roomsListContainer = null;
    this.activeProjectTitleEl = null;
    this.activeProjectRulesBtn = null;
    this.projectTeamBtn = null;
    this.rulesModal = null;
    this.rulesTextarea = null;
    this.saveRulesBtn = null;
    this.closeRulesModalBtn = null;
    this.teamModal = null;
    this.searchInput = null;

    this.init();
  }

  init() {
    this.loadRooms();
    this.bindDomElements();
    this.syncActiveRoomVFS();
  }

  // Synchronize VFS with currently active room on startup
  syncActiveRoomVFS() {
    const active = this.getActiveRoom();
    if (active && window.vfs) {
      window.vfs.setCurrentRoom(active.id, active.vfsRoot, active.name);
      active.vfsRoot = JSON.parse(JSON.stringify(window.vfs.root));
      this.saveRooms();
      if (window.editor) {
        window.editor.renderTree();
        window.editor.openFile('index.html');
      }
    }
  }

  // Real-time synchronization callback from VFS
  syncVfsToActiveRoom(vfsRoot) {
    const curr = this.getActiveRoom();
    if (!curr || !vfsRoot) return;
    curr.vfsRoot = JSON.parse(JSON.stringify(vfsRoot));
    curr.updatedAt = Date.now();
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.rooms));
    } catch (e) {
      console.warn('LocalStorage save failed in syncVfsToActiveRoom:', e);
    }
  }

  bindDomElements() {
    this.roomsListContainer = document.getElementById('project-rooms-list');
    this.activeProjectTitleEl = document.getElementById('active-project-name-display');
    this.activeProjectRulesBtn = document.getElementById('project-rules-btn');
    this.projectTeamBtn = document.getElementById('project-team-btn');
    this.rulesModal = document.getElementById('project-rules-modal');
    this.rulesTextarea = document.getElementById('project-rules-textarea');
    this.saveRulesBtn = document.getElementById('save-project-rules-btn');
    this.closeRulesModalBtn = document.getElementById('close-rules-modal-btn');
    this.teamModal = document.getElementById('project-team-modal');

    // Search input
    this.searchInput = document.getElementById('project-search-input');
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        this.renderRoomsList();
      });
    }

    // "New Project" button
    const newProjBtn = document.getElementById('new-project-btn');
    if (newProjBtn) {
      newProjBtn.onclick = (e) => {
        e.preventDefault();
        this.promptCreateNewRoom();
      };
    }

    // Header Project Rename button
    const headerRenameBtn = document.getElementById('header-rename-project-btn');
    if (headerRenameBtn) {
      headerRenameBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.promptRenameRoom(this.activeRoomId, e);
      };
    }

    // Project Rules Button
    if (this.activeProjectRulesBtn) {
      this.activeProjectRulesBtn.onclick = (e) => {
        e.preventDefault();
        this.openRulesModal();
      };
    }

    // Project Team / Sharing Button
    if (this.projectTeamBtn) {
      this.projectTeamBtn.onclick = (e) => {
        e.preventDefault();
        this.openTeamModal();
      };
    }

    // Close rules modal
    if (this.closeRulesModalBtn) {
      this.closeRulesModalBtn.onclick = (e) => {
        e.preventDefault();
        if (this.rulesModal) this.rulesModal.style.display = 'none';
      };
    }

    // Backdrop click closes rules modal
    this.rulesModal?.addEventListener('click', (e) => {
      if (e.target === this.rulesModal) {
        this.rulesModal.style.display = 'none';
      }
    });

    if (this.saveRulesBtn) {
      this.saveRulesBtn.onclick = (e) => {
        e.preventDefault();
        this.saveCurrentRules();
      };
    }

    // Team Modal events
    this.bindTeamModalEvents();

    this.renderRoomsList();
    this.updateActiveRoomHeader();
  }

  // Load from LocalStorage
  loadRooms() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        this.rooms = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved rooms:', e);
        this.rooms = [];
      }
    }

    // Upgrade existing rooms to have team structure if missing
    const myId = window.supabaseAuth?.currentUser?.userId || 'wiz_creator';
    const myName = window.supabaseAuth?.currentUser?.username || 'Wiz Creator';

    if (!this.rooms) {
      this.rooms = [];
      this.activeRoomId = null;
    } else {
      this.rooms.forEach(r => {
        if (!r.team) {
          r.ownerId = r.ownerId || myId;
          r.ownerUsername = r.ownerUsername || myName;
          r.team = [
            { userId: r.ownerId, username: r.ownerUsername, role: 'admin', joinedAt: new Date().toISOString() }
          ];
          r.pendingInvites = r.pendingInvites || [];
          r.joinRequests = r.joinRequests || [];
        }
      });

      const lastActive = localStorage.getItem(this.activeRoomIdKey);
      if (lastActive && this.rooms.some(r => r.id === lastActive)) {
        this.activeRoomId = lastActive;
      } else if (this.rooms.length > 0) {
        this.activeRoomId = this.rooms[0].id;
      } else {
        this.activeRoomId = null;
      }
    }
  }

  saveRooms() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.rooms));
      if (this.activeRoomId) {
        localStorage.setItem(this.activeRoomIdKey, this.activeRoomId);
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  getActiveRoom() {
    return this.rooms.find(r => r.id === this.activeRoomId) || this.rooms[0];
  }

  getAllRooms() {
    return [...this.rooms];
  }

  getCrossRoomMemoryPrompt() {
    if (!this.crossRoomMemoryEnabled) return '';
    const otherRooms = this.rooms.filter(r => r.id !== this.activeRoomId);
    if (otherRooms.length === 0) return '';

    const summaries = otherRooms.slice(0, 3).map(r => {
      const ruleText = r.rules ? ` (ルール: ${r.rules.slice(0, 40)}...)` : '';
      return `- プロジェクト「${r.name}」${ruleText}`;
    }).join('\n');

    return `【ユーザーが過去に作成した他のプロジェクト情報（横断メモリ）】:\n${summaries}\nこれらの文脈やユーザーの好みを踏まえてアシストしてください。`;
  }

  getCurrentUserId() {
    return window.supabaseAuth?.currentUser?.userId || 'wiz_creator';
  }

  // Get current user's role in active room: 'admin' | 'editor' | 'viewer'
  getCurrentUserRole(room = null) {
    const r = room || this.getActiveRoom();
    if (!r) return 'viewer';
    const myId = (window.supabaseAuth?.currentUser?.userId || 'wiz_creator').toLowerCase();
    if ((r.ownerId || '').toLowerCase() === myId) return 'admin';
    const member = (r.team || []).find(m => (m.userId || '').toLowerCase() === myId);
    if (member) return member.role || 'editor';
    return 'admin';
  }

  isCurrentUserAdmin() {
    return this.getCurrentUserRole() === 'admin';
  }

  isCurrentUserEditor() {
    const role = this.getCurrentUserRole();
    return role === 'admin' || role === 'editor';
  }

  isCurrentUserViewer() {
    return this.getCurrentUserRole() === 'viewer';
  }

  // Programmatic Room Creation (Called by User Prompt or Wiz Agent Action)
  createNewRoom(name = '新しいプロジェクト') {
    this.snapshotCurrentRoom();

    const newId = 'room_' + Date.now();
    const myId = window.supabaseAuth?.currentUser?.userId || 'wiz_creator';
    const myName = window.supabaseAuth?.currentUser?.username || 'Wiz Creator';

    const newRoom = {
      id: newId,
      name: name.trim(),
      rules: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chatHistory: [],
      ownerId: myId,
      ownerUsername: myName,
      team: [
        { userId: myId, username: myName, role: 'admin', joinedAt: new Date().toISOString() }
      ],
      pendingInvites: [],
      joinRequests: [],
      vfsRoot: null
    };

    this.rooms.unshift(newRoom);
    this.activeRoomId = newId;

    // Initialize completely independent VFS specifically for this new room
    if (window.vfs) {
      window.vfs.setCurrentRoom(newId, null, newRoom.name);
      newRoom.vfsRoot = JSON.parse(JSON.stringify(window.vfs.root));
      if (window.editor) {
        window.editor.renderTree();
        window.editor.openFile('index.html');
      }
    }

    this.saveRooms();

    // Reset Chat messages
    if (window.app) {
      window.app.clearChatMessages(false);
      window.app.sendGreeting();
    }

    this.renderRoomsList();
    this.renderProjectsView();
    this.updateActiveRoomHeader();

    if (window.showToast) {
      window.showToast(`新しいプロジェクト「${name}」を作成しました！エディタに移動します`, 'success');
    }

    if (window.supabaseAuth) {
      window.supabaseAuth.saveRoomToCloud?.(newRoom);
    }

    // 即座にそのプロジェクトのエディタ（スタジオ）へ移動
    if (window.app && typeof window.app.switchPageView === 'function') {
      window.app.switchPageView('studio');
    }

    return newRoom;
  }

  // Interactive prompt
  async promptCreateNewRoom() {
    const name = await window.showPrompt('新しいゲームプロジェクトの名前を入力してください:', '新しいゲーム', '新規プロジェクト作成');
    if (!name) return;
    this.createNewRoom(name);
  }

  // Switch Room
  switchRoom(roomId) {
    if (roomId === this.activeRoomId) return;

    this.snapshotCurrentRoom();

    const target = this.rooms.find(r => r.id === roomId);
    if (!target) return;

    this.activeRoomId = roomId;
    this.saveRooms();

    // Restore isolated VFS for target room
    if (window.vfs) {
      window.vfs.setCurrentRoom(target.id, target.vfsRoot, target.name);
      target.vfsRoot = JSON.parse(JSON.stringify(window.vfs.root));
      this.saveRooms();
      if (window.editor) {
        window.editor.renderTree();
        window.editor.openFile('index.html');
      }
    }

    // Restore Chat
    if (window.app) {
      window.app.restoreChatHistory(target.chatHistory || []);
    }

    this.renderRoomsList();
    this.updateActiveRoomHeader();

    if (window.showToast) {
      window.showToast(`「${target.name}」に切り替えました`, 'info', 1500);
    }
  }

  // Programmatic Room Switch (by Name or ID)
  switchRoomByNameOrId(nameOrId) {
    if (!nameOrId) return false;
    const lower = nameOrId.toLowerCase().trim();
    const found = this.rooms.find(r => r.id === nameOrId || r.name.toLowerCase().includes(lower));
    if (found) {
      this.switchRoom(found.id);
      return true;
    }
    return false;
  }

  // Snapshot current active room data
  snapshotCurrentRoom() {
    const curr = this.getActiveRoom();
    if (!curr) return;

    if (window.vfs) {
      curr.vfsRoot = JSON.parse(JSON.stringify(window.vfs.root));
      window.vfs.save();
    }
    if (window.app) {
      curr.chatHistory = window.app.exportChatHistory();
    }
    curr.updatedAt = Date.now();
    this.saveRooms();

    if (window.supabaseAuth) {
      window.supabaseAuth.saveRoomToCloud?.(curr);
    }
  }

  // Rename Room
  async promptRenameRoom(roomId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetId = roomId || this.activeRoomId;
    const room = this.rooms.find(r => r.id === targetId);
    if (!room) return;

    if (!this.isCurrentUserAdmin()) {
      if (window.showToast) window.showToast('プロジェクト名の変更は管理者のみ可能です', 'warning');
      return;
    }

    const newName = await window.showPrompt('新しいプロジェクト名を入力してください:', room.name, 'プロジェクト名変更');
    if (newName && newName.trim() && newName.trim() !== room.name) {
      this.renameRoom(targetId, newName.trim());
    }
  }

  renameRoom(roomId, newName) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room || !newName) return;
    room.name = newName.trim();
    room.updatedAt = Date.now();
    this.saveRooms();
    this.renderRoomsList();
    this.updateActiveRoomHeader();
    if (window.showToast) window.showToast(`プロジェクト名を「${room.name}」に変更しました`, 'success');
  }

  renameCurrentRoom(newName) {
    this.renameRoom(this.activeRoomId, newName);
  }

  // Delete Room
  async promptDeleteRoom(roomId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const targetId = roomId || this.activeRoomId;
    const room = this.rooms.find(r => r.id === targetId);
    if (!room) return;

    if (!this.isCurrentUserAdmin()) {
      if (window.showToast) window.showToast('プロジェクトの削除は管理者のみ可能です', 'warning');
      return;
    }

    if (this.rooms.length <= 1) {
      const ok = await window.showConfirm(
        `「${room.name}」はスタジオにある唯一のプロジェクトです。\nプロジェクトを初期状態（ネオン・ブロック崩し）にリセットしますか？`,
        'プロジェクトの初期化'
      );
      if (ok) {
        if (window.vfs) window.vfs.resetToDefault();
        room.name = 'ネオン・ブロック崩し';
        room.rules = '';
        room.chatHistory = [];
        this.saveRooms();
        if (window.app) {
          window.app.clearChatMessages(false);
          window.app.sendGreeting();
        }
        this.renderRoomsList();
        this.updateActiveRoomHeader();
        if (window.showToast) window.showToast('プロジェクトを初期状態にリセットしました', 'info');
      }
      return;
    }

    const ok = await window.showConfirm(`プロジェクト「${room.name}」を削除しますか？\n（コードやチャット履歴は失われます）`, 'プロジェクト削除');
    if (ok) {
      this.rooms = this.rooms.filter(r => r.id !== targetId);
      if (this.activeRoomId === targetId) {
        this.activeRoomId = this.rooms[0].id;
        const remaining = this.rooms[0];
        if (remaining.vfsRoot && window.vfs) {
          window.vfs.root = JSON.parse(JSON.stringify(remaining.vfsRoot));
          window.vfs.save();
          window.vfs.notify();
          window.editor?.openFile('index.html');
        }
        if (window.app) {
          window.app.restoreChatHistory(remaining.chatHistory || []);
        }
      }
      this.saveRooms();
      this.renderRoomsList();
      this.updateActiveRoomHeader();
      if (window.showToast) window.showToast('プロジェクトを削除しました', 'info');
    }
  }

  deleteCurrentRoom() {
    this.promptDeleteRoom(this.activeRoomId);
  }

  // Project Rules Modal
  openRulesModal() {
    const room = this.getActiveRoom();
    if (!room || !this.rulesModal) return;

    if (this.rulesTextarea) {
      this.rulesTextarea.value = room.rules || '';
    }
    const title = document.getElementById('project-rules-modal-title');
    if (title) title.textContent = `プロジェクトルール - ${room.name}`;

    this.rulesModal.style.display = 'flex';
    this.rulesTextarea?.focus();
  }

  saveCurrentRules() {
    const room = this.getActiveRoom();
    if (!room) return;

    const newRules = this.rulesTextarea?.value.trim() || '';
    room.rules = newRules;
    room.updatedAt = Date.now();
    this.saveRooms();

    this.updateActiveRoomHeader();
    if (this.rulesModal) this.rulesModal.style.display = 'none';

    if (window.showToast) {
      window.showToast('プロジェクトルールを保存しました！Wizがこの方針に従います。', 'success');
    }
  }

  updateActiveRoomHeader() {
    const room = this.getActiveRoom();
    if (!room) {
      if (this.activeProjectTitleEl) {
        this.activeProjectTitleEl.textContent = 'プロジェクト未選択';
      }
      if (this.activeProjectRulesBtn) {
        this.activeProjectRulesBtn.classList.remove('has-rules');
        this.activeProjectRulesBtn.title = 'プロジェクトがありません';
      }
      return;
    }

    if (this.activeProjectTitleEl) {
      this.activeProjectTitleEl.textContent = room.name;
    }

    if (this.activeProjectRulesBtn) {
      if (room.rules && room.rules.trim()) {
        this.activeProjectRulesBtn.classList.add('has-rules');
        this.activeProjectRulesBtn.title = `ルール設定中: ${room.rules.substring(0, 30)}...`;
      } else {
        this.activeProjectRulesBtn.classList.remove('has-rules');
        this.activeProjectRulesBtn.title = 'この部屋のプロジェクトルールを設定';
      }
    }
  }

  togglePin(roomId, e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    room.isPinned = !room.isPinned;
    this.saveRooms();
    this.renderRoomsList();

    if (window.showToast) {
      window.showToast(room.isPinned ? `📌「${room.name}」をピン留めしました` : `「${room.name}」のピン留めを解除しました`, 'info');
    }
  }

  // Real-time Database Broadcast & Sync
  broadcastUpdate(changes = {}) {
    const active = this.getActiveRoom();
    if (!active || !this.realtimeChannel) return;

    const payload = {
      type: 'PROJECT_UPDATED',
      roomId: active.id,
      roomName: active.name,
      updatedBy: this.getCurrentUserId(),
      changes: changes,
      vfsRoot: window.vfs ? JSON.parse(JSON.stringify(window.vfs.root)) : null,
      timestamp: Date.now()
    };

    try {
      this.realtimeChannel.postMessage(payload);
    } catch (err) {
      console.warn('Realtime broadcast failed:', err);
    }
  }

  handleRealtimeEvent(data) {
    if (!data || data.type !== 'PROJECT_UPDATED') return;
    const { roomId, roomName, updatedBy, changes, vfsRoot } = data;
    if (updatedBy === this.getCurrentUserId()) return; // Ignore self updates

    const room = this.rooms.find(r => r.id === roomId);
    if (room) {
      if (vfsRoot) room.vfsRoot = vfsRoot;
      room.updatedAt = Date.now();
      this.saveRooms();

      if (this.activeRoomId === roomId) {
        if (vfsRoot && window.vfs) {
          window.vfs.root = JSON.parse(JSON.stringify(vfsRoot));
          window.vfs.save();
          window.vfs.notify();
          window.editor?.renderTree();
        }
        if (window.showToast) {
          window.showToast(`⚡ 共同開発者 @${updatedBy} が「${roomName}」を更新しました！`, 'info');
        }
      }
    }

    // In-app Notification Center
    if (window.notificationsCenter) {
      window.notificationsCenter.notify({
        type: 'project_update',
        title: '共同プロジェクト更新',
        message: `「${roomName || '共同プロジェクト'}」が @${updatedBy} により更新されました`,
        meta: { roomId }
      });
    }

    // Activity Logger
    if (window.activityLogger) {
      window.activityLogger.log(`共同プロジェクト*${roomName}*が@${updatedBy}により更新されました`, 'sync');
    }
  }

  // Render Rooms in Left Sidebar
  renderRoomsList() {
    if (!this.roomsListContainer) return;
    this.roomsListContainer.innerHTML = '';

    // 1. Filter by search query
    let filteredRooms = this.rooms;
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filteredRooms = filteredRooms.filter(r => r.name.toLowerCase().includes(q));
    }

    // 2. Sort pinned rooms to the top
    const sortedRooms = [...filteredRooms].sort((a, b) => {
      const pinA = a.isPinned ? 1 : 0;
      const pinB = b.isPinned ? 1 : 0;
      if (pinB !== pinA) return pinB - pinA;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    if (this.rooms.length === 0) {
      this.roomsListContainer.innerHTML = `
        <div class="empty-projects-state">
          <i class="fa-solid fa-folder-open"></i>
          <div class="empty-title">プロジェクトがありません</div>
          <p class="empty-desc">まだ作成されたプロジェクトはありません。<br>「新しいプロジェクト」を作成して開発をはじめましょう！</p>
          <button type="button" class="btn btn-primary btn-sm empty-create-btn" id="empty-create-room-btn">
            <i class="fa-solid fa-plus"></i> 新規作成
          </button>
        </div>
      `;
      const createBtn = this.roomsListContainer.querySelector('#empty-create-room-btn');
      if (createBtn) {
        createBtn.onclick = () => this.promptCreateNewRoom();
      }
      return;
    }

    if (sortedRooms.length === 0) {
      this.roomsListContainer.innerHTML = `
        <div class="rooms-search-empty">
          <i class="fa-solid fa-magnifying-glass"></i>
          <p>一致するプロジェクトがありません</p>
        </div>
      `;
      return;
    }

    sortedRooms.forEach(room => {
      const isActive = room.id === this.activeRoomId;
      const isPinned = Boolean(room.isPinned);
      const card = document.createElement('div');
      card.className = `room-item-card room-item ${isActive ? 'active' : ''} ${isPinned ? 'is-pinned' : ''}`;
      card.setAttribute('data-room-id', room.id);

      const hasRules = room.rules && room.rules.trim().length > 0;
      const role = this.getCurrentUserRole(room);

      card.innerHTML = `
        <div class="room-icon">
          <i class="fa-solid fa-gamepad"></i>
        </div>
        <div class="room-details">
          <div class="room-title-line">
            ${isPinned ? '<span class="pinned-indicator-icon" title="ピン留め中"><i class="fa-solid fa-thumbtack"></i></span>' : ''}
            <span class="room-name room-title" title="${this.escapeHtml(room.name)}">${this.escapeHtml(room.name)}</span>
          </div>
          <div class="room-meta-tags">
            <span class="room-role-pill role-${role}">${role === 'admin' ? '管理者' : role === 'editor' ? '編集者' : '観覧者'}</span>
            ${hasRules ? '<span class="room-rule-indicator"><i class="fa-solid fa-scroll"></i> ルールあり</span>' : ''}
          </div>
        </div>
        <div class="room-actions">
          <button class="btn-room-action btn-room-pin ${isPinned ? 'active' : ''}" title="${isPinned ? 'ピン留め解除' : 'ピン留め'}" type="button">
            <i class="fa-solid fa-thumbtack"></i>
          </button>
          <button class="btn-room-action btn-room-rename" title="名前を変更" type="button">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-room-action btn-room-delete" title="プロジェクトを削除" type="button">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      card.onclick = (e) => {
        if (e.target.closest('.room-actions')) return;
        this.switchRoom(room.id);
      };

      const pinBtn = card.querySelector('.btn-room-pin');
      if (pinBtn) {
        pinBtn.onclick = (e) => this.togglePin(room.id, e);
      }

      const renameBtn = card.querySelector('.btn-room-rename');
      if (renameBtn) {
        renameBtn.onclick = (e) => this.promptRenameRoom(room.id, e);
      }

      const deleteBtn = card.querySelector('.btn-room-delete');
      if (deleteBtn) {
        deleteBtn.onclick = (e) => this.promptDeleteRoom(room.id, e);
      }

      this.roomsListContainer.appendChild(card);
    });
  }

  // ==========================================
  // SHARED PROJECTS & TEAM MANAGEMENT
  // ==========================================
  bindTeamModalEvents() {
    const modal = document.getElementById('project-team-modal');
    const closeBtn = document.getElementById('close-team-modal-btn');
    const closeFooterBtn = document.getElementById('close-team-modal-footer-btn');

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    closeBtn?.addEventListener('click', closeModal);
    closeFooterBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Tabs: Members vs Invite vs Requests
    const tabMembers = document.getElementById('team-tab-members-btn');
    const tabInvite = document.getElementById('team-tab-invite-btn');
    const tabRequests = document.getElementById('team-tab-requests-btn');

    const panelMembers = document.getElementById('team-panel-members');
    const panelInvite = document.getElementById('team-panel-invite');
    const panelRequests = document.getElementById('team-panel-requests');

    tabMembers?.addEventListener('click', () => {
      tabMembers.classList.add('active');
      tabInvite?.classList.remove('active');
      tabRequests?.classList.remove('active');
      if (panelMembers) panelMembers.style.display = 'block';
      if (panelInvite) panelInvite.style.display = 'none';
      if (panelRequests) panelRequests.style.display = 'none';
    });

    tabInvite?.addEventListener('click', () => {
      tabInvite.classList.add('active');
      tabMembers?.classList.remove('active');
      tabRequests?.classList.remove('active');
      if (panelMembers) panelMembers.style.display = 'none';
      if (panelInvite) panelInvite.style.display = 'block';
      if (panelRequests) panelRequests.style.display = 'none';
      // Populate friends dropdown
      window.friendsManager?.renderFriendsUI();
    });

    tabRequests?.addEventListener('click', () => {
      tabRequests.classList.add('active');
      tabMembers?.classList.remove('active');
      tabInvite?.classList.remove('active');
      if (panelMembers) panelMembers.style.display = 'none';
      if (panelInvite) panelInvite.style.display = 'none';
      if (panelRequests) panelRequests.style.display = 'block';
    });

    // Send Project Invite button
    document.getElementById('send-project-invite-btn')?.addEventListener('click', () => {
      const selectFriend = document.getElementById('invite-friend-select');
      const selectRole = document.getElementById('invite-role-select');
      const friendId = selectFriend?.value;
      const role = selectRole?.value || 'editor';

      if (!friendId) {
        if (window.showToast) window.showToast('招待するフレンドを選択してください', 'warning');
        return;
      }

      this.inviteMember(friendId, role);
      // Switch back to members list tab
      tabMembers?.click();
    });
  }

  openTeamModal() {
    if (!this.teamModal) return;
    this.renderTeamModal();
    this.teamModal.style.display = 'flex';
  }

  renderTeamModal() {
    const room = this.getActiveRoom();
    if (!room) return;

    const myRole = this.getCurrentUserRole(room);
    const isAdmin = myRole === 'admin';

    // Header labels
    const nameEl = document.getElementById('team-modal-project-name');
    const ownerEl = document.getElementById('team-modal-owner-label');
    const myRoleBadge = document.getElementById('team-modal-my-role-badge');
    const countEl = document.getElementById('team-members-count');
    const reqCountEl = document.getElementById('team-requests-count');

    if (nameEl) nameEl.textContent = room.name;
    if (ownerEl) ownerEl.textContent = `プロジェクト管理者: @${room.ownerId || 'wiz_creator'}`;
    if (myRoleBadge) {
      const roleName = myRole === 'admin' ? '管理者' : myRole === 'editor' ? '編集者' : '観覧者';
      myRoleBadge.className = `role-badge role-${myRole}`;
      myRoleBadge.textContent = `あなたの権限: ${roleName}`;
    }
    if (countEl) countEl.textContent = (room.team || []).length;
    if (reqCountEl) reqCountEl.textContent = (room.joinRequests || []).length;

    // 1. Members List
    const listEl = document.getElementById('team-members-list');
    if (listEl) {
      listEl.innerHTML = '';
      (room.team || []).forEach(m => {
        const item = document.createElement('div');
        item.className = 'team-member-card';
        const isOwner = (m.userId || '').toLowerCase() === (room.ownerId || '').toLowerCase();
        const roleName = m.role === 'admin' ? '管理者' : m.role === 'editor' ? '編集者' : '観覧者';

        item.innerHTML = `
          <div class="member-avatar-wrap">
            <i class="fa-solid fa-user"></i>
          </div>
          <div class="member-meta">
            <div class="member-name-row">
              <strong>${this.escapeHtml(m.username)}</strong>
              <span class="member-id">@${this.escapeHtml(m.userId)}</span>
              ${isOwner ? '<span class="owner-pill"><i class="fa-solid fa-crown"></i> オーナー</span>' : ''}
            </div>
            <div class="member-role-desc">権限: ${roleName}</div>
          </div>
          <div class="member-actions">
            ${isAdmin && !isOwner ? `
              <select class="member-role-select form-select">
                <option value="viewer" ${m.role === 'viewer' ? 'selected' : ''}>観覧者</option>
                <option value="editor" ${m.role === 'editor' ? 'selected' : ''}>編集者</option>
                <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>管理者</option>
              </select>
              <button class="btn-transfer-owner btn-icon-mini" title="このメンバーに管理者権限を譲渡" type="button"><i class="fa-solid fa-crown"></i></button>
              <button class="btn-remove-member btn-icon-mini" title="メンバーから削除" type="button"><i class="fa-solid fa-user-minus"></i></button>
            ` : `
              <span class="role-badge role-${m.role}">${roleName}</span>
            `}
          </div>
        `;

        if (isAdmin && !isOwner) {
          item.querySelector('.member-role-select')?.addEventListener('change', (e) => {
            this.changeMemberRole(room.id, m.userId, e.target.value);
          });
          item.querySelector('.btn-transfer-owner')?.addEventListener('click', () => {
            this.transferOwnership(room.id, m.userId);
          });
          item.querySelector('.btn-remove-member')?.addEventListener('click', () => {
            this.removeMember(room.id, m.userId);
          });
        }

        listEl.appendChild(item);
      });
    }

    // 2. Join Requests List
    const reqListEl = document.getElementById('team-join-requests-list');
    if (reqListEl) {
      reqListEl.innerHTML = '';
      if (!room.joinRequests || room.joinRequests.length === 0) {
        reqListEl.innerHTML = `
          <div class="team-empty-hint">
            <i class="fa-regular fa-bell-slash"></i>
            <p>現在、未処理の参加申請はありません。</p>
          </div>
        `;
      } else {
        room.joinRequests.forEach(r => {
          const row = document.createElement('div');
          row.className = 'join-request-row';
          row.innerHTML = `
            <div class="req-user-info">
              <strong>${this.escapeHtml(r.username || r.userId)}</strong>
              <span>@${this.escapeHtml(r.userId)} からの参加申請</span>
            </div>
            ${isAdmin ? `
              <div class="req-action-group">
                <button class="btn-accept-editor btn btn-primary"><i class="fa-solid fa-user-pen"></i> 編集者として承認</button>
                <button class="btn-accept-viewer btn btn-ghost"><i class="fa-solid fa-eye"></i> 観覧者として承認</button>
                <button class="btn-reject-req btn btn-ghost"><i class="fa-solid fa-xmark"></i> 拒否</button>
              </div>
            ` : `
              <span class="badge-subtle">管理者のみ承認可能</span>
            `}
          `;

          if (isAdmin) {
            row.querySelector('.btn-accept-editor')?.addEventListener('click', () => {
              this.approveJoinRequest(room.id, r.userId, 'editor');
            });
            row.querySelector('.btn-accept-viewer')?.addEventListener('click', () => {
              this.approveJoinRequest(room.id, r.userId, 'viewer');
            });
            row.querySelector('.btn-reject-req')?.addEventListener('click', () => {
              this.rejectJoinRequest(room.id, r.userId);
            });
          }

          reqListEl.appendChild(row);
        });
      }
    }
  }

  // Invite member
  inviteMember(userId, role = 'editor') {
    const room = this.getActiveRoom();
    if (!room) return;

    if (!this.isCurrentUserAdmin()) {
      if (window.showToast) window.showToast('メンバー招待はプロジェクト管理者のみ可能です', 'warning');
      return;
    }

    room.pendingInvites = room.pendingInvites || [];
    room.team = room.team || [];

    if (room.team.some(m => m.userId.toLowerCase() === userId.toLowerCase())) {
      if (window.showToast) window.showToast(`@${userId} さんは既にチームメンバーです`, 'info');
      return;
    }

    if (room.pendingInvites.some(i => i.userId.toLowerCase() === userId.toLowerCase())) {
      if (window.showToast) window.showToast(`@${userId} さんへは既に招待送信済みです`, 'warning');
      return;
    }

    const friend = window.friendsManager?.data?.friends?.find(f => f.userId.toLowerCase() === userId.toLowerCase());
    const username = friend ? friend.username : userId;

    room.pendingInvites.push({
      userId: userId,
      username: username,
      role: role,
      invitedAt: new Date().toISOString()
    });

    this.saveRooms();
    this.renderTeamModal();

    const roleName = role === 'editor' ? '編集者' : role === 'viewer' ? '観覧者' : '管理者';
    if (window.showToast) {
      window.showToast(`@${userId} さんを「${roleName}」として招待しました！`, 'success');
    }

    // Auto-accept simulated demo friend invites after 2.5s
    if (['pixel_hero', 'sound_mage'].includes(userId)) {
      setTimeout(() => {
        this.acceptInvitation(room.id, userId, username, role);
      }, 2500);
    }
  }

  acceptInvitation(roomId, userId, username, role) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    room.pendingInvites = (room.pendingInvites || []).filter(i => i.userId !== userId);
    room.team = room.team || [];

    if (!room.team.some(m => m.userId === userId)) {
      room.team.push({
        userId: userId,
        username: username,
        role: role,
        joinedAt: new Date().toISOString()
      });
      this.saveRooms();
      this.renderTeamModal();
      this.renderRoomsList();
      if (window.showToast) {
        window.showToast(`🤝 @${userId} さんがプロジェクト「${room.name}」に参加しました！`, 'success');
      }
    }
  }

  changeMemberRole(roomId, userId, newRole) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room || !this.isCurrentUserAdmin()) return;

    const member = (room.team || []).find(m => m.userId === userId);
    if (member) {
      member.role = newRole;
      this.saveRooms();
      this.renderTeamModal();
      this.renderRoomsList();
      const roleName = newRole === 'editor' ? '編集者' : newRole === 'viewer' ? '観覧者' : '管理者';
      if (window.showToast) {
        window.showToast(`@${userId} さんの権限を「${roleName}」に変更しました`, 'success');
      }
    }
  }

  async transferOwnership(roomId, newOwnerId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room || !this.isCurrentUserAdmin()) return;

    const ok = await window.showConfirm(
      `プロジェクト「${room.name}」の管理者権限を @${newOwnerId} さんに譲渡しますか？\n（あなた自身は編集者権限になります）`,
      '管理者権限の譲渡'
    );
    if (!ok) return;

    const member = (room.team || []).find(m => m.userId === newOwnerId);
    if (!member) return;

    const oldOwnerMember = (room.team || []).find(m => m.userId === room.ownerId);
    if (oldOwnerMember) oldOwnerMember.role = 'editor';

    member.role = 'admin';
    room.ownerId = newOwnerId;
    room.ownerUsername = member.username;

    this.saveRooms();
    this.renderTeamModal();
    this.renderRoomsList();
    if (window.showToast) {
      window.showToast(`プロジェクトの管理者権限を @${newOwnerId} さんに譲渡しました！`, 'success');
    }
  }

  async removeMember(roomId, userId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room || !this.isCurrentUserAdmin()) return;

    const ok = await window.showConfirm(`@${userId} さんをチームから除外しますか？`, 'メンバー削除');
    if (!ok) return;

    room.team = (room.team || []).filter(m => m.userId !== userId);
    this.saveRooms();
    this.renderTeamModal();
    this.renderRoomsList();
    this.renderProjectsView();
    if (window.showToast) window.showToast(`@${userId} さんをチームから削除しました`, 'info');
  }

  approveJoinRequest(roomId, userId, role = 'editor') {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room || !this.isCurrentUserAdmin()) return;

    const req = (room.joinRequests || []).find(r => r.userId === userId);
    room.joinRequests = (room.joinRequests || []).filter(r => r.userId !== userId);
    room.team = room.team || [];

    room.team.push({
      userId: userId,
      username: req ? req.username : userId,
      role: role,
      joinedAt: new Date().toISOString()
    });

    this.saveRooms();
    this.renderTeamModal();
    this.renderRoomsList();
    this.renderProjectsView();
    const roleName = role === 'editor' ? '編集者' : '観覧者';
    if (window.showToast) {
      window.showToast(`@${userId} さんの参加申請を「${roleName}」として承認しました！`, 'success');
    }
  }

  rejectJoinRequest(roomId, userId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room || !this.isCurrentUserAdmin()) return;

    room.joinRequests = (room.joinRequests || []).filter(r => r.userId !== userId);
    this.saveRooms();
    this.renderTeamModal();
    if (window.showToast) window.showToast(`@${userId} さんの参加申請を却下しました`, 'info');
  }

  // Clone a project room
  cloneRoom(roomId) {
    const sourceRoom = this.rooms.find(r => r.id === roomId);
    if (!sourceRoom) return;

    const myId = window.supabaseAuth?.currentUser?.userId || 'wiz_creator';
    const myName = window.supabaseAuth?.currentUser?.username || 'Wiz Creator';
    const newRoomId = 'room_' + Date.now();
    const newRoomName = `${sourceRoom.name} (コピー)`;

    // Deep clone VFS data
    let clonedVfs = null;
    if (sourceRoom.vfsRoot) {
      clonedVfs = JSON.parse(JSON.stringify(sourceRoom.vfsRoot));
    } else {
      // Try reading room-specific vfs storage
      const vfsRaw = localStorage.getItem(`wiz_vfs_room_${roomId}`);
      if (vfsRaw) {
        try {
          clonedVfs = JSON.parse(vfsRaw);
        } catch (e) {}
      }
    }

    if (!clonedVfs && window.vfs) {
      clonedVfs = JSON.parse(JSON.stringify(window.vfs.root));
    }

    // Save cloned VFS into new room key
    if (clonedVfs) {
      try {
        localStorage.setItem(`wiz_vfs_room_${newRoomId}`, JSON.stringify(clonedVfs));
      } catch (e) {
        console.warn('Failed to persist cloned vfs:', e);
      }
    }

    const clonedRoom = {
      id: newRoomId,
      name: newRoomName,
      rules: sourceRoom.rules || '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chatHistory: [],
      ownerId: myId,
      ownerUsername: myName,
      team: [
        { userId: myId, username: myName, role: 'admin', joinedAt: new Date().toISOString() }
      ],
      pendingInvites: [],
      joinRequests: [],
      vfsRoot: clonedVfs
    };

    if (sourceRoom.forkedFrom) {
      clonedRoom.forkedFrom = JSON.parse(JSON.stringify(sourceRoom.forkedFrom));
    }

    this.rooms.unshift(clonedRoom);
    this.saveRooms();
    this.renderRoomsList();
    this.renderProjectsView();

    if (window.showToast) {
      window.showToast(`プロジェクト「${newRoomName}」として複製しました！`, 'success');
    }
  }

  // Render Modern Unified Projects View
  renderProjectsView() {
    const grid = document.getElementById('my-projects-cards-grid');
    if (!grid) return;

    const myId = (window.supabaseAuth?.currentUser?.userId || 'wiz_creator').toLowerCase();
    const filter = this.activeProjectsFilter || 'all';
    const query = (this.searchQuery || '').toLowerCase();

    // Filter projects
    let displayList = this.rooms.filter(room => {
      if (query) {
        const nameMatch = (room.name || '').toLowerCase().includes(query);
        const rulesMatch = (room.rules || '').toLowerCase().includes(query);
        if (!nameMatch && !rulesMatch) return false;
      }
      return true;
    });

    if (filter === 'my') {
      displayList = displayList.filter(room => {
        const otherMembers = (room.team || []).filter(m => (m.userId || '').toLowerCase() !== myId);
        return otherMembers.length === 0;
      });
    } else if (filter === 'shared') {
      displayList = displayList.filter(room => {
        const isOwner = (room.ownerId || 'wiz_creator').toLowerCase() === myId;
        const otherMembers = (room.team || []).filter(m => (m.userId || '').toLowerCase() !== myId);
        return otherMembers.length > 0 || !isOwner;
      });
    }

    if (displayList.length === 0) {
      const msg = filter === 'shared' ? '共同開発中のプロジェクトはありません。' : 'プロジェクトが見つかりませんでした。';
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1.5rem; border: 2px dashed var(--border-subtle); border-radius: 16px; background: var(--bg-card); color: var(--text-muted);">
          <div style="font-size: 2.8rem; margin-bottom: 0.8rem; opacity: 0.5;"><i class="fa-solid fa-folder-open"></i></div>
          <h3 style="color: var(--text-primary); margin-bottom: 0.4rem; font-size: 1.15rem; font-weight: 700;">${msg}</h3>
          <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.2rem;">新しいゲームプロジェクトを作って開発を始めましょう！</p>
          <button class="btn btn-primary" onclick="window.projectManager.promptCreateNewRoom()">
            <i class="fa-solid fa-plus"></i> 新規プロジェクト作成
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = displayList.map(room => {
      const isOwner = (room.ownerId || 'wiz_creator').toLowerCase() === myId;
      const otherMembers = (room.team || []).filter(m => (m.userId || '').toLowerCase() !== myId);
      const isShared = otherMembers.length > 0 || !isOwner;
      return this.buildPdfProjectCardHtml(room, isShared);
    }).join('');
  }

  buildPdfProjectCardHtml(room, isShared) {
    const formattedDate = new Date(room.createdAt || Date.now()).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const isActive = room.id === this.activeRoomId;
    const desc = room.rules ? room.rules.replace(/\n/g, ' ') : 'Wiz AI Game Creator プロジェクト';
    const truncatedDesc = desc.length > 90 ? desc.substring(0, 90) + '...' : desc;

    // Team avatars
    let teamHtml = '';
    if (isShared && room.team && room.team.length > 0) {
      const avatars = room.team.map(m => {
        const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${m.userId}`;
        return `
          <img src="${avatarUrl}" title="${this.escapeHtml(m.username)} (@${m.userId})"
               style="width:24px; height:24px; border-radius:50%; border:2px solid var(--bg-card); object-fit:cover; margin-left:-6px;" />
        `;
      }).join('');

      teamHtml = `
        <div style="display:flex; align-items:center; margin-left:8px;" title="共同開発メンバー">
          ${avatars}
        </div>
      `;
    }

    // Fork lineage badge
    let forkBadgeHtml = '';
    if (room.forkedFrom) {
      const author = room.forkedFrom.originalAuthor || '不明';
      const title = room.forkedFrom.originalTitle || '作品';
      forkBadgeHtml = `
        <div class="project-fork-badge" title="フォーク元: ${this.escapeHtml(author)}作『${this.escapeHtml(title)}』">
          <i class="fa-solid fa-code-fork"></i> ${this.escapeHtml(author)}作『${this.escapeHtml(title)}』のフォーク
        </div>
      `;
    }

    return `
      <div class="project-card-modern ${isActive ? 'active' : ''}" data-room-id="${room.id}">
        <div>
          <div class="project-card-modern-header">
            <div class="project-card-modern-title-wrap">
              <div class="project-card-icon-box">
                <i class="fa-solid fa-gamepad"></i>
              </div>
              <div>
                <div class="project-card-modern-title">${this.escapeHtml(room.name)}</div>
                <div class="project-card-meta-date">作成: ${formattedDate} ${isActive ? '• <span style="color:var(--wiz-accent); font-weight:700;">アクティブ</span>' : ''}</div>
              </div>
            </div>
            <div style="display:flex; gap:0.25rem;">
              <button class="btn btn-ghost btn-sm" title="複製 (クローン)" onclick="window.projectManager.cloneRoom('${room.id}')">
                <i class="fa-solid fa-copy"></i>
              </button>
              <button class="btn btn-ghost btn-sm" title="削除" onclick="window.projectManager.deleteRoom('${room.id}', event)" style="color:var(--danger);">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          ${forkBadgeHtml}

          <div class="project-card-modern-desc">
            ${this.escapeHtml(truncatedDesc)}
          </div>
        </div>

        <div class="project-card-modern-footer">
          <div style="display:flex; align-items:center;">
            ${teamHtml}
          </div>
          <div class="project-card-actions-group">
            <button class="btn btn-ghost btn-sm" onclick="window.app?.openPublishModal('${room.id}')" title="マーケットに公開" style="color:var(--wiz-accent); border:1px solid rgba(0, 243, 255, 0.3);">
              <i class="fa-solid fa-cloud-arrow-up"></i> 公開
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.projectManager.openInFullscreen('${room.id}')" title="全画面でプレイ">
              <i class="fa-solid fa-play"></i> プレイ
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.projectManager.openInStudio('${room.id}')">
              <i class="fa-solid fa-code"></i> スタジオで開く
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Run mini game preview inside the card's `<実行ビュー>` box
  runCardPreview(roomId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    const placeholder = document.getElementById(`placeholder-${roomId}`);
    const iframe = document.getElementById(`iframe-${roomId}`);
    if (!iframe) return;

    // Retrieve VFS bundle for this room
    let vfsData = room.vfsRoot;
    if (!vfsData) {
      const raw = localStorage.getItem(`wiz_vfs_room_${roomId}`);
      if (raw) {
        try { vfsData = JSON.parse(raw); } catch (e) {}
      }
    }
    if (!vfsData && room.id === this.activeRoomId && window.vfs) {
      vfsData = window.vfs.root;
    }

    if (!vfsData) {
      if (window.showToast) window.showToast('プロジェクトのコードを読み込めませんでした。', 'warning');
      return;
    }

    // Build HTML bundle using vfs helper if available or standalone bundle
    let htmlContent = '';
    const findFile = (node, pathParts) => {
      if (!node) return null;
      if (pathParts.length === 1) {
        return node.children ? node.children[pathParts[0]] : null;
      }
      const dir = node.children ? node.children[pathParts[0]] : null;
      if (dir && dir.type === 'directory') {
        return findFile(dir, pathParts.slice(1));
      }
      return null;
    };

    const indexHtmlNode = findFile(vfsData, ['index.html']);
    if (indexHtmlNode && indexHtmlNode.content) {
      let fullHtml = indexHtmlNode.content;

      // Inline styles.css
      const cssNode = findFile(vfsData, ['css', 'style.css']) || findFile(vfsData, ['style.css']);
      if (cssNode && cssNode.content) {
        fullHtml = fullHtml.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/i, `<style>${cssNode.content}</style>`);
      }

      // Inline game.js
      const jsNode = findFile(vfsData, ['js', 'game.js']) || findFile(vfsData, ['game.js']);
      if (jsNode && jsNode.content) {
        fullHtml = fullHtml.replace(/<script[^>]+src=["'][^"']*game\.js["'][^>]*><\/script>/i, `<script>${jsNode.content}<\/script>`);
      }

      htmlContent = fullHtml;
    } else {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; background:#111; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
          <div style="text-align:center;">
            <h3>${this.escapeHtml(room.name)}</h3>
            <p style="color:#aaa;">ゲームプログラムを読み込んでいます...</p>
          </div>
        </body>
        </html>
      `;
    }

    if (placeholder) placeholder.style.display = 'none';
    iframe.style.display = 'block';
    iframe.srcdoc = htmlContent;

    if (window.showToast) {
      window.showToast(`「${room.name}」の実行プレビューを開始しました`, 'info');
    }
  }

  // Switch to room and open Studio View
  openInStudio(roomId) {
    this.switchRoom(roomId);
    if (window.app && typeof window.app.switchPageView === 'function') {
      window.app.switchPageView('studio');
    }
  }

  // Open game in fullscreen player modal
  openInFullscreen(roomId) {
    this.switchRoom(roomId);
    if (window.runner) {
      window.runner.openFullscreenModal();
    }
  }

  setCrossRoomMemory(enabled) {
    this.crossRoomMemoryEnabled = Boolean(enabled);
    localStorage.setItem(this.crossMemoryKey, this.crossRoomMemoryEnabled);
  }

  syncWithCloud() {
    this.saveRooms();
    this.renderRoomsList();
    this.renderProjectsView();
  }

  resetForUser(userId) {
    this.rooms = [];
    this.activeRoomId = null;
    this.saveRooms();
    this.renderRoomsList();
    this.renderProjectsView();
    this.updateActiveRoomHeader();
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
window.projectManager = new ProjectManager();

