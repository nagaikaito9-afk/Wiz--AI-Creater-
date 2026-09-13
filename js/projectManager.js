/**
 * Wiz AI Game Creator - Project & Multi-Room Manager (ChatGPT-like Studio)
 * Features:
 * - Multi-project rooms management (Create, Switch, Rename, Delete)
 * - Per-room project rules (Custom instructions like "All pixel art, RPG game")
 * - Cross-room memory aggregator (When "これまでの会話を維持する" is enabled)
 * - Automatic syncing with LocalStorage and Supabase Cloud
 */

class ProjectManager {
  constructor() {
    this.storageKey = 'wiz_game_studio_rooms';
    this.activeRoomIdKey = 'wiz_active_room_id';
    this.crossMemoryKey = 'wiz_cross_room_memory';

    this.rooms = [];
    this.activeRoomId = null;
    this.crossRoomMemoryEnabled = localStorage.getItem(this.crossMemoryKey) === 'true';

    // DOM Elements
    this.roomsListContainer = null;
    this.activeProjectTitleEl = null;
    this.activeProjectRulesBtn = null;
    this.rulesModal = null;
    this.rulesTextarea = null;
    this.saveRulesBtn = null;
    this.closeRulesModalBtn = null;

    this.init();
  }

  init() {
    this.loadRooms();
    this.bindDomElements();
  }

  bindDomElements() {
    this.roomsListContainer = document.getElementById('project-rooms-list');
    this.activeProjectTitleEl = document.getElementById('active-project-name-display');
    this.activeProjectRulesBtn = document.getElementById('project-rules-btn');
    this.rulesModal = document.getElementById('project-rules-modal');
    this.rulesTextarea = document.getElementById('project-rules-textarea');
    this.saveRulesBtn = document.getElementById('save-project-rules-btn');
    this.closeRulesModalBtn = document.getElementById('close-rules-modal-btn');

    // "New Project" button
    document.getElementById('new-project-btn')?.addEventListener('click', () => {
      this.promptCreateNewRoom();
    });

    // Project Rules Modal
    this.activeProjectRulesBtn?.addEventListener('click', () => {
      this.openRulesModal();
    });

    this.closeRulesModalBtn?.addEventListener('click', () => {
      if (this.rulesModal) this.rulesModal.style.display = 'none';
    });

    this.saveRulesBtn?.addEventListener('click', () => {
      this.saveCurrentRules();
    });

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

    if (!this.rooms || this.rooms.length === 0) {
      // Create initial default room
      const initialRoom = {
        id: 'room_default',
        name: 'ネオン・ブロック崩し',
        rules: 'このゲームはすべてドット絵風ネオン調で制作する。\nレトロアーケードスタイル。',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        chatHistory: [],
        vfsRoot: null // will be populated from VFS
      };
      this.rooms = [initialRoom];
      this.activeRoomId = initialRoom.id;
      this.saveRooms();
    } else {
      const lastActive = localStorage.getItem(this.activeRoomIdKey);
      if (lastActive && this.rooms.some(r => r.id === lastActive)) {
        this.activeRoomId = lastActive;
      } else {
        this.activeRoomId = this.rooms[0].id;
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

  // Create New Project Room
  async promptCreateNewRoom() {
    const name = await window.showPrompt('新しいゲームプロジェクトの名前を入力してください:', '新しいゲーム', '新規プロジェクト作成');
    if (!name) return;

    // Snapshot current active room before switching
    this.snapshotCurrentRoom();

    const newId = 'room_' + Date.now();
    const newRoom = {
      id: newId,
      name: name.trim(),
      rules: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chatHistory: [],
      vfsRoot: null // Will initialize default fresh template
    };

    this.rooms.unshift(newRoom);
    this.activeRoomId = newId;
    this.saveRooms();

    // Reset VFS to fresh template for the new room
    if (window.vfs) {
      window.vfs.resetToDefault();
      newRoom.vfsRoot = JSON.parse(JSON.stringify(window.vfs.root));
    }

    // Reset Chat messages
    if (window.app) {
      window.app.clearChatMessages(false);
      window.app.sendGreeting();
    }

    this.renderRoomsList();
    this.updateActiveRoomHeader();

    if (window.showToast) {
      window.showToast(`プロジェクト「${name}」を作成しました！`, 'success');
    }

    // Cloud sync
    if (window.supabaseAuth) {
      window.supabaseAuth.saveRoomToCloud(newRoom);
    }
  }

  // Switch Room
  switchRoom(roomId) {
    if (roomId === this.activeRoomId) return;

    // Snapshot current state
    this.snapshotCurrentRoom();

    const target = this.rooms.find(r => r.id === roomId);
    if (!target) return;

    this.activeRoomId = roomId;
    this.saveRooms();

    // Restore VFS
    if (target.vfsRoot && window.vfs) {
      window.vfs.root = JSON.parse(JSON.stringify(target.vfsRoot));
      window.vfs.save();
      window.vfs.notify();
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

  // Snapshot current active room data
  snapshotCurrentRoom() {
    const curr = this.getActiveRoom();
    if (!curr) return;

    if (window.vfs) {
      curr.vfsRoot = JSON.parse(JSON.stringify(window.vfs.root));
    }
    if (window.app) {
      curr.chatHistory = window.app.exportChatHistory();
    }
    curr.updatedAt = Date.now();
    this.saveRooms();

    // Cloud sync
    if (window.supabaseAuth) {
      window.supabaseAuth.saveRoomToCloud(curr);
    }
  }

  // Rename Room
  async promptRenameRoom(roomId, e) {
    if (e) e.stopPropagation();
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    const newName = await window.showPrompt('新しいプロジェクト名を入力してください:', room.name, 'プロジェクト名変更');
    if (newName && newName.trim() && newName.trim() !== room.name) {
      room.name = newName.trim();
      room.updatedAt = Date.now();
      this.saveRooms();
      this.renderRoomsList();
      this.updateActiveRoomHeader();
      if (window.showToast) window.showToast('プロジェクト名を変更しました', 'success');

      if (window.supabaseAuth) {
        window.supabaseAuth.saveRoomToCloud(room);
      }
    }
  }

  // Delete Room
  async promptDeleteRoom(roomId, e) {
    if (e) e.stopPropagation();
    if (this.rooms.length <= 1) {
      if (window.showToast) window.showToast('最後のプロジェクトは削除できません。', 'warning');
      return;
    }

    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;

    const ok = await window.showConfirm(`プロジェクト「${room.name}」を削除しますか？\n（コードやチャット履歴は失われます）`, 'プロジェクト削除');
    if (ok) {
      this.rooms = this.rooms.filter(r => r.id !== roomId);
      if (this.activeRoomId === roomId) {
        this.activeRoomId = this.rooms[0].id;
        // switch to remaining room
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

    if (window.supabaseAuth) {
      window.supabaseAuth.saveRoomToCloud(room);
    }
  }

  updateActiveRoomHeader() {
    const room = this.getActiveRoom();
    if (!room) return;

    if (this.activeProjectTitleEl) {
      this.activeProjectTitleEl.textContent = room.name;
    }

    // Rules button state
    const rulesBtn = document.getElementById('project-rules-btn');
    if (rulesBtn) {
      const hasRules = Boolean(room.rules && room.rules.trim());
      rulesBtn.classList.toggle('has-rules', hasRules);
      rulesBtn.title = hasRules ? `プロジェクトルール設定中:\n${room.rules.substring(0, 80)}...` : 'プロジェクトルールを設定 (AIに制作方針を指示)';
    }
  }

  renderRoomsList() {
    if (!this.roomsListContainer) {
      this.roomsListContainer = document.getElementById('project-rooms-list');
      if (!this.roomsListContainer) return;
    }

    this.roomsListContainer.innerHTML = '';

    this.rooms.forEach(room => {
      const item = document.createElement('div');
      item.className = `room-item ${room.id === this.activeRoomId ? 'active' : ''}`;

      const hasRules = Boolean(room.rules && room.rules.trim());

      item.innerHTML = `
        <div class="room-icon"><i class="fa-solid fa-gamepad"></i></div>
        <div class="room-details">
          <span class="room-title">${room.name}</span>
          ${hasRules ? `<span class="room-rule-tag" title="${room.rules}"><i class="fa-solid fa-scroll"></i> ルールあり</span>` : ''}
        </div>
        <div class="room-actions">
          <button class="btn-room-action rename" title="名前変更"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-room-action delete" title="削除"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      `;

      item.onclick = () => this.switchRoom(room.id);
      item.querySelector('.rename').onclick = (e) => this.promptRenameRoom(room.id, e);
      item.querySelector('.delete').onclick = (e) => this.promptDeleteRoom(room.id, e);

      this.roomsListContainer.appendChild(item);
    });
  }

  // Cross-Room Memory (これまでの会話を維持する)
  setCrossRoomMemory(enabled) {
    this.crossRoomMemoryEnabled = enabled;
    localStorage.setItem(this.crossMemoryKey, enabled ? 'true' : 'false');
  }

  // Collect summaries/topics from other rooms for AI prompt injection
  getCrossRoomMemoryPrompt() {
    if (!this.crossRoomMemoryEnabled) return '';

    const otherRooms = this.rooms.filter(r => r.id !== this.activeRoomId);
    if (otherRooms.length === 0) return '';

    let memoryText = '【他の部屋・過去プロジェクトでユーザーと話した内容の記憶】\n';
    otherRooms.forEach(room => {
      memoryText += `- プロジェクト「${room.name}」`;
      if (room.rules) {
        memoryText += ` (ルール: ${room.rules.replace(/\n/g, ' / ')})`;
      }
      if (room.chatHistory && room.chatHistory.length > 0) {
        // Pick last user messages as context
        const recentUserMsgs = room.chatHistory
          .filter(m => m.sender === 'user' && m.text)
          .slice(-3)
          .map(m => m.text.substring(0, 60))
          .join('、');
        if (recentUserMsgs) {
          memoryText += ` [最近の会話話題: ${recentUserMsgs}]`;
        }
      }
      memoryText += '\n';
    });

    memoryText += 'ユーザーが過去の会話や他のプロジェクトのことに言及した場合は、上記の内容を記憶として自然に参照してください。\n';
    return memoryText;
  }

  // Sync with Cloud when logged in
  async syncWithCloud() {
    if (!window.supabaseAuth || !window.supabaseAuth.currentUser) return;

    const cloudRooms = await window.supabaseAuth.loadRoomsFromCloud();
    if (cloudRooms && cloudRooms.length > 0) {
      // Merge cloud rooms with local rooms
      cloudRooms.forEach(cr => {
        const existingIdx = this.rooms.findIndex(r => r.id === cr.id);
        if (existingIdx >= 0) {
          if ((cr.updatedAt || 0) > (this.rooms[existingIdx].updatedAt || 0)) {
            this.rooms[existingIdx] = cr;
          }
        } else {
          this.rooms.push(cr);
        }
      });
      this.saveRooms();
      this.renderRoomsList();
      this.updateActiveRoomHeader();
      if (window.showToast) {
        window.showToast('クラウドからプロジェクトを同期しました！', 'success');
      }
    } else {
      // Upload current local rooms to cloud
      for (const r of this.rooms) {
        await window.supabaseAuth.saveRoomToCloud(r);
      }
    }
  }
}

window.projectManager = new ProjectManager();
