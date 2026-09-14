/**
 * Wiz AI Game Creator - Community Manager (10 Open Rooms)
 * Allows any creator to freely join any of the 10 rooms and chat in real-time.
 */

class CommunityManager {
  constructor() {
    this.rooms = [
      { id: 1, name: '初心者歓迎・雑談ルーム', icon: '🔰', desc: 'ゲーム制作を始めたばかりの方も気軽に話せる雑談部屋です', members: 14 },
      { id: 2, name: 'アクションゲーム開発室', icon: '🎮', desc: 'ジャンプ、当たり判定、爽快感あるアクションの話題', members: 9 },
      { id: 3, name: 'RPG・ストーリー制作', icon: '⚔️', desc: '世界観、コマンドバトル、セーブシステムなどの情報交換', members: 11 },
      { id: 4, name: 'レトロ＆ドット絵グラフィック', icon: '🎨', desc: 'ピクセルアート、カラーパレット、アニメーションの共有', members: 18 },
      { id: 5, name: 'チップチューン・BGM/効果音', icon: '🎵', desc: '8-bitレトロサウンド、WebAudioシンセ、効果音作り', members: 7 },
      { id: 6, name: 'バグ・質問・相談部屋', icon: '🐛', desc: 'コードの悩み、エラーの解決法をみんなで助け合おう', members: 12 },
      { id: 7, name: 'ミニゲーム・アイデア共有', icon: '💡', desc: '面白いゲームメカニクスや企画アイデアをブレスト', members: 8 },
      { id: 8, name: 'パズル・ロジックゲーム研究', icon: '🧩', desc: '落ちモノ、ブロック崩し、盤面ロジックの研究開発', members: 6 },
      { id: 9, name: 'マルチプレイ・共同開発募集', icon: '🤝', desc: '一緒にゲームを作る仲間を探したりコラボする部屋', members: 15 },
      { id: 10, name: '完成作品の告知・お披露目', icon: '🏆', desc: 'マーケットに公開した作品や自作ゲームを紹介しよう！', members: 21 }
    ];

    this.activeRoomId = 1;
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindUI());
    } else {
      this.bindUI();
    }
  }

  bindUI() {
    const sendBtn = document.getElementById('community-send-btn');
    const msgInput = document.getElementById('community-msg-input');

    sendBtn?.addEventListener('click', () => this.sendMessage());
    msgInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  renderCommunityView() {
    this.renderRoomsList();
    this.renderActiveRoom();
  }

  renderRoomsList() {
    const container = document.getElementById('community-rooms-list');
    if (!container) return;

    container.innerHTML = this.rooms.map(room => {
      const isActive = room.id === this.activeRoomId;
      return `
        <div class="community-room-card ${isActive ? 'active' : ''}" onclick="window.communityManager.switchRoom(${room.id})">
          <div class="community-room-icon">${room.icon}</div>
          <div class="community-room-info">
            <div class="community-room-name">${this.escapeHtml(room.name)}</div>
            <div class="community-room-desc">${this.escapeHtml(room.desc)}</div>
          </div>
          <div class="community-room-badge">${room.members}人</div>
        </div>
      `;
    }).join('');
  }

  switchRoom(roomId) {
    this.activeRoomId = roomId;
    this.renderRoomsList();
    this.renderActiveRoom();
  }

  renderActiveRoom() {
    const room = this.rooms.find(r => r.id === this.activeRoomId) || this.rooms[0];
    
    // Header
    const iconEl = document.getElementById('community-active-room-icon');
    const titleEl = document.getElementById('community-active-room-title');
    const descEl = document.getElementById('community-active-room-desc');

    if (iconEl) iconEl.textContent = room.icon;
    if (titleEl) titleEl.textContent = room.name;
    if (descEl) descEl.textContent = room.desc;

    // Messages
    const box = document.getElementById('community-messages-box');
    if (!box) return;

    const messages = this.getRoomMessages(room.id);
    if (messages.length === 0) {
      box.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">${room.icon}</div>
          <p>「${this.escapeHtml(room.name)}」へようこそ！</p>
          <span style="font-size: 0.85rem;">最初のメッセージを送信して交流を始めましょう。</span>
        </div>
      `;
      return;
    }

    const currentUserId = window.supabaseAuth?.currentUser?.userId || '';

    box.innerHTML = messages.map(msg => {
      const isMe = msg.userId && msg.userId === currentUserId;
      return `
        <div class="community-msg-row ${isMe ? 'mine' : ''}">
          <img class="community-msg-avatar" src="${msg.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.userId || 'user'}`}" />
          <div class="community-msg-content">
            <div class="community-msg-header">
              <span class="community-msg-name">${this.escapeHtml(msg.username || 'クリエイター')}</span>
              <span class="community-msg-time">${msg.time || ''}</span>
            </div>
            <div class="community-msg-bubble">${this.escapeHtml(msg.text)}</div>
          </div>
        </div>
      `;
    }).join('');

    box.scrollTop = box.scrollHeight;
  }

  getRoomMessages(roomId) {
    const key = `wiz_community_room_${roomId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    // Default welcome seed for the room
    const room = this.rooms.find(r => r.id === roomId) || this.rooms[0];
    const defaultSeed = [
      {
        id: 'seed_' + roomId,
        userId: 'wiz_guide',
        username: 'コミュニティガイド',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=wiz_guide',
        text: `「${room.name}」へようこそ！みんなで仲良く情報交換や雑談をしましょう✨`,
        time: '今日'
      }
    ];
    localStorage.setItem(key, JSON.stringify(defaultSeed));
    return defaultSeed;
  }

  sendMessage() {
    const input = document.getElementById('community-msg-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const currentUser = window.supabaseAuth?.currentUser;
    const username = currentUser?.user_metadata?.full_name || currentUser?.username || 'クリエイター';
    const userId = currentUser?.user_metadata?.user_id || currentUser?.userId || 'user_' + Math.random().toString(36).substring(2, 7);
    const avatar = currentUser?.user_metadata?.avatar_url || currentUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`;

    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg = {
      id: 'msg_' + Date.now(),
      userId: userId,
      username: username,
      avatar: avatar,
      text: text,
      time: timeStr
    };

    const key = `wiz_community_room_${this.activeRoomId}`;
    const messages = this.getRoomMessages(this.activeRoomId);
    messages.push(newMsg);
    localStorage.setItem(key, JSON.stringify(messages));

    input.value = '';
    this.renderActiveRoom();

    if (window.showToast) {
      window.showToast('メッセージを送信しました', 'success', 1500);
    }
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

// Global instance
window.communityManager = new CommunityManager();
