/**
 * Wiz AI Game Creator - Activity Logger
 * Records and displays Wiz operations such as room creation, file edits, etc.
 * Formats asterisks (*text*) into bold text (<strong>text</strong>).
 */

class ActivityLogger {
  constructor() {
    this.storageKey = 'wiz_activity_history_v1';
    this.logs = this.loadLogs();
    this.drawerEl = null;
    this.timelineContainer = null;
    this.init();
  }

  init() {
    // Ensure initial greeting log if empty
    if (this.logs.length === 0) {
      this.log('Wizが*AIゲームスタジオ*を起動しました', 'system');
    }

    // Bind DOM when loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.bindDom());
    } else {
      this.bindDom();
    }
  }

  bindDom() {
    this.drawerEl = document.getElementById('wiz-activity-drawer');
    this.timelineContainer = document.getElementById('wiz-activity-timeline');

    const openBtn = document.getElementById('open-activity-btn');
    if (openBtn) {
      openBtn.addEventListener('click', () => this.openDrawer());
    }

    const closeBtn = document.getElementById('close-activity-drawer-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDrawer());
    }

    const clearBtn = document.getElementById('clear-activity-logs-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Wizの操作履歴をすべて消去しますか？')) {
          this.clearLogs();
        }
      });
    }

    this.render();
  }

  loadLogs() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to load activity logs:', e);
      return [];
    }
  }

  saveLogs() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs.slice(0, 150)));
    } catch (e) {
      console.warn('Failed to save activity logs:', e);
    }
  }

  /**
   * Log an activity
   * @param {string} rawText - Text containing *bold targets* e.g. "Wizが*ブロック崩し*チャットを作成しました"
   * @param {string} category - 'room' | 'file' | 'code' | 'system' | 'sync'
   * @param {object} meta - Optional metadata (roomId, filename, etc.)
   */
  log(rawText, category = 'system', meta = {}) {
    const entry = {
      id: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      rawText: rawText,
      category: category,
      meta: meta,
      timestamp: new Date().toISOString()
    };

    this.logs.unshift(entry);
    this.saveLogs();
    this.render();

    // Trigger subtle UI badge bump if button exists
    const badge = document.getElementById('activity-badge');
    if (badge) {
      badge.textContent = this.logs.length;
      badge.style.display = 'inline-flex';
    }

    return entry;
  }

  /**
   * Format *text* into <strong>text</strong>
   */
  formatText(text) {
    if (!text) return '';
    // Escape HTML first to prevent XSS
    const escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    
    // Replace *target* with <strong>target</strong>
    return escaped.replace(/\*([^*]+)\*/g, '<strong class="activity-bold">$1</strong>');
  }

  formatTime(isoString) {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now - d) / 1000);
      if (diffSec < 60) return 'たった今';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分前`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}時間前`;
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return '';
    }
  }

  getCategoryIcon(cat) {
    switch (cat) {
      case 'room': return '<i class="fa-solid fa-folder-plus" style="color:var(--wiz-cyan);"></i>';
      case 'file': return '<i class="fa-solid fa-file-code" style="color:var(--wiz-accent);"></i>';
      case 'code': return '<i class="fa-solid fa-code" style="color:var(--wiz-green);"></i>';
      case 'sync': return '<i class="fa-solid fa-bolt" style="color:#ffb703;"></i>';
      default: return '<i class="fa-solid fa-wand-magic-sparkles" style="color:var(--wiz-purple);"></i>';
    }
  }

  render() {
    if (!this.timelineContainer) {
      this.timelineContainer = document.getElementById('wiz-activity-timeline');
      if (!this.timelineContainer) return;
    }

    if (this.logs.length === 0) {
      this.timelineContainer.innerHTML = `
        <div class="activity-empty-state">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <p>まだWizの操作履歴はありません。<br>チャットでゲーム作成を依頼すると履歴が記録されます。</p>
        </div>
      `;
      return;
    }

    this.timelineContainer.innerHTML = this.logs.map(item => `
      <div class="activity-item">
        <div class="activity-icon-badge">
          ${this.getCategoryIcon(item.category)}
        </div>
        <div class="activity-content">
          <div class="activity-text">${this.formatText(item.rawText)}</div>
          <span class="activity-time">${this.formatTime(item.timestamp)}</span>
        </div>
      </div>
    `).join('');
  }

  openDrawer() {
    if (!this.drawerEl) this.drawerEl = document.getElementById('wiz-activity-drawer');
    if (this.drawerEl) {
      this.drawerEl.style.display = 'flex';
      this.render();
    }
  }

  closeDrawer() {
    if (!this.drawerEl) this.drawerEl = document.getElementById('wiz-activity-drawer');
    if (this.drawerEl) {
      this.drawerEl.style.display = 'none';
    }
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
    this.render();
    if (window.showToast) window.showToast('Wiz操作履歴をクリアしました', 'info');
  }
}

// Global instance
window.activityLogger = new ActivityLogger();
