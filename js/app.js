/**
 * Wiz AI Game Creator - Main Application Controller (Master Edition)
 * Features:
 * - Auto-Debug Mode (automatically detects errors and triggers AI self-repair)
 * - Gentle Wiz error explanations for rate limits & network issues (no scary red error text)
 * - Wiz Modification Undo (snapshots & restore)
 * - View switching bridge (Code, Preview, Logs)
 * - Settings for preview target (Right Panel vs Fullscreen Modal)
 * - Speech Synthesis, Copying, and Custom In-App Dialogs
 */

class AppController {
  constructor() {
    this.attachments = []; // Max 5 items
    this.maxAttachments = 5;
    this.isSidebarCollapsed = false;
    this.currentSpeakingUtterance = null;
    this.currentSpeakingBtn = null;
    
    // Persistent Settings (Saved in LocalStorage)
    this.currentTheme = localStorage.getItem('wiz_theme') || 'theme-dark';
    this.autoDebugMode = localStorage.getItem('wiz_auto_debug') === 'true'; // default OFF
    this.previewDisplayMode = localStorage.getItem('wiz_preview_mode') || 'panel'; // default 'panel'
    this.isAutoDebugging = false;

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
    this.autoDebugBadge = document.getElementById('auto-debug-badge');

    // Attachments DOM
    this.fileUploadInput = document.getElementById('file-upload-input');
    this.folderUploadInput = document.getElementById('folder-upload-input');
    this.attachmentTray = document.getElementById('attachment-tray');
    this.attachmentCountEl = document.getElementById('attachment-count');
    this.attachmentItemsEl = document.getElementById('attachment-items');
    this.clearAttachmentsBtn = document.getElementById('clear-attachments-btn');

    // Action buttons
    this.runProjectBtn = document.getElementById('run-project-btn');
    this.wizUndoHeaderBtn = document.getElementById('wiz-undo-btn');
    this.exportZipBtn = document.getElementById('export-zip-btn');
    this.resetProjectBtn = document.getElementById('reset-project-header-btn');
    this.themeSettingsBtn = document.getElementById('theme-settings-btn');
    this.toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    this.collapseEditorBtn = document.getElementById('collapse-editor-btn');
    this.clearChatBtn = document.getElementById('clear-chat-btn');

    // Settings Modal DOM
    this.themeModal = document.getElementById('theme-settings-modal');
    this.closeThemeModalBtn = document.getElementById('close-theme-modal-btn');
    this.applyThemeBtn = document.getElementById('apply-theme-btn');
    this.themeCards = document.querySelectorAll('.theme-card');
    this.autoDebugCheckbox = document.getElementById('setting-auto-debug-checkbox');
    this.previewRadios = document.getElementsByName('preview-target-view');
    this.crossRoomMemoryCheckbox = document.getElementById('setting-cross-room-memory-checkbox');

    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme, false);
    this.updateAutoDebugBadge();
    this.initLayoutEvents();
    this.initChatEvents();
    this.initAttachmentEvents();
    this.initQuickChips();
    this.initProjectReset();
    this.initSettingsModal();
    this.sendGreeting();
  }

  // Switch right panel view (code, preview, logs)
  switchRightView(mode) {
    if (window.editor) {
      window.editor.switchView(mode);
    }
  }

  // Theme Management
  applyTheme(themeName, showToast = true) {
    this.currentTheme = themeName;
    document.body.classList.remove('theme-dark', 'theme-white', 'theme-gray');
    document.body.classList.add(themeName);
    localStorage.setItem('wiz_theme', themeName);

    this.themeCards.forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-theme') === themeName);
    });

    if (showToast && window.showToast) {
      const names = { 'theme-dark': 'ダーク', 'theme-white': 'ホワイト', 'theme-gray': 'グレー' };
      window.showToast(`テーマを「${names[themeName] || themeName}」に変更しました`, 'info');
    }
  }

  updateAutoDebugBadge() {
    if (this.autoDebugBadge) {
      this.autoDebugBadge.style.display = this.autoDebugMode ? 'inline-flex' : 'none';
    }
  }

  initSettingsModal() {
    let tempSelectedTheme = this.currentTheme;

    this.themeSettingsBtn?.addEventListener('click', () => {
      tempSelectedTheme = this.currentTheme;
      this.themeCards.forEach(card => {
        card.classList.toggle('active', card.getAttribute('data-theme') === tempSelectedTheme);
      });
      if (this.autoDebugCheckbox) {
        this.autoDebugCheckbox.checked = this.autoDebugMode;
      }
      if (this.crossRoomMemoryCheckbox) {
        this.crossRoomMemoryCheckbox.checked = window.projectManager?.crossRoomMemoryEnabled || false;
      }
      this.previewRadios.forEach(r => {
        r.checked = (r.value === this.previewDisplayMode);
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
        this.applyTheme(tempSelectedTheme, false);
      });
    });

    this.applyThemeBtn?.addEventListener('click', () => {
      this.applyTheme(tempSelectedTheme, false);

      // Auto Debug setting
      if (this.autoDebugCheckbox) {
        this.autoDebugMode = this.autoDebugCheckbox.checked;
        localStorage.setItem('wiz_auto_debug', this.autoDebugMode);
        this.updateAutoDebugBadge();
      }

      // Cross-Room Memory setting (これまでの会話を維持する)
      if (this.crossRoomMemoryCheckbox && window.projectManager) {
        window.projectManager.setCrossRoomMemory(this.crossRoomMemoryCheckbox.checked);
      }

      // Preview Mode setting
      this.previewRadios.forEach(r => {
        if (r.checked) {
          this.previewDisplayMode = r.value;
          localStorage.setItem('wiz_preview_mode', this.previewDisplayMode);
        }
      });

      if (this.themeModal) this.themeModal.style.display = 'none';
      window.showToast('設定を保存しました！', 'success');
    });
  }

  // Greeting
  sendGreeting() {
    const greetingHtml = `
      <p>こんにちは！ 賢者の <strong>Wiz (ウィズ)</strong> だよ！🧙‍♂️✨</p>
      <p>ゲームの企画や雑談はもちろん、<strong>「プログラム作成モード」</strong>に切り替えてくれれば、僕が右側のコードエディタに直接ゲームのコードを書き込んで一緒に開発できるよ！</p>
      <p>右側の画面は上部のタブで <strong>「コード」 「実行画面」 「ログ」</strong> をワンクリックで切り替え可能！「実行して！」と言ってくれれば設定に合わせて右側ですぐに遊べるよ。</p>
      <p>もし僕の変更を巻き戻したくなったら、上の <strong>「Wiz変更Undo」</strong> ボタンでいつでも直前の状態に戻せるから安心してね。何から作ってみる？</p>
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

    // Project Rooms Sidebar toggle
    const projectSidebar = document.getElementById('project-sidebar');
    document.getElementById('collapse-rooms-btn')?.addEventListener('click', () => {
      projectSidebar?.classList.add('collapsed');
    });
    document.getElementById('open-rooms-btn')?.addEventListener('click', () => {
      projectSidebar?.classList.remove('collapsed');
    });

    this.toggleSidebarBtn?.addEventListener('click', toggleSidebar);
    this.collapseEditorBtn?.addEventListener('click', toggleSidebar);

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.runCurrentProject();
      }
    });

    this.runProjectBtn?.addEventListener('click', () => this.runCurrentProject());
    this.wizUndoHeaderBtn?.addEventListener('click', () => window.vfs.undo());
    this.exportZipBtn?.addEventListener('click', () => window.vfs.exportZip());

    // Split dragging
    let isDragging = false;
    this.splitResizer?.addEventListener('mousedown', () => {
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
    const target = (active.endsWith('.html') || active.endsWith('.py')) ? active : 'index.html';
    window.runner.run(target);
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

  // Handle Auto-Debug Trigger when error detected in runner
  async triggerAutoDebug(targetFile, errorMessage) {
    if (this.isAutoDebugging) return;
    this.isAutoDebugging = true;

    // Show notice from Wiz in chat
    const debugNotice = `
      <p>🔍 <strong>エラーを見つけたよ！</strong> <code>${targetFile}</code> で実行時エラーを検知したから、Wizが自動でコードを確認して修正するね！</p>
      <p style="font-size:0.8rem; color:var(--text-muted);">エラー内容: <code>${errorMessage}</code></p>
    `;
    this.appendMessage('wiz', debugNotice, true);

    // Switch to code mode
    this.switchMode('code');
    this.expandSidebar();

    const fixPrompt = `【自動デバッグ要請】${targetFile} の実行中に次のエラーが発生しました：\n\`\`\`\n${errorMessage}\n\`\`\`\nエラーの原因を特定し、ファイルを修正して再度正常に動くように <wiz_action> で上書き保存してください。`;

    const loadingMsgEl = this.appendLoadingIndicator();

    try {
      const response = await window.wizAI.sendMessage(fixPrompt, []);
      loadingMsgEl.remove();
      const actionResult = await window.agentActions.processResponse(response.text, this.messagesContainer);
      if (actionResult.cleanText) {
        this.appendMessage('wiz', actionResult.cleanText, false);
      }
      // Re-run after auto debug
      setTimeout(() => {
        window.runner.run(targetFile);
        window.showToast('修正コードを再実行しました！', 'success');
      }, 1000);
    } catch (err) {
      loadingMsgEl.remove();
      this.handleGentleError(err);
    } finally {
      this.isAutoDebugging = false;
    }
  }

  // Gentle Wiz Error Handling (No scary red error text!)
  handleGentleError(err) {
    console.warn('Handling API communication error gently:', err);
    const errStr = String(err.message || err);

    let gentleMessage = '';
    if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
      gentleMessage = `
        <p>🧙‍♂️☕ <strong>ふぅ、ちょっと魔法を使いすぎちゃったみたい！</strong></p>
        <p>無料枠のリクエスト制限（1分間あたりの利用上限）に達したみたいだよ。少しだけ魔力を回復させるから、<strong>1分ほど待ってから</strong>もう一度話しかけてね！</p>
      `;
    } else if (errStr.includes('Failed to fetch') || errStr.includes('Network') || errStr.includes('offline')) {
      gentleMessage = `
        <p>🧙‍♂️📡 <strong>ごめんね、通信がちょっと途切れちゃったみたい！</strong></p>
        <p>インターネット接続が安定しているか確認して、もう一度話しかけてみてね！</p>
      `;
    } else if (errStr.includes('credentials') || errStr.includes('403') || errStr.includes('401')) {
      gentleMessage = `
        <p>🧙‍♂️🔑 <strong>APIキーの認証で少しつまずいちゃったみたい。</strong></p>
        <p>キーが正しく有効になっているか、少し時間をおいてからもう一度試してみてね！</p>
      `;
    } else {
      gentleMessage = `
        <p>🧙‍♂️💭 <strong>ごめんね、うまくお返事を作成できなかったよ。</strong></p>
        <p>少し言葉を変えるか、もう一度「〜を作って」と話しかけてみてね！</p>
      `;
    }

    this.appendMessage('wiz', gentleMessage, true);
  }

  // Send Message
  async handleSendMessage() {
    const text = this.userInput.value.trim();
    if (!text && this.attachments.length === 0) return;

    this.userInput.value = '';
    this.userInput.style.height = 'auto';

    this.appendUserMessage(text, [...this.attachments]);

    if (/プログラム作成モード/.test(text) || /コード.*書いて/.test(text) || /ゲーム.*作って/.test(text)) {
      this.switchMode('code');
    }

    // Direct trigger for execution request
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

      // Real Gemini API Call
      const response = await window.wizAI.sendMessage(text, sendingAttachments);
      loadingMsgEl.remove();

      // Process actions returned by Wiz
      const actionResult = await window.agentActions.processResponse(response.text, this.messagesContainer);

      // Check if user requested specific image operations and execute fallback if AI didn't output action tag
      const hasExecutedImageAction = actionResult.actionsCount > 0;

      if (actionResult.cleanText) {
        this.appendMessage('wiz', actionResult.cleanText, false);
      }

      // 1. Pixel Art Request: "ドット絵で○○を描いて"
      const pixelArtMatch = text.match(/(?:ドット絵|ピクセルアート)で\s*(.+?)\s*(?:を描いて|作って|生成して|描画して|ちょうだい|お願い|$)/i);
      if (pixelArtMatch && !hasExecutedImageAction) {
        const subject = pixelArtMatch[1] || 'hero';
        await window.agentActions.executeAction({
          type: 'generate_pixel_art',
          subject: subject,
          caption: `🎨 ドット絵グラフィック: ${subject}`
        }, this.messagesContainer);
      }

      // 2. Runtime Screenshot Request: "実行したときの画像を送って"
      const screenshotMatch = text.match(/(?:実行したとき|実行結果|実行中|動作画面|ゲーム画面).*(?:画像|スクリーンショット|スクショ).*(?:送って|見せて|表示して|ちょうだい|くれ)/i) ||
                              text.match(/(?:スクショ|スクリーンショット).*(?:送って|撮って|見せて)/i);
      if (screenshotMatch && !hasExecutedImageAction) {
        let target = 'index.html';
        const m = text.match(/([a-zA-Z0-9_\-\.\/]+(?:index\.html|\.py))/i);
        if (m) target = m[1];
        await window.agentActions.executeAction({
          type: 'capture_preview',
          path: target,
          caption: `📸 ${target} の実行画面スクリーンショット`
        }, this.messagesContainer);
      }

      // 3. Regular AI Image Request: "○○の画像を描いて/生成して"
      const imageGenMatch = text.match(/(?:画像|イラスト|グラフィック).*(?:描いて|生成して|作って|描画して)/i) ||
                            text.match(/(.+?)の画像(?:を|で)?(?:描いて|生成して|作って)/i);
      if (imageGenMatch && !pixelArtMatch && !screenshotMatch && !hasExecutedImageAction) {
        const prompt = text.replace(/画像|イラスト|グラフィック|描いて|生成して|作って|描画して|お願い|を|で|の/g, ' ').trim() || 'game concept art';
        await window.agentActions.executeAction({
          type: 'generate_image',
          prompt: prompt,
          caption: `✨ AI生成グラフィック: ${prompt}`
        }, this.messagesContainer);
      }

      // 4. Interactive Options (選択肢機能) Fallback
      // AIがタグを出力しなかった場合でも、抽象的な質問に対して即座に選択肢ボタンを提示
      const enemyMatch = text.match(/(?:敵|モンスター|エネミー).*(?:追加|作って|出して)/i);
      const stageMatch = text.match(/(?:ステージ|マップ|背景).*(?:追加|作って|変えて)/i);
      const bgmMatch = text.match(/(?:BGM|効果音|音楽|サウンド).*(?:追加|つけて|鳴らして)/i);
      const itemMatch = text.match(/(?:アイテム|武器|パワーアップ).*(?:追加|作って)/i);

      if (!hasExecutedImageAction) {
        if (enemyMatch) {
          window.agentActions.appendOptionsCard(this.messagesContainer, 'どんな敵を追加する？', [
            '遠距離魔法スライム', '高速突進ウルフ', '巨大ボスゴーレム', '空中飛翔ワイバーン'
          ]);
        } else if (stageMatch) {
          window.agentActions.appendOptionsCard(this.messagesContainer, 'どんなステージにする？', [
            'ネオンサイバーシティ', '灼熱のマグマ火山', '神秘の古代遺跡', '氷のクリスタル宮殿'
          ]);
        } else if (bgmMatch) {
          window.agentActions.appendOptionsCard(this.messagesContainer, 'どんなBGM・効果音にする？', [
            '8bitファミコン風レトロBGM', '緊迫のサイバーパンクBGM', 'ポップで爽快なアーケードBGM'
          ]);
        } else if (itemMatch) {
          window.agentActions.appendOptionsCard(this.messagesContainer, 'どんなアイテム・武器を追加する？', [
            '3方向拡散レーザー', '一時無敵バリア', 'スピードアップポーション', '画面全体ボム'
          ]);
        }
      }

    } catch (err) {
      loadingMsgEl.remove();
      // Gentle friendly message instead of scary red text
      this.handleGentleError(err);
    }
  }

  // Clear messages from container
  clearChatMessages(shouldClearAI = true) {
    this.messagesContainer.innerHTML = '';
    if (shouldClearAI && window.wizAI) {
      window.wizAI.clearHistory();
    }
  }

  // Export chat history for active room snapshot
  exportChatHistory() {
    const rows = this.messagesContainer.querySelectorAll('.message-row');
    const history = [];
    rows.forEach(r => {
      const isUser = r.classList.contains('user');
      const pText = r.querySelector('.msg-bubble p')?.textContent;
      const allText = r.querySelector('.msg-bubble')?.innerText || '';
      const html = r.querySelector('.msg-bubble')?.innerHTML || '';
      history.push({
        sender: isUser ? 'user' : 'wiz',
        text: pText || allText,
        html: html
      });
    });
    return history;
  }

  // Restore chat history when switching room
  restoreChatHistory(history) {
    this.clearChatMessages(false);
    if (!history || history.length === 0) {
      this.sendGreeting();
      return;
    }
    history.forEach(item => {
      this.appendMessage(item.sender, item.html || item.text, Boolean(item.html));
    });
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

    // Actions bar (Speech, Copy, Wiz Undo)
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

    if (sender === 'wiz') {
      const undoBtn = document.createElement('button');
      undoBtn.className = 'msg-action-btn';
      undoBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> <span>変更Undo</span>';
      undoBtn.onclick = () => window.vfs.undo();
      actionsBar.appendChild(undoBtn);
    }

    wrapper.appendChild(actionsBar);
    row.appendChild(wrapper);

    this.messagesContainer.appendChild(row);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Syntax highlighting & code copy
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

  // Text-To-Speech
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
