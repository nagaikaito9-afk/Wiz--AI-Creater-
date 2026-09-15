/**
 * Wiz AI Game Creator - Notification Center
 * Manages in-app notifications, categories, sound/toast triggers, and drawer UI.
 */

class NotificationCenter {
  constructor() {
    this.storageKey = 'wiz_notifications_list_v1';
    this.settingsKey = 'wiz_notification_settings_v1';

    this.settings = this.loadSettings();
    this.notifications = this.loadNotifications();

    this.drawerEl = null;
    this.listContainer = null;
    this.badgeEl = null;

    this.init();
  }

  init() {
    // Seed initial notifications if empty
    if (this.notifications.length === 0) {
      this.notifications = [
        {
          id: 'notif_seed_1',
          type: 'friend_request',
          title: 'フレンド申請',
          message: 'pixel_hero さんからフレンド申請が届きました',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          read: false,
          meta: { fromUserId: 'pixel_hero' }
        },
        {
          id: 'notif_seed_2',
          type: 'project_invite',
          title: 'プロジェクト招待',
          message: '「サイバー・ブロック崩し」共同開発への招待が届きました',
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          read: false,
          meta: { roomId: 'room_sample_cyber', invitedBy: 'pixel_hero' }
        }
      ];
      this.saveNotifications();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindDom());
    } else {
      this.bindDom();
    }
  }

  loadSettings() {
    try {
      const data = localStorage.getItem(this.settingsKey);
      return data ? JSON.parse(data) : {
        enabled: true,
        friendRequests: true,
        projectInvites: true,
        projectUpdates: true
      };
    } catch (e) {
      return {
        enabled: true,
        friendRequests: true,
        projectInvites: true,
        projectUpdates: true
      };
    }
  }

  saveSettings() {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save notification settings:', e);
    }
  }

  loadNotifications() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveNotifications() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications.slice(0, 100)));
    } catch (e) {
      console.warn('Failed to save notifications:', e);
    }
    this.updateBadge();
  }

  bindDom() {
    this.drawerEl = document.getElementById('notification-center-drawer');
    this.listContainer = document.getElementById('notification-items-list');
    this.badgeEl = document.getElementById('notification-badge');

    const openBtn = document.getElementById('notification-center-btn');
    if (openBtn) {
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDrawer();
      });
    }

    const closeBtn = document.getElementById('close-notif-drawer-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDrawer());
    }

    const markAllBtn = document.getElementById('mark-all-read-notif-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllRead());
    }

    const clearBtn = document.getElementById('clear-all-notif-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('すべての通知を消去しますか？')) {
          this.clearAll();
        }
      });
    }

    const fullNotifsBtn = document.getElementById('drawer-open-full-notifs-btn');
    if (fullNotifsBtn) {
      fullNotifsBtn.addEventListener('click', () => {
        this.closeDrawer();
        if (window.app && typeof window.app.switchPageView === 'function') {
          window.app.switchPageView('notifications');
        }
      });
    }

    const markAllFullBtn = document.getElementById('mark-all-read-full-btn');
    if (markAllFullBtn) {
      markAllFullBtn.addEventListener('click', () => {
        this.markAllRead();
        if (window.app && typeof window.app.renderNotificationCenterView === 'function') {
          window.app.renderNotificationCenterView();
        }
      });
    }

    const clearAllFullBtn = document.getElementById('clear-all-notifications-btn');
    if (clearAllFullBtn) {
      clearAllFullBtn.addEventListener('click', () => {
        if (confirm('すべての通知を消去しますか？')) {
          this.clearAll();
          if (window.app && typeof window.app.renderNotificationCenterView === 'function') {
            window.app.renderNotificationCenterView();
          }
        }
      });
    }

    // Close when clicking outside drawer
    document.addEventListener('click', (e) => {
      if (this.drawerEl && this.drawerEl.style.display === 'flex') {
        if (!this.drawerEl.contains(e.target) && !openBtn?.contains(e.target)) {
          this.closeDrawer();
        }
      }
    });

    this.updateBadge();
    this.render();
  }

  /**
   * Add a notification
   * @param {object} item - { type, title, message, meta }
   */
  notify(item) {
    if (!this.settings.enabled) return null;

    // Category filter check
    if (item.type === 'friend_request' && !this.settings.friendRequests) return null;
    if (item.type === 'project_invite' && !this.settings.projectInvites) return null;
    if (item.type === 'project_update' && !this.settings.projectUpdates) return null;

    const notif = {
      id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      type: item.type || 'info',
      title: item.title || '通知',
      message: item.message || '',
      meta: item.meta || {},
      read: false,
      timestamp: new Date().toISOString()
    };

    this.notifications.unshift(notif);
    this.saveNotifications();
    this.render();

    // Show floating toast
    if (window.showToast) {
      window.showToast(`🔔 ${notif.message}`, 'info');
    }

    return notif;
  }

  updateBadge() {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    const badgeText = unreadCount > 99 ? '99+' : `${unreadCount}`;
    const show = unreadCount > 0;

    if (!this.badgeEl) this.badgeEl = document.getElementById('notification-badge');
    if (this.badgeEl) {
      this.badgeEl.textContent = badgeText;
      this.badgeEl.style.display = show ? 'inline-flex' : 'none';
    }

    const navBadge = document.getElementById('nav-notifs-badge');
    if (navBadge) {
      navBadge.textContent = badgeText;
      navBadge.style.display = show ? 'inline-block' : 'none';
    }
  }

  formatTime(isoString) {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString || '';
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'たった今';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch (e) {
      return '';
    }
  }

  getTypeIcon(type) {
    switch (type) {
      case 'friend_request':
        return '<i class="fa-solid fa-user-plus" style="color:var(--wiz-cyan);"></i>';
      case 'project_invite':
        return '<i class="fa-solid fa-folder-tree" style="color:var(--wiz-accent);"></i>';
      case 'project_update':
        return '<i class="fa-solid fa-bolt" style="color:#ffb703;"></i>';
      default:
        return '<i class="fa-solid fa-bell" style="color:var(--wiz-purple);"></i>';
    }
  }

  render() {
    if (!this.listContainer) {
      this.listContainer = document.getElementById('notification-items-list');
      if (!this.listContainer) return;
    }

    if (this.notifications.length === 0) {
      this.listContainer.innerHTML = `
        <div class="notif-empty-state">
          <i class="fa-regular fa-bell-slash"></i>
          <p>新しい通知はありません</p>
        </div>
      `;
      if (window.app && window.app.currentView === 'notifications') {
        window.app.renderNotificationCenterView();
      }
      return;
    }

    this.listContainer.innerHTML = this.notifications.map(n => `
      <div class="notif-item ${n.read ? 'read' : 'unread'}" data-id="${n.id}">
        <div class="notif-icon-box">
          ${this.getTypeIcon(n.type)}
        </div>
        <div class="notif-body">
          <div class="notif-header-row">
            <span class="notif-title">${this.escapeHtml(n.title)}</span>
            <span class="notif-time">${this.formatTime(n.timestamp)}</span>
          </div>
          <div class="notif-msg">${this.escapeHtml(n.message)}</div>
          ${this.renderActions(n)}
        </div>
      </div>
    `).join('');

    this.bindItemEvents();

    if (window.app && window.app.currentView === 'notifications') {
      window.app.renderNotificationCenterView();
    }
  }

  renderActions(n) {
    if (n.type === 'friend_request') {
      return `
        <div class="notif-actions-row">
          <button class="btn-notif-action primary" onclick="window.notificationsCenter.handleAction('${n.id}', 'accept_friend')">
            <i class="fa-solid fa-check"></i> 承認
          </button>
          <button class="btn-notif-action ghost" onclick="window.notificationsCenter.handleAction('${n.id}', 'dismiss')">
            閉じる
          </button>
        </div>
      `;
    }
    if (n.type === 'project_invite') {
      return `
        <div class="notif-actions-row">
          <button class="btn-notif-action primary" onclick="window.notificationsCenter.handleAction('${n.id}', 'join_project')">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> 参加
          </button>
          <button class="btn-notif-action ghost" onclick="window.notificationsCenter.handleAction('${n.id}', 'dismiss')">
            閉じる
          </button>
        </div>
      `;
    }
    if (n.type === 'project_update') {
      return `
        <div class="notif-actions-row">
          <button class="btn-notif-action primary" onclick="window.notificationsCenter.handleAction('${n.id}', 'open_project')">
            <i class="fa-solid fa-folder-open"></i> 開く
          </button>
        </div>
      `;
    }
    return '';
  }

  bindItemEvents() {
    const items = this.listContainer?.querySelectorAll('.notif-item');
    items?.forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.btn-notif-action')) return;
        const id = el.getAttribute('data-id');
        this.markAsRead(id);
      });
    });
  }

  handleAction(notifId, action) {
    const notif = this.notifications.find(n => n.id === notifId);
    if (!notif) return;
    this.markAsRead(notifId);

    if (action === 'accept_friend') {
      if (window.friendsManager && notif.meta?.fromUserId) {
        window.friendsManager.acceptFriendRequest(notif.meta.fromUserId);
      }
    } else if (action === 'join_project') {
      if (window.projectManager && notif.meta?.roomId) {
        window.projectManager.switchRoom(notif.meta.roomId);
        if (window.showToast) window.showToast('共同プロジェクトに参加しました！', 'success');
      }
    } else if (action === 'open_project') {
      if (window.projectManager && notif.meta?.roomId) {
        window.projectManager.switchRoom(notif.meta.roomId);
      }
    }
    this.closeDrawer();
  }

  markAsRead(id) {
    const n = this.notifications.find(item => item.id === id);
    if (n) {
      n.read = true;
      this.saveNotifications();
      this.render();
    }
  }

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    this.render();
    if (window.showToast) window.showToast('すべての通知を既読にしました', 'info');
  }

  clearAll() {
    this.notifications = [];
    this.saveNotifications();
    this.render();
  }

  toggleDrawer() {
    if (!this.drawerEl) this.drawerEl = document.getElementById('notification-center-drawer');
    if (this.drawerEl) {
      const isVisible = this.drawerEl.style.display === 'flex';
      this.drawerEl.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) this.render();
    }
  }

  closeDrawer() {
    if (!this.drawerEl) this.drawerEl = document.getElementById('notification-center-drawer');
    if (this.drawerEl) {
      this.drawerEl.style.display = 'none';
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
window.notificationsCenter = new NotificationCenter();
window.notificationsManager = window.notificationsCenter; // Alias for backward compatibility
