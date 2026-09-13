/**
 * Wiz AI Game Creator - Modern In-App Dialog & Toast Notification System
 * Replaces native alert(), confirm(), prompt() completely with sleek dark-theme modals and toasts.
 */

class DialogManager {
  constructor() {
    this.toastContainer = document.getElementById('toast-container');
    this.modal = document.getElementById('custom-dialog-modal');
    this.titleEl = document.getElementById('custom-dialog-title');
    this.msgEl = document.getElementById('custom-dialog-message');
    this.inputWrap = document.getElementById('custom-dialog-input-wrap');
    this.inputEl = document.getElementById('custom-dialog-input');
    this.okBtn = document.getElementById('custom-dialog-ok-btn');
    this.cancelBtn = document.getElementById('custom-dialog-cancel-btn');
    this.closeBtn = document.getElementById('custom-dialog-close-btn');

    this.currentResolver = null;
    this.initEvents();
  }

  initEvents() {
    const handleCancel = () => {
      this.closeModal(false);
    };

    this.cancelBtn?.addEventListener('click', handleCancel);
    this.closeBtn?.addEventListener('click', handleCancel);

    this.okBtn?.addEventListener('click', () => {
      if (this.inputWrap.style.display !== 'none') {
        this.closeModal(this.inputEl.value);
      } else {
        this.closeModal(true);
      }
    });

    this.inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.closeModal(this.inputEl.value);
      } else if (e.key === 'Escape') {
        this.closeModal(null);
      }
    });
  }

  closeModal(result) {
    if (this.modal) this.modal.style.display = 'none';
    if (this.currentResolver) {
      this.currentResolver(result);
      this.currentResolver = null;
    }
  }

  // Toast notification (replaces alert for non-blocking notifications)
  toast(message, type = 'info', duration = 3000) {
    if (!this.toastContainer) return;

    const icons = {
      info: 'fa-solid fa-circle-info',
      success: 'fa-solid fa-circle-check',
      warning: 'fa-solid fa-triangle-exclamation',
      error: 'fa-solid fa-circle-xmark'
    };

    const item = document.createElement('div');
    item.className = `toast-item toast-${type}`;
    item.innerHTML = `
      <i class="${icons[type] || icons.info}"></i>
      <div class="toast-message">${message}</div>
      <button class="toast-close"><i class="fa-solid fa-xmark"></i></button>
    `;

    item.querySelector('.toast-close').onclick = () => {
      item.remove();
    };

    this.toastContainer.appendChild(item);

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      setTimeout(() => item.remove(), 250);
    }, duration);
  }

  // Sleek Confirm Modal (replaces confirm())
  confirm(message, title = '確認') {
    return new Promise((resolve) => {
      this.currentResolver = resolve;
      this.titleEl.innerHTML = `<i class="fa-solid fa-circle-question"></i> ${title}`;
      this.msgEl.textContent = message;
      this.inputWrap.style.display = 'none';
      this.cancelBtn.style.display = 'inline-flex';
      this.okBtn.textContent = 'OK';
      this.modal.style.display = 'flex';
      this.okBtn.focus();
    });
  }

  // Sleek Prompt Modal (replaces prompt())
  prompt(message, defaultValue = '', title = '入力') {
    return new Promise((resolve) => {
      this.currentResolver = resolve;
      this.titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> ${title}`;
      this.msgEl.textContent = message;
      this.inputWrap.style.display = 'block';
      this.inputEl.value = defaultValue;
      this.cancelBtn.style.display = 'inline-flex';
      this.okBtn.textContent = '確定';
      this.modal.style.display = 'flex';
      setTimeout(() => {
        this.inputEl.focus();
        this.inputEl.select();
      }, 100);
    });
  }
}

// Global instance
window.dialog = new DialogManager();

// Convenience shortcuts
window.showToast = (msg, type, duration) => window.dialog.toast(msg, type, duration);
window.showConfirm = (msg, title) => window.dialog.confirm(msg, title);
window.showPrompt = (msg, defaultVal, title) => window.dialog.prompt(msg, defaultVal, title);
