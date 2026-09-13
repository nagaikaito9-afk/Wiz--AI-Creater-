/**
 * Wiz AI Game Creator - Main Application Controller (Ultra Edition)
 * Features:
 * - Theme Switcher (Dark, White, Gray) with persistence (No API settings in UI!)
 * - Text-to-Speech (Voice Reading) & One-click Copying
 * - Code block copy buttons & context menu bridge
 * - Sleek In-App Toasts & Modals (Zero native alert/confirm popups)
 */

class AppController {
  constructor() {
    this.attachments = []; // Max 5 items: { name, type, isImage, base64, text, file }
    this.maxAttachments = 5;
    this.isSidebarCollapsed = false;
    this.currentSpeakingUtterance = null;
    this.currentSpeakingBtn = null;
    this.currentTheme = localStorage.getItem('wiz_theme') || 'theme-dark';

    // DOM References
    this.messagesContainer = document.getElementById('messages-container');
    this.userInput = document.getElementById('chat-user-input');
    this.sendBtn = document.getElementById('send-message-btn');
    this.chatSection = document.getElementById('chat-section');
    this.editorSection = document.getElementById('editor-section');
    this.splitResizer = document.getElementById('split-resizer');
    
    // Mode Buttons
    this.modeChatBtn = document.getElementById('mode-chat-btn');
    this.modeCodeBtn = document.getElementById('mode-code-btn');
    this.wizModeLabel = document.getElementById('wiz-mode-label');

    // Attachments DOM
    this.fileUploadInput = document.getElementById('file-upload-input');
    this.folderUploadInput = document.getElementById('folder-upload-input');
    this.attachmentTray = document.getElementById('attachment-tray');
    this.attachmentCountEl = document.getElementById('attachment-count');
    this.attachmentItemsEl = document.getElementById('attachment-items');
    this.clearAttachmentsBtn = document.getElementById('clear-attachments-btn');

    // Action buttons
    this.runProjectBtn = document.getElementById('run-project-btn');
    this.exportZipBtn = document.getElementById('export-zip-btn');
    this.resetProjectBtn = document.getElementById('reset-project-header-btn');
    this.themeSettingsBtn = document.getElementById('theme-settings-btn');
    this.toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    this.collapseEditorBtn = document.getElementById('collapse-editor-btn');
    this.clearChatBtn = document.getElementById('clear-chat-btn');

    // Theme Modal DOM
    this.themeModal = document.getElementById('theme-settings-modal');
    this.closeThemeModalBtn = document.getElementById('close-theme-modal-btn');
    this.applyThemeBtn = document.getElementById('apply-theme-btn');
    this.themeCards = document.querySelectorAll('.theme-card');

    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme, false);
    this.initLayoutEvents();
    this.initChatEvents();
    this.initAttachmentEvents();
    this.initQuickChips();
    this.initProjectReset();
    this.initThemeSettings();
    this.sendGreeting();
  }

  // Theme Management (Dark, White, Gray)
  applyTheme(themeName, showToast = true) {
    this.currentTheme = themeName;
    document.body.classList.remove('theme-dark', 'theme-white', 'theme-gray');
    document.body.classList.add(themeName);
    localStorage.setItem('wiz_theme', themeName);

    // Update active state on cards
    this.themeCards.forEach(card => {
      if (card.getAttribute('data-theme') === themeName) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    if (showToast && window.showToast) {
      const names = {
        'theme-dark': 'ダーク',
        'theme-white': 'ホワイト',
        'theme-gray': 'グレー'
      };
      window.showToast(`テーマを「${names[themeName] || themeName}」に変更しました`, 'info');
    }
  }

  initThemeSettings() {
    let tempSelectedTheme = this.currentTheme;

    this.themeSettingsBtn?.addEventListener('click', () => {
      tempSelectedTheme = this.currentTheme;
      this.themeCards.forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-theme') === tempSelectedTheme);
      });
      if (this.themeModal) this.themeModal.style.display = 'flex';
    });

    this.closeThemeModalBtn?.addEventListener('click', () => {
      if (this.themeModal) this.themeModal.style.display = 'none';
    });

    this.themeCards.forEach(card => {
      card.addEventListener('click', () => {
        tempSelectedTheme = card.getAttribute('data-theme');
        this.themeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        // Live preview
        this.applyTheme(tempSelectedTheme, false);
      });
    });

    this.applyThemeBtn?.addEventListener('click', () => {
      this.applyTheme(tempSelectedTheme, true);
      if (this.themeModal) this.themeModal.style.display = 'none';
    });
  }

  // Initial welcome greeting from Wiz
  sendGreeting() {
    const greetingHtml = `
      <p>こんにちは！ 賢者の <strong>Wiz (ウィズ)</strong> だよ！🧙‍♂️✨</p>
      <p>ゲームの企画や雑談、アイデア出しはもちろん、<strong>「プログラム作成モード」</strong>に切り替えてくれれば、僕が右側のコードエディタに直接ゲームのコードを書き込んで一緒に開発できるよ！</p>
      <p>ファイルやフォルダは一度に<strong>最大5個</strong>まで送ってくれてOK！</p>
      <p>作ったプログラムは右側のファイル一覧やエディタから<strong>個別ダウンロード</strong>もできるし、コードを範囲選択して<strong>右クリック</strong>すればカット・コピー・ペーストや、僕に直接コードの<strong>質問</strong>もできるよ！</p>
      <p>「このプログラムを実行して！」と言ってくれたらプレビューを起動するし、「『スタート』ボタンを押したら何が出るか画像を送って」って言ってくれれば、実際にボタンを押したスクリーンショットも撮影してチャットに送るよ。何から作ってみる？</p>
    `;
    this.appendMessage('wiz', greetingHtml, true);
  }

  // Layout & Resizing
  initLayoutEvents() {
    const toggleSidebar = () => {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
      if (this.isSidebarCollapsed) {
        this.editorSection.classList.add('collapsed');
      } else {
        this.editorSection.classList.remove('collapsed');
      }
    };

    this.toggleSidebarBtn?.addEventListener('click', toggleSidebar);
    this.collapseEditorBtn?.addEventListener('click', toggleSidebar);

    // Keyboard shortcut Ctrl+B to toggle sidebar
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    });

    // Run shortcut (Ctrl+Enter)
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runCurrentProject();
      }
    });

    this.runProjectBtn?.addEventListener('click', () => this.runCurrentProject());
    this.exportZipBtn?.addEventListener('click', () => window.vfs.exportZip());

    // Split dragging
    let isDragging = false;
    this.splitResizer?.addEventListener('mousedown', (e) => {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      this.splitResizer.classList.add('dragging');
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const containerWidth = document.getElementById('workspace-container').offsetWidth;
      const newChatWidth = e.clientX;
      const minChat = 300;
      const minEditor = 320;

      if (newChatWidth >= minChat && containerWidth - newChatWidth >= minEditor) {
        const editorPercent = ((containerWidth - newChatWidth) / containerWidth) * 100;
        this.editorSection.style.width = `${editorPercent}%`;
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        this.splitResizer?.classList.remove('dragging');
      }
    });
  }

  expandSidebar() {
    if (this.isSidebarCollapsed) {
      this.isSidebarCollapsed = false;
      this.editorSection.classList.remove('collapsed');
    }
  }

  runCurrentProject() {
    const active = window.editor?.activeFile || 'index.html';
    if (active.endsWith('.html') || active.endsWith('.py')) {
      window.runner.run(active);
    } else {
      window.runner.run('index.html');
    }
  }

  // Chat & Messaging
  initChatEvents() {
    this.modeChatBtn?.addEventListener('click', () => this.switchMode('chat'));
    this.modeCodeBtn?.addEventListener('click', () => this.switchMode('code'));

    this.sendBtn?.addEventListener('click', () => this.handleSendMessage());

    this.userInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    this.userInput?.addEventListener('input', () => {
      this.userInput.style.height = 'auto';
      this.userInput.style.height = Math.min(this.userInput.scrollHeight, 140) + 'px';
    });

    this.clearChatBtn?.addEventListener('click', async () => {
      const ok = await window.showConfirm('チャット履歴をすべてクリアしますか？', 'チャット履歴の消去');
      if (ok) {
        this.stopSpeaking();
        this.messagesContainer.innerHTML = '';
        window.wizAI.clearHistory();
        this.sendGreeting();
        window.showToast('チャット履歴を消去しました', 'info');
      }
    });

    const dropZone = this.chatSection;
    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.style.border = '2px dashed var(--wiz-cyan)';
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.style.border = '';
      });
    });
    dropZone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) {
        this.processUploadedFiles(e.dataTransfer.files);
      }
    });
  }

  switchMode(mode) {
    if (mode === 'chat') {
      this.modeChatBtn.classList.add('active');
      this.modeCodeBtn.classList.remove('active');
      this.wizModeLabel.textContent = '通常会話モード (何でも気軽に聞いてね！)';
      window.wizAI.setMode('chat');
    } else {
      this.modeCodeBtn.classList.add('active');
      this.modeChatBtn.classList.remove('active');
      this.wizModeLabel.textContent = 'プログラム作成モード (コード作成・自動ファイル編集)';
      window.wizAI.setMode('code');
      this.expandSidebar();
    }
  }

  initQuickChips() {
    document.querySelectorAll('.prompt-chips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const text = chip.getAttribute('data-prompt');
        this.userInput.value = text;
        this.handleSendMessage();
      });
    });
  }

  initProjectReset() {
    this.resetProjectBtn?.addEventListener('click', async () => {
      const ok = await window.showConfirm('プロジェクトを初期テンプレートにリセットしますか？変更内容は失われます。', 'プロジェクト初期化');
      if (ok) {
        window.vfs.resetToDefault();
        window.editor.openFile('index.html');
        window.showToast('プロジェクトを初期状態にリセットしました！', 'success');
      }
    });
  }

  // Handle Send Message
  async handleSendMessage() {
    const text = this.userInput.value.trim();
    if (!text && this.attachments.length === 0) return;

    this.userInput.value = '';
    this.userInput.style.height = 'auto';

    this.appendUserMessage(text, [...this.attachments]);

    if (/プログラム作成モード/.test(text) || /コード.*書いて/.test(text) || /ゲーム.*作って/.test(text)) {
      this.switchMode('code');
    }

    const runMatch = text.match(/(?:このプログラム|([^\s]+(?:index\.html|\.py|html))|プロジェクト)を実行して/i);
    const isExplicitRunRequest = runMatch !== null || text.includes('実行して！') || text.includes('実行して');
    if (isExplicitRunRequest) {
      let target = 'index.html';
      const m = text.match(/([a-zA-Z0-9_\-\.\/]+(?:index\.html|\.py))/i);
      if (m) target = m[1];
      window.runner.run(target);
    }

    const sendingAttachments = [...this.attachments];
    this.clearAttachments();

    const loadingMsgEl = this.appendLoadingIndicator();

    try {
      if (window.wizAI.mode === 'code') {
        this.expandSidebar();
      }

      // Real Gemini API call (gemini-3.6-flash)
      const response = await window.wizAI.sendMessage(text, sendingAttachments);

      loadingMsgEl.remove();

      // Execute actions silently (Wiz speaks changes naturally)
      const actionResult = await window.agentActions.processResponse(response.text, this.messagesContainer);

      if (actionResult.cleanText) {
        this.appendMessage('wiz', actionResult.cleanText, false);
      }

    } catch (err) {
      loadingMsgEl.remove();
      console.error('Gemini API error:', err);
      this.appendMessage('wiz', `<p style="color:var(--danger)">⚠️ <strong>Gemini API通信エラー:</strong> ${err.message}</p>`, true);
    }
  }

  appendUserMessage(text, attachments) {
    const row = document.createElement('div');
    row.className = 'message-row user';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
    row.appendChild(avatar);

    const wrapper = document.createElement('div');
    wrapper.className = 'msg-bubble-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (text) {
      const p = document.createElement('p');
      p.textContent = text;
      bubble.appendChild(p);
    }

    if (attachments.length > 0) {
      const attWrap = document.createElement('div');
      attWrap.style.marginTop = '0.5rem';
      attWrap.style.display = 'flex';
      attWrap.style.flexWrap = 'wrap';
      attWrap.style.gap = '0.3rem';
      attachments.forEach(att => {
        const pill = document.createElement('span');
        pill.className = 'attachment-pill';
        pill.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${att.name}`;
        attWrap.appendChild(pill);
      });
      bubble.appendChild(attWrap);
    }

    wrapper.appendChild(bubble);

    const actionsBar = document.createElement('div');
    actionsBar.className = 'msg-actions-bar';
    actionsBar.style.justifyContent = 'flex-end';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>コピー</span>';
    copyBtn.onclick = () => this.copyToClipboard(text);
    actionsBar.appendChild(copyBtn);

    wrapper.appendChild(actionsBar);
    row.appendChild(wrapper);

    this.messagesContainer.appendChild(row);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  appendMessage(sender, content, isHtml = false) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.innerHTML = sender === 'wiz' ? '<i class="fa-solid fa-hat-wizard"></i>' : '<i class="fa-solid fa-user"></i>';
    row.appendChild(avatar);

    const wrapper = document.createElement('div');
    wrapper.className = 'msg-bubble-wrapper';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (isHtml) {
      bubble.innerHTML = content;
    } else {
      bubble.innerHTML = this.simpleMarkdown(content);
    }

    wrapper.appendChild(bubble);

    // Actions bar (Speech & Copy)
    const rawPlainText = bubble.innerText || bubble.textContent;
    const actionsBar = document.createElement('div');
    actionsBar.className = 'msg-actions-bar';

    const speechBtn = document.createElement('button');
    speechBtn.className = 'msg-action-btn';
    speechBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>読み上げ</span>';
    speechBtn.onclick = () => this.toggleSpeech(rawPlainText, speechBtn);
    actionsBar.appendChild(speechBtn);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>コピー</span>';
    copyBtn.onclick = () => this.copyToClipboard(rawPlainText);
    actionsBar.appendChild(copyBtn);

    wrapper.appendChild(actionsBar);
    row.appendChild(wrapper);

    this.messagesContainer.appendChild(row);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Attach Prism syntax highlighting & code copy buttons
    bubble.querySelectorAll('pre code').forEach(codeEl => {
      if (window.Prism) Prism.highlightElement(codeEl);

      const pre = codeEl.closest('pre');
      if (pre && !pre.parentElement.classList.contains('code-block-wrapper')) {
        const wrap = document.createElement('div');
        wrap.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);

        const codeCopyBtn = document.createElement('button');
        codeCopyBtn.className = 'code-copy-btn';
        codeCopyBtn.innerHTML = '<i class="fa-regular fa-copy"></i> コードコピー';
        codeCopyBtn.onclick = () => this.copyToClipboard(codeEl.textContent, 'コードをコピーしました！');
        wrap.appendChild(codeCopyBtn);
      }
    });
  }

  // Text-To-Speech (Web Speech API)
  toggleSpeech(text, btn) {
    if (!('speechSynthesis' in window)) {
      window.showToast('お使いのブラウザは音声読み上げに対応していません。', 'warning');
      return;
    }

    if (this.currentSpeakingBtn === btn && window.speechSynthesis.speaking) {
      this.stopSpeaking();
      return;
    }

    this.stopSpeaking();

    const cleanSpeech = text
      .replace(/```[\s\S]*?```/g, 'コードブロックが記述されています。')
      .replace(/`[^`]+`/g, 'コード')
      .replace(/[#*_\-\[\]\(\)]/g, ' ')
      .trim();

    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = 'ja-JP';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    btn.classList.add('speaking');
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> <span>停止</span>';
    this.currentSpeakingBtn = btn;
    this.currentSpeakingUtterance = utterance;

    utterance.onend = () => this.resetSpeechBtn(btn);
    utterance.onerror = () => this.resetSpeechBtn(btn);

    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (this.currentSpeakingBtn) {
      this.resetSpeechBtn(this.currentSpeakingBtn);
    }
    this.currentSpeakingUtterance = null;
    this.currentSpeakingBtn = null;
  }

  resetSpeechBtn(btn) {
    if (btn) {
      btn.classList.remove('speaking');
      btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>読み上げ</span>';
    }
  }

  async copyToClipboard(text, customToastMsg = 'クリップボードにコピーしました！') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      window.showToast(customToastMsg, 'success', 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      window.showToast('コピーに失敗しました', 'error');
    }
  }

  simpleMarkdown(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'javascript'}">${code.trim()}</code></pre>`;
    });

    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    const paragraphs = escaped.split(/\n\n+/);
    return paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  }

  appendLoadingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row wiz';
    row.innerHTML = `
      <div class="msg-avatar"><i class="fa-solid fa-hat-wizard"></i></div>
      <div class="msg-bubble" style="display:flex; align-items:center; gap:0.6rem; color:var(--wiz-cyan);">
        <i class="fa-solid fa-wand-magic-sparkles fa-spin"></i>
        <span>Wizが魔法を思考中...</span>
      </div>
    `;
    this.messagesContainer.appendChild(row);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    return row;
  }

  // Attachments Handling (Max 5 files)
  initAttachmentEvents() {
    this.fileUploadInput?.addEventListener('change', (e) => {
      this.processUploadedFiles(e.target.files);
      e.target.value = '';
    });

    this.folderUploadInput?.addEventListener('change', (e) => {
      this.processUploadedFiles(e.target.files);
      e.target.value = '';
    });

    this.clearAttachmentsBtn?.addEventListener('click', () => this.clearAttachments());
  }

  async processUploadedFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = this.maxAttachments - this.attachments.length;
    if (remainingSlots <= 0) {
      window.showToast(`一度に送信できる添付ファイルは最大${this.maxAttachments}個までです。`, 'warning');
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, remainingSlots);
    if (fileList.length > remainingSlots) {
      window.showToast(`一度に送れるのは最大${this.maxAttachments}個までのため、最初の${remainingSlots}個を追加しました。`, 'info');
    }

    for (const file of filesToProcess) {
      const isImage = file.type.startsWith('image/');
      let base64 = null;
      let text = null;

      if (isImage) {
        base64 = await this.readFileAsBase64(file);
      } else {
        text = await this.readFileAsText(file);
      }

      this.attachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        isImage: isImage,
        base64: base64,
        text: text
      });
    }

    this.renderAttachmentTray();
  }

  readFileAsBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        const b64 = result.split(',')[1] || result;
        resolve(b64);
      };
      reader.readAsDataURL(file);
    });
  }

  readFileAsText(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

  renderAttachmentTray() {
    if (this.attachments.length === 0) {
      this.attachmentTray.style.display = 'none';
      return;
    }
    this.attachmentTray.style.display = 'flex';
    this.attachmentCountEl.textContent = this.attachments.length;
    this.attachmentItemsEl.innerHTML = '';

    this.attachments.forEach((att, idx) => {
      const pill = document.createElement('span');
      pill.className = 'attachment-pill';
      pill.innerHTML = `
        <i class="${att.isImage ? 'fa-regular fa-image' : 'fa-solid fa-file-lines'}"></i>
        <span>${att.name}</span>
        <i class="fa-solid fa-xmark remove-att-btn" title="削除"></i>
      `;
      pill.querySelector('.remove-att-btn').onclick = () => {
        this.attachments.splice(idx, 1);
        this.renderAttachmentTray();
      };
      this.attachmentItemsEl.appendChild(pill);
    });
  }

  clearAttachments() {
    this.attachments = [];
    this.renderAttachmentTray();
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
