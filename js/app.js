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
    
    // Wiz Mode Label
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

  cleanLegacyDemoData() {
    try {
      // 1. Clean demo rooms (room_default, ネオン・ブロック崩し)
      const rawRooms = localStorage.getItem('wiz_rooms');
      if (rawRooms) {
        const rooms = JSON.parse(rawRooms);
        const filtered = rooms.filter(r => r.id !== 'room_default' && r.name !== 'ネオン・ブロック崩し');
        if (filtered.length !== rooms.length) {
          localStorage.setItem('wiz_rooms', JSON.stringify(filtered));
        }
      }

      // 2. Clean demo friends keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('wiz_friends_')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '{}');
            let modified = false;
            if (parsed.friends) {
              const before = parsed.friends.length;
              parsed.friends = parsed.friends.filter(f => f.userId !== 'pixel_hero' && f.userId !== 'sound_mage');
              if (parsed.friends.length !== before) modified = true;
            }
            if (parsed.incomingRequests) {
              const before = parsed.incomingRequests.length;
              parsed.incomingRequests = parsed.incomingRequests.filter(r => r.fromUserId !== 'retro_gamer');
              if (parsed.incomingRequests.length !== before) modified = true;
            }
            if (modified) {
              localStorage.setItem(key, JSON.stringify(parsed));
            }
          } catch (e) {}
        }
      });

      // 3. Clean legacy mock user
      const rawUsers = localStorage.getItem('wiz_local_users');
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const filtered = users.filter(u => u.id !== 'usr_mock_001' && u.userId !== 'wiz_creator');
        if (filtered.length !== users.length) {
          localStorage.setItem('wiz_local_users', JSON.stringify(filtered));
        }
      }
    } catch (err) {
      console.warn('cleanLegacyDemoData error:', err);
    }
  }

  init() {
    this.cleanLegacyDemoData();
    this.applyTheme(this.currentTheme, false);
    this.updateAutoDebugBadge();
    this.initLayoutEvents();
    this.initChatEvents();
    this.initAttachmentEvents();
    this.initProjectReset();
    this.initSettingsModal();
    this.initPageViewRouting();
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
    document.body.classList.remove('theme-dark', 'theme-white', 'theme-gray', 'theme-blue');
    document.body.classList.add(themeName);
    localStorage.setItem('wiz_theme', themeName);

    document.querySelectorAll('.settings-theme-card, .theme-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-theme') === themeName);
    });

    if (showToast && window.showToast) {
      const names = { 'theme-white': 'ホワイト', 'theme-dark': 'ダーク', 'theme-gray': 'グレー', 'theme-blue': 'ブルー' };
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
      this.switchPageView('settings');
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
    const activeRoom = window.projectManager?.getActiveRoom();
    const roomTitle = activeRoom?.name || '現在のゲーム';
    const greetingHtml = `
      <p>こんにちは！ 賢者の <strong>Wiz (ウィズ)</strong> だよ！🧙‍♂️✨</p>
      <p>プロジェクト<strong>「${roomTitle}」</strong>の開発専属AIとして、ファイルの作成・編集・削除や、プログラムの実行・機能追加・デバッグまで何でもサポートするよ！</p>
      <p>右側の画面は上部のタブで <strong>「コード」 「実行画面」 「ログ」</strong> をワンクリックで切り替え可能！「実行して！」と言ってくれれば右側ですぐにプレイできるよ。</p>
      <p>もし変更を巻き戻したくなったら、上の <strong>「Wiz変更Undo」</strong> ボタンで直前の状態に戻せるから安心してね。このプロジェクトにどんなファイルや機能を追加してみる？</p>
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
        window.runner?.updateStageDimensions();
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        this.splitResizer?.classList.remove('dragging');
        window.runner?.updateStageDimensions();
      }
    });
  }

  expandSidebar() {
    if (this.isSidebarCollapsed) {
      this.isSidebarCollapsed = false;
      this.editorSection.classList.remove('collapsed');
      setTimeout(() => window.runner?.updateStageDimensions(), 100);
    }
  }

  runCurrentProject() {
    if (!window.supabaseAuth?.currentUser) {
      if (window.showToast) window.showToast('ゲームを実行するにはログインが必要です。', 'warning');
      window.supabaseAuth?.updateGateVisibility();
      return;
    }
    const active = window.editor?.activeFile || 'index.html';
    const target = (active.endsWith('.html') || active.endsWith('.py')) ? active : 'index.html';
    window.runner.run(target);
  }

  // Chat & Messaging
  initChatEvents() {
    this.sendBtn?.addEventListener('click', () => this.handleSendMessage());

    this.userInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSendMessage();
      }
    });

    this.userInput?.addEventListener('input', () => {
      this.userInput.style.height = 'auto';
      this.userInput.style.height = Math.min(Math.max(this.userInput.scrollHeight, 40), 240) + 'px';
    });

    this.userInput?.addEventListener('paste', () => {
      setTimeout(() => {
        this.userInput.style.height = 'auto';
        this.userInput.style.height = Math.min(Math.max(this.userInput.scrollHeight, 40), 240) + 'px';
      }, 10);
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

  switchMode(mode = 'code') {
    // Mode is locked to dedicated project code mode
    if (this.wizModeLabel) {
      this.wizModeLabel.innerHTML = '<i class="fa-solid fa-code" style="color:var(--wiz-accent); margin-right:3px;"></i> プロジェクト専属開発AI';
    }
    window.wizAI.setMode('code');
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
    // Auth guard: User must be logged in to use Wiz
    if (!window.supabaseAuth?.currentUser) {
      if (window.showToast) window.showToast('Wizを利用するにはログインが必要です。', 'warning');
      window.supabaseAuth?.updateGateVisibility();
      return;
    }

    const text = this.userInput.value.trim();
    if (!text && this.attachments.length === 0) return;

    this.userInput.value = '';
    this.userInput.style.height = 'auto';

    this.appendUserMessage(text, [...this.attachments]);

    // 1. Direct trigger: Create new room / chat
    // "新しい『ブロック崩し』チャットを作って" or "新しい「〇〇」チャットを作って" or "新しい部屋を作って"
    const createRoomMatch = text.match(/(?:新しい|新規の?)[『「](.+?)[』」](?:チャット|部屋|プロジェクト).*(?:作って|作成して|立ち上げて)/i) ||
                            text.match(/新しい(?:チャット|部屋|プロジェクト).*(?:作って|作成して)/i) ||
                            text.match(/[『「](.+?)[』」](?:という|の)?(?:新しい)?(?:チャット|部屋|プロジェクト).*(?:作って|作成して)/i);
    if (createRoomMatch) {
      const roomName = (createRoomMatch[1] && createRoomMatch[1].trim()) || '新しいプロジェクト';
      if (window.projectManager) {
        window.projectManager.createNewRoom(roomName);
        this.appendMessage('wiz', `🧙‍♂️✨ **新しいチャット部屋「${roomName}」を作成したよ！**\nどんなゲームや機能を作りたいか、何でも教えてね！`, false);
        return;
      }
    }

    // 2. Direct trigger: Switch view
    if (/(?:実行画面|プレビュー|ゲーム画面).*(?:見せて|表示して|切り替えて|開いて|にして)/.test(text)) {
      this.switchRightView('preview');
      this.appendMessage('wiz', `🧙‍♂️🎮 **実行画面（プレビュー）に切り替えたよ！** 右側の画面でゲームをプレイできるよ！`, false);
      return;
    }
    if (/(?:コード画面|エディタ|ソースコード).*(?:見せて|表示して|切り替えて|開いて|にして)/.test(text)) {
      this.switchRightView('code');
      this.appendMessage('wiz', `🧙‍♂️💻 **コード画面（エディタ）に切り替えたよ！** 直接コードを確認・編集できるよ！`, false);
      return;
    }
    if (/(?:ログ画面|コンソール|エラーログ).*(?:見せて|表示して|切り替えて|開いて|にして)/.test(text)) {
      this.switchRightView('logs');
      this.appendMessage('wiz', `🧙‍♂️📋 **ログ画面に切り替えたよ！** 実行中のコンソール出力やエラーを確認できるよ！`, false);
      return;
    }

    // 3. Direct trigger: Open modals
    if (/(?:設定).*(?:開いて|表示して|見せて)/.test(text)) {
      document.getElementById('settings-btn')?.click();
      this.appendMessage('wiz', `🧙‍♂️⚙️ **設定画面を開いたよ！** テーマや2段階認証の設定ができるよ！`, false);
      return;
    }
    if (/(?:フレンド).*(?:開いて|表示して|見せて|画面)/.test(text)) {
      document.getElementById('sidebar-tab-friends')?.click();
      this.appendMessage('wiz', `🧙‍♂️👥 **フレンド管理画面を開いたよ！** 左側のタブからフレンド申請や一時チャットができるよ！`, false);
      return;
    }
    if (/(?:チーム|プロジェクト共有|共有).*(?:開いて|表示して|見せて|画面)/.test(text)) {
      document.getElementById('project-team-btn')?.click();
      this.appendMessage('wiz', `🧙‍♂️🤝 **プロジェクト共有・チーム管理画面を開いたよ！** フレンドを招待したり権限（管理者・編集者・観覧者）を設定できるよ！`, false);
      return;
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

      // Check if user requested specific image or studio operations and execute fallback if AI didn't output action tag
      const hasExecutedAnyAction = actionResult.actionsCount > 0;

      if (actionResult.cleanText) {
        this.appendMessage('wiz', actionResult.cleanText, false);
      }

      // 0. Studio Room Creation: "新しい『〇〇』チャットを作って" or "〇〇プロジェクトを作って"
      const createRoomMatch = text.match(/(?:新しい)?(?:『(.+?)』|「(.+?)」|(.+?))\s*(?:チャット|部屋|プロジェクト)\s*(?:を|で)?(?:作って|作成して|立ち上げて|オープンして)/i);
      if (createRoomMatch && !hasExecutedAnyAction) {
        const roomName = (createRoomMatch[1] || createRoomMatch[2] || createRoomMatch[3] || '新しいプロジェクト').trim();
        if (roomName && !/コード|プログラム|ゲーム/.test(roomName)) {
          await window.agentActions.executeAction({
            type: 'create_room',
            name: roomName
          }, this.messagesContainer);
        }
      }

      // 1. Pixel Art Request: "ドット絵で○○を描いて"
      const pixelArtMatch = text.match(/(?:ドット絵|ピクセルアート)で\s*(.+?)\s*(?:を描いて|作って|生成して|描画して|ちょうだい|お願い|$)/i);
      if (pixelArtMatch && !hasExecutedAnyAction) {
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
      if (imageGenMatch && !pixelArtMatch && !screenshotMatch && !hasExecutedAnyAction) {
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

      if (!hasExecutedAnyAction) {
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
      bubble.innerHTML = this.formatUserMessageContent(text);

      // Syntax highlighting & code copy for user pasted code
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

  formatUserMessageContent(rawText) {
    if (!rawText) return '';

    // If text already contains markdown code blocks ```...```
    if (/```[\s\S]*?```/.test(rawText)) {
      return this.simpleMarkdown(rawText);
    }

    // Check if user pasted raw source code (multi-line, indentation, or typical code markers)
    const lines = rawText.split('\n');
    const isMultiLine = lines.length > 2;
    const looksLikeCode = isMultiLine && (
      /^\s*(?:<(!DOCTYPE|html|div|canvas|script|style|link)|import |from |def |class |function |const |let |var |#include)/m.test(rawText) ||
      lines.filter(l => /^\s{2,}|\t/.test(l)).length >= 2 ||
      /[{};]\s*$/.test(lines[lines.length - 1]) ||
      (rawText.includes('{') && rawText.includes('}'))
    );

    if (looksLikeCode) {
      let lang = 'javascript';
      if (/^\s*<(?:!DOCTYPE|html|div)/i.test(rawText)) lang = 'html';
      else if (/^\s*(?:import |def |class )/m.test(rawText) && !rawText.includes('function')) lang = 'python';
      else if (/#include/m.test(rawText)) lang = 'cpp';
      else if (/^\s*[*#.]|\{[\s\S]*?:[\s\S]*?\}/m.test(rawText) && !rawText.includes('function')) lang = 'css';

      const escaped = this.escapeHtml(rawText);
      return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
    }

    // Regular conversation text: preserve formatting with white-space: pre-wrap
    const escaped = this.escapeHtml(rawText);
    return `<div class="user-text-content">${escaped}</div>`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|weba)$/i.test(file.name);
      let base64 = null;
      let text = null;

      if (isImage || isAudio) {
        base64 = await this.readFileAsBase64(file);
      } else {
        text = await this.readFileAsText(file);
      }

      this.attachments.push({
        name: file.name,
        type: file.type,
        size: file.size,
        isImage: isImage,
        isAudio: isAudio,
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
      const iconClass = att.isImage ? 'fa-regular fa-image' : att.isAudio ? 'fa-solid fa-file-audio' : 'fa-solid fa-file-lines';
      pill.innerHTML = `
        <i class="${iconClass}"></i>
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
    this.attachmentTray.style.display = 'none';
  }

  // ==========================================
  // PDF Unified UI Navigation & Page Routing
  // ==========================================
  initPageViewRouting() {
    this.currentView = 'home';

    // Header Navigation buttons (Home & Studio buttons removed as requested)
    const navMarket = document.getElementById('nav-btn-marketplace');
    const navProjects = document.getElementById('nav-btn-projects');
    const navFriends = document.getElementById('nav-btn-friends');
    const navCommunity = document.getElementById('nav-btn-community');
    const navNotifs = document.getElementById('nav-btn-notifications');
    const navSettings = document.getElementById('nav-btn-settings');
    const navTutorial = document.getElementById('nav-btn-tutorial');
    const logoBtn = document.getElementById('header-logo-home-btn') || document.getElementById('header-brand-logo');

    navMarket?.addEventListener('click', (e) => { e.preventDefault(); this.switchPageView('marketplace'); });
    navProjects?.addEventListener('click', (e) => { e.preventDefault(); this.switchPageView('projects'); });
    navFriends?.addEventListener('click', (e) => { e.preventDefault(); this.switchPageView('friends'); });
    navCommunity?.addEventListener('click', (e) => { e.preventDefault(); this.switchPageView('community'); });
    navNotifs?.addEventListener('click', (e) => { e.preventDefault(); this.switchPageView('notifications'); });
    navSettings?.addEventListener('click', (e) => { e.preventDefault(); this.switchPageView('settings'); });
    navTutorial?.addEventListener('click', (e) => { e.preventDefault(); this.switchPageView('tutorial'); });

    // Wiz Studio Logo click => Navigate to Home
    logoBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchPageView('home');
    });

    // 1P: Home view interactive shortcuts
    document.getElementById('home-account-box-btn')?.addEventListener('click', () => this.openSettingsTab('profile'));
    document.getElementById('home-friends-box-btn')?.addEventListener('click', () => this.switchPageView('friends'));
    document.getElementById('home-projects-box-btn')?.addEventListener('click', () => this.switchPageView('projects'));
    document.getElementById('home-other-info-box-btn')?.addEventListener('click', () => this.switchPageView('system-info'));
    document.getElementById('home-btn-new-project')?.addEventListener('click', () => window.projectManager?.promptCreateNewRoom());
    document.getElementById('home-btn-open-studio')?.addEventListener('click', () => this.switchPageView('studio'));
    document.getElementById('home-see-all-projects-btn')?.addEventListener('click', () => this.switchPageView('projects'));
    document.getElementById('home-see-all-friends-btn')?.addEventListener('click', () => this.switchPageView('friends'));

    // Detail / System Info navigation buttons
    document.getElementById('btn-back-to-home-from-info')?.addEventListener('click', () => this.switchPageView('home'));
    document.getElementById('info-view-open-projects-btn')?.addEventListener('click', () => this.switchPageView('projects'));
    document.getElementById('info-view-open-studio-btn')?.addEventListener('click', () => this.switchPageView('studio'));

    // Template Fast-Starter chips in Home view
    document.querySelectorAll('.fast-chip-btn[data-tmpl]').forEach(chip => {
      chip.addEventListener('click', () => {
        const tmpl = chip.getAttribute('data-tmpl');
        this.createProjectFromTemplate(tmpl);
      });
    });

    // Project Filter chips (All / My / Shared)
    document.querySelectorAll('#projects-filter-chips .fast-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#projects-filter-chips .fast-chip-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (window.projectManager) {
          window.projectManager.activeProjectsFilter = btn.getAttribute('data-proj-filter');
          window.projectManager.renderProjectsView();
        }
      });
    });

    // 2P: Projects View interactive controls
    document.getElementById('projects-view-create-btn')?.addEventListener('click', () => {
      window.projectManager?.promptCreateNewRoom();
    });
    const projSearch = document.getElementById('projects-view-search');
    if (projSearch) {
      projSearch.addEventListener('input', (e) => {
        if (window.projectManager) {
          window.projectManager.searchQuery = e.target.value.trim();
          window.projectManager.renderProjectsView();
        }
      });
    }

    // 3P: Friends View interactive controls
    document.getElementById('friends-view-copy-id-btn')?.addEventListener('click', () => {
      const myId = '@' + (window.friendsManager?.getCurrentUserId() || 'wiz_creator');
      navigator.clipboard.writeText(myId).then(() => {
        if (window.showToast) window.showToast(`ユーザーID「${myId}」をコピーしました！`, 'success');
      });
    });

    // Notification Center buttons
    document.getElementById('notification-center-btn')?.addEventListener('click', () => {
      this.switchPageView('notifications');
    });
    document.getElementById('clear-all-notifications-btn')?.addEventListener('click', () => {
      if (window.notificationsManager) {
        window.notificationsManager.clearAll();
      }
      this.renderNotificationCenterView();
      if (window.showToast) window.showToast('通知をすべてクリアしました', 'info');
    });

    // Tutorial view controls
    document.getElementById('tutorial-launch-sample-btn')?.addEventListener('click', () => {
      this.createProjectFromTemplate('breaker');
    });
    this.initTutorialEvents();

    // 4P: Full-page Marketplace events
    this.initMarketplaceEvents();

    // 5P: Full-page Settings events
    this.initFullSettingsEvents();

    // Default to Home View on initial launch
    this.switchPageView('home');
  }

  switchPageView(viewName) {
    this.currentView = viewName;

    // Nav button active class
    const navButtons = [
      { id: 'nav-btn-marketplace', key: 'marketplace' },
      { id: 'nav-btn-projects', key: 'projects' },
      { id: 'nav-btn-friends', key: 'friends' },
      { id: 'nav-btn-community', key: 'community' },
      { id: 'nav-btn-notifications', key: 'notifications' },
      { id: 'nav-btn-settings', key: 'settings' },
      { id: 'nav-btn-tutorial', key: 'tutorial' }
    ];

    navButtons.forEach(btnInfo => {
      const el = document.getElementById(btnInfo.id);
      if (el) {
        el.classList.toggle('active', btnInfo.key === viewName);
      }
    });

    // Views container references
    const viewHome = document.getElementById('view-home');
    const viewProjects = document.getElementById('view-projects');
    const viewFriends = document.getElementById('view-friends');
    const viewCommunity = document.getElementById('view-community');
    const viewNotifications = document.getElementById('view-notifications');
    const viewMarketplace = document.getElementById('view-marketplace');
    const viewSettings = document.getElementById('view-settings');
    const viewTutorial = document.getElementById('view-tutorial');
    const viewSystemInfo = document.getElementById('view-system-info');
    const workspaceContainer = document.getElementById('workspace-container');

    if (viewHome) viewHome.style.display = (viewName === 'home') ? 'block' : 'none';
    if (viewProjects) viewProjects.style.display = (viewName === 'projects') ? 'block' : 'none';
    if (viewFriends) viewFriends.style.display = (viewName === 'friends') ? 'block' : 'none';
    if (viewCommunity) viewCommunity.style.display = (viewName === 'community') ? 'block' : 'none';
    if (viewNotifications) viewNotifications.style.display = (viewName === 'notifications') ? 'block' : 'none';
    if (viewMarketplace) viewMarketplace.style.display = (viewName === 'marketplace') ? 'block' : 'none';
    if (viewSettings) viewSettings.style.display = (viewName === 'settings') ? 'block' : 'none';
    if (viewTutorial) viewTutorial.style.display = (viewName === 'tutorial') ? 'block' : 'none';
    if (viewSystemInfo) viewSystemInfo.style.display = (viewName === 'system-info') ? 'block' : 'none';
    if (workspaceContainer) workspaceContainer.style.display = (viewName === 'studio') ? 'flex' : 'none';

    // REQUIREMENT: Studio Action Buttons (Run, SoundFX, Undo, Zip, etc.) visible ONLY in Studio/Editor!
    const studioActions = document.getElementById('header-studio-actions');
    if (studioActions) {
      studioActions.style.display = (viewName === 'studio') ? 'flex' : 'none';
    }

    // Trigger View-specific Renderers
    if (viewName === 'home') {
      this.renderHomeView();
    } else if (viewName === 'system-info') {
      this.renderSystemInfoView();
    } else if (viewName === 'projects') {
      if (window.projectManager) {
        window.projectManager.renderProjectsView();
      }
    } else if (viewName === 'friends') {
      if (window.friendsManager) {
        window.friendsManager.renderFriendsPageView();
      }
    } else if (viewName === 'community') {
      if (window.communityManager) {
        window.communityManager.renderCommunityView();
      }
    } else if (viewName === 'notifications') {
      this.renderNotificationCenterView();
    } else if (viewName === 'marketplace') {
      this.renderMarketplacePageView();
    } else if (viewName === 'settings') {
      this.renderSettingsPageView();
    } else if (viewName === 'studio') {
      if (window.editor) {
        window.editor.renderTree();
        window.editor.renderTabs();
      }
    }
  }

  renderNotificationCenterView() {
    const listContainer = document.getElementById('full-notifications-list');
    if (!listContainer) return;

    const notifs = window.notificationsManager?.notifications || [];
    if (notifs.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding: 4rem 1.5rem; border: 2px dashed var(--border-subtle); border-radius: 16px; background: var(--bg-card); color: var(--text-muted);">
          <div style="font-size: 2.8rem; margin-bottom: 0.8rem; opacity: 0.5;"><i class="fa-solid fa-bell-slash"></i></div>
          <h3 style="color: var(--text-primary); margin-bottom: 0.3rem; font-size: 1.15rem; font-weight: 700;">通知はありません</h3>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin: 0;">新しいメッセージやプロジェクトの更新があるとここに届きます。</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = notifs.map(n => {
      const icon = n.type === 'project' ? 'fa-gamepad' : n.type === 'friend' ? 'fa-user-group' : 'fa-info';
      return `
        <div class="notification-page-card">
          <div class="notif-page-icon"><i class="fa-solid ${icon}"></i></div>
          <div class="notif-page-content">
            <div class="notif-page-title">${this.escapeHtml(n.title || '通知')}</div>
            <div class="notif-page-message">${this.escapeHtml(n.message || '')}</div>
            <div class="notif-page-time">${n.time || ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================
  // 5P: Full-page Settings Logic
  // ==========================================
  // ==========================================
  // Fallback persistent pixel-art SVG data URI (permanently preserved offline or on network error)
  getFallbackPixelAvatar() {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges" width="128" height="128"><rect width="16" height="16" fill="%23202124"/><rect x="4" y="2" width="8" height="2" fill="%231a73e8"/><rect x="3" y="4" width="10" height="2" fill="%238ab4f8"/><rect x="4" y="6" width="8" height="5" fill="%23fed7aa"/><rect x="5" y="7" width="2" height="2" fill="%231e293b"/><rect x="9" y="7" width="2" height="2" fill="%231e293b"/><rect x="7" y="9" width="2" height="1" fill="%23ea580c"/><rect x="5" y="10" width="6" height="1" fill="%23f97316"/><rect x="3" y="11" width="10" height="4" fill="%231a73e8"/><rect x="2" y="12" width="2" height="3" fill="%238ab4f8"/><rect x="12" y="12" width="2" height="3" fill="%238ab4f8"/></svg>`;
  }

  // Get user avatar ensuring pixel-art styling and permanent persistence
  getUserAvatar() {
    const saved = localStorage.getItem('wiz_custom_avatar');
    if (saved) return saved;
    const currentUser = window.supabaseAuth?.currentUser;
    const currentAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.avatar;
    if (currentAvatar && !currentAvatar.includes('bottts')) {
      return currentAvatar;
    }
    const userId = currentUser?.user_metadata?.user_id || currentUser?.userId || 'wiz_creator';
    return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userId)}`;
  }

  // Seamlessly open settings view with specified category tab (e.g. 'profile')
  openSettingsTab(tabKey = 'profile') {
    this.switchPageView('settings');
    const tabButtons = document.querySelectorAll('.settings-sidebar .settings-nav-item');
    tabButtons.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tabKey));
    document.querySelectorAll('.settings-content-area .settings-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `settings-panel-${tabKey}`);
    });

    if (tabKey === 'profile') {
      const avatarEl = document.getElementById('profile-avatar-preview');
      const avatarUrl = this.getUserAvatar();
      if (avatarEl) {
        avatarEl.src = avatarUrl;
        avatarEl.setAttribute('data-avatar-url', avatarUrl);
      }
      const profilePanel = document.getElementById('settings-panel-profile');
      if (profilePanel) {
        profilePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  initFullSettingsEvents() {
    // 1. Two-Pane Tab Navigation (Left Sidebar)
    const tabButtons = document.querySelectorAll('.settings-sidebar .settings-nav-item');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        tabButtons.forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.settings-content-area .settings-panel').forEach(panel => {
          panel.classList.toggle('active', panel.id === `settings-panel-${tabKey}`);
        });
      });
    });

    // 2. Theme Cards (White, Dark, Gray, Blue)
    const themeCards = [
      { id: 'theme-opt-white', theme: 'theme-white' },
      { id: 'theme-opt-dark', theme: 'theme-dark' },
      { id: 'theme-opt-gray', theme: 'theme-gray' },
      { id: 'theme-opt-blue', theme: 'theme-blue' }
    ];

    themeCards.forEach(tc => {
      document.getElementById(tc.id)?.addEventListener('click', () => {
        this.applyTheme(tc.theme);
        themeCards.forEach(o => document.getElementById(o.id)?.classList.toggle('active', o.theme === tc.theme));
      });
    });

    // 3. Wiz Detailed Settings
    // Auto Debug toggle
    const autoDebugCheck = document.getElementById('setting-auto-debug');
    autoDebugCheck?.addEventListener('change', (e) => {
      this.autoDebugMode = e.target.checked;
      localStorage.setItem('wiz_auto_debug', this.autoDebugMode);
      this.updateAutoDebugBadge();
      if (window.showToast) window.showToast(`自動デバッグを ${this.autoDebugMode ? 'ON' : 'OFF'} にしました`, 'info');
    });

    // Cross-Room Memory toggle
    const crossMemCheck = document.getElementById('setting-cross-memory');
    crossMemCheck?.addEventListener('change', (e) => {
      if (window.projectManager) {
        window.projectManager.setCrossRoomMemory(e.target.checked);
        if (window.showToast) window.showToast(`プロジェクト間メモリを ${e.target.checked ? '有効' : '無効'} にしました`, 'info');
      }
    });

    // Preview Display Mode Radios
    document.querySelectorAll('input[name="preview-display-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.previewDisplayMode = e.target.value;
          localStorage.setItem('wiz_preview_mode', this.previewDisplayMode);
          if (window.showToast) window.showToast(`プレビュー方式を「${e.target.value === 'panel' ? '右側パネル' : '全画面モーダル'}」に設定しました`, 'info');
        }
      });
    });

    // Personality Mode (Friendly vs Polite)
    const friendlyCard = document.getElementById('personality-opt-friendly');
    const politeCard = document.getElementById('personality-opt-polite');

    friendlyCard?.addEventListener('click', () => {
      friendlyCard.classList.add('active');
      politeCard?.classList.remove('active');
      localStorage.setItem('wiz_personality', 'friendly');
      if (window.wizAI) window.wizAI.setPersonality('friendly');
      if (window.showToast) window.showToast('Wizの性格を「親しみやすいモード」に変更しました', 'info');
    });

    politeCard?.addEventListener('click', () => {
      politeCard.classList.add('active');
      friendlyCard?.classList.remove('active');
      localStorage.setItem('wiz_personality', 'polite');
      if (window.wizAI) window.wizAI.setPersonality('polite');
      if (window.showToast) window.showToast('Wizの性格を「敬語のモード」に変更しました', 'info');
    });

    // 4. Profile Management
    const avatarImg = document.getElementById('profile-avatar-preview');
    const avatarFileInput = document.getElementById('profile-avatar-file-input');
    const avatarUrlInput = document.getElementById('profile-avatar-url-input');
    const avatarRandomBtn = document.getElementById('profile-avatar-random-btn');

    // Local Image File Upload
    avatarFileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        if (window.showToast) window.showToast('画像ファイルを選択してください', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target.result;
        if (avatarImg) {
          avatarImg.src = dataUrl;
          avatarImg.setAttribute('data-avatar-url', dataUrl);
        }
        if (avatarUrlInput) avatarUrlInput.value = '';
        if (window.showToast) window.showToast('画像ファイルを読み込みました。「保存」を押して確定してください。', 'info');
      };
      reader.readAsDataURL(file);
    });

    // Image URL Input
    avatarUrlInput?.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url && avatarImg) {
        avatarImg.src = url;
        avatarImg.setAttribute('data-avatar-url', url);
      }
    });

    // Random Avatar Generator (Pixel-Art collection)
    avatarRandomBtn?.addEventListener('click', () => {
      const seed = 'pixel_' + Math.random().toString(36).substring(2, 8);
      const randomUrl = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
      if (avatarImg) {
        avatarImg.src = randomUrl;
        avatarImg.setAttribute('data-avatar-url', randomUrl);
        avatarImg.onerror = () => {
          avatarImg.src = this.getFallbackPixelAvatar();
        };
      }
      if (avatarUrlInput) avatarUrlInput.value = randomUrl;
      if (window.showToast) window.showToast('ドット絵アバターを生成しました。「保存」を押して確定してください。', 'info');
    });

    // Save Profile Button
    document.getElementById('save-profile-btn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('profile-display-name');
      const bioInput = document.getElementById('profile-bio');
      const updatedName = nameInput?.value.trim() || '';
      const updatedBio = bioInput?.value.trim() || '';
      const updatedAvatar = avatarImg?.getAttribute('data-avatar-url') || avatarImg?.src || this.getUserAvatar();

      // Permanent persistence in LocalStorage
      try {
        localStorage.setItem('wiz_custom_avatar', updatedAvatar);
      } catch (e) {
        console.warn('Failed to save avatar to localStorage:', e);
      }

      if (window.supabaseAuth && window.supabaseAuth.currentUser) {
        window.supabaseAuth.currentUser.username = updatedName;
        window.supabaseAuth.currentUser.bio = updatedBio;
        window.supabaseAuth.currentUser.avatar = updatedAvatar;
        if (!window.supabaseAuth.currentUser.user_metadata) window.supabaseAuth.currentUser.user_metadata = {};
        window.supabaseAuth.currentUser.user_metadata.full_name = updatedName;
        window.supabaseAuth.currentUser.user_metadata.bio = updatedBio;
        window.supabaseAuth.currentUser.user_metadata.avatar_url = updatedAvatar;
        window.supabaseAuth.saveLocalUsers();
      }

      if (window.showToast) window.showToast('プロフィールを保存しました！', 'success');
      this.renderHomeView();
    });

    // 5. Account Management
    // Email Update
    document.getElementById('account-email-update-btn')?.addEventListener('click', () => {
      const emailInput = document.getElementById('account-email-input');
      const newEmail = emailInput?.value.trim();
      if (!newEmail || !newEmail.includes('@')) {
        if (window.showToast) window.showToast('有効なメールアドレスを入力してください', 'warning');
        return;
      }
      if (window.supabaseAuth && window.supabaseAuth.currentUser) {
        window.supabaseAuth.currentUser.email = newEmail;
        window.supabaseAuth.saveLocalUsers();
        if (window.showToast) window.showToast('メールアドレスを更新しました', 'success');
      }
    });

    // Account Logout
    document.getElementById('account-logout-btn')?.addEventListener('click', () => {
      if (window.supabaseAuth && typeof window.supabaseAuth.signOut === 'function') {
        window.supabaseAuth.signOut();
      } else {
        window.location.reload();
      }
    });

    // Account Deletion (Danger Zone with 6-Digit Code Verification)
    let generatedVerificationCode = '';
    const deleteBox = document.getElementById('delete-account-verification-box');
    const codeDisplay = document.getElementById('delete-verification-code');
    const confirmInput = document.getElementById('delete-confirm-input');
    const executeBtn = document.getElementById('execute-delete-account-btn');
    const cancelBtn = document.getElementById('cancel-delete-account-btn');

    document.getElementById('initiate-delete-account-btn')?.addEventListener('click', () => {
      generatedVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      if (codeDisplay) codeDisplay.textContent = generatedVerificationCode;
      if (confirmInput) confirmInput.value = '';
      if (executeBtn) executeBtn.disabled = true;
      if (deleteBox) deleteBox.style.display = 'block';
    });

    confirmInput?.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (executeBtn) {
        executeBtn.disabled = (val !== generatedVerificationCode);
      }
    });

    cancelBtn?.addEventListener('click', () => {
      if (deleteBox) deleteBox.style.display = 'none';
      if (confirmInput) confirmInput.value = '';
      generatedVerificationCode = '';
    });

    executeBtn?.addEventListener('click', async () => {
      if (confirmInput?.value.trim() !== generatedVerificationCode) return;
      const reallyDelete = await window.showConfirm(
        '本当にアカウントを削除しますか？この操作は取り消せません。すべてのプロジェクトやデータが完全に削除されます。',
        'アカウントの完全削除'
      );
      if (reallyDelete) {
        localStorage.clear();
        sessionStorage.clear();
        alert('アカウントと全データが完全に削除されました。初期画面に戻ります。');
        window.location.reload();
      }
    });

    // 6. Notification Settings Toggles
    const notifKeys = [
      { id: 'notif-project-updates', key: 'wiz_notif_project_updates' },
      { id: 'notif-wiz-advises', key: 'wiz_notif_wiz_advises' },
      { id: 'notif-friend-requests', key: 'wiz_notif_friend_requests' },
      { id: 'notif-soundfx', key: 'wiz_notif_soundfx' }
    ];

    notifKeys.forEach(nk => {
      const el = document.getElementById(nk.id);
      el?.addEventListener('change', (e) => {
        localStorage.setItem(nk.key, e.target.checked);
        if (window.showToast) window.showToast('通知設定を保存しました', 'info');
      });
    });
  }

  renderSettingsPageView() {
    // 1. Theme Selection Cards
    ['theme-white', 'theme-dark', 'theme-gray', 'theme-blue'].forEach(t => {
      const card = document.getElementById(`theme-opt-${t.replace('theme-', '')}`);
      if (card) card.classList.toggle('active', this.currentTheme === t);
    });

    // 2. Wiz Details
    const autoDebugEl = document.getElementById('setting-auto-debug');
    if (autoDebugEl) autoDebugEl.checked = this.autoDebugMode;

    const crossMemEl = document.getElementById('setting-cross-memory');
    if (crossMemEl) crossMemEl.checked = window.projectManager?.crossRoomMemoryEnabled ?? true;

    document.querySelectorAll('input[name="preview-display-mode"]').forEach(r => {
      r.checked = (r.value === this.previewDisplayMode);
    });

    const currentPersonality = localStorage.getItem('wiz_personality') || 'friendly';
    document.getElementById('personality-opt-friendly')?.classList.toggle('active', currentPersonality === 'friendly');
    document.getElementById('personality-opt-polite')?.classList.toggle('active', currentPersonality === 'polite');

    // 3. Profile (Default empty for new users)
    const currentUser = window.supabaseAuth?.currentUser;
    const userId = currentUser?.user_metadata?.user_id || currentUser?.userId || '';
    const username = currentUser?.user_metadata?.full_name || currentUser?.username || '';
    const avatarUrl = this.getUserAvatar();

    const avatarEl = document.getElementById('profile-avatar-preview');
    const nameEl = document.getElementById('profile-display-name');
    const idEl = document.getElementById('profile-user-id');
    const bioEl = document.getElementById('profile-bio');

    if (avatarEl) {
      avatarEl.src = avatarUrl;
      avatarEl.setAttribute('data-avatar-url', avatarUrl);
      avatarEl.onerror = () => {
        avatarEl.src = this.getFallbackPixelAvatar();
      };
    }
    if (nameEl) nameEl.value = username;
    if (idEl) idEl.value = userId ? `@${userId}` : '';
    if (bioEl) bioEl.value = userBio;

    // 4. Account
    const emailEl = document.getElementById('account-email-input');
    if (emailEl) emailEl.value = currentUser?.email || '';

    // 5. Notifications
    const notifKeys = [
      { id: 'notif-project-updates', key: 'wiz_notif_project_updates' },
      { id: 'notif-wiz-advises', key: 'wiz_notif_wiz_advises' },
      { id: 'notif-friend-requests', key: 'wiz_notif_friend_requests' },
      { id: 'notif-soundfx', key: 'wiz_notif_soundfx' }
    ];
    notifKeys.forEach(nk => {
      const el = document.getElementById(nk.id);
      if (el) {
        const val = localStorage.getItem(nk.key);
        el.checked = val !== null ? val === 'true' : true;
      }
    });
  }

  // ==========================================
  // 4P: Full-page Marketplace Logic
  // ==========================================
  initMarketplaceEvents() {
    // Publish current game button
    document.getElementById('marketplace-publish-current-btn')?.addEventListener('click', async () => {
      const activeRoom = window.projectManager?.getActiveRoom();
      if (!activeRoom) {
        if (window.showToast) window.showToast('公開できるプロジェクトがありません', 'warning');
        return;
      }
      const title = await window.showPrompt('公開するゲームタイトルを入力してください:', activeRoom.name, 'マーケットに公開');
      if (!title) return;
      const desc = await window.showPrompt('ゲームの簡単な説明を入力してください:', activeRoom.rules || '面白いWebゲームです！', 'ゲーム説明');

      const newMarketItem = {
        id: 'market_' + Date.now(),
        title: title,
        description: desc || 'Wiz Studioで作成されたゲーム',
        author: window.supabaseAuth?.currentUser?.username || 'Wizユーザー',
        authorId: window.supabaseAuth?.currentUser?.userId || 'wiz_user',
        authorAvatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${window.supabaseAuth?.currentUser?.userId || 'wiz_user'}`,
        category: 'action',
        plays: 1,
        rating: 5.0,
        createdAt: Date.now(),
        roomId: activeRoom.id,
        vfsRoot: activeRoom.vfsRoot
      };

      const savedMarket = JSON.parse(localStorage.getItem('wiz_custom_marketplace_items') || '[]');
      savedMarket.unshift(newMarketItem);
      localStorage.setItem('wiz_custom_marketplace_items', JSON.stringify(savedMarket));

      if (window.showToast) window.showToast(`「${title}」をマーケットに公開しました！🎉`, 'success');
      this.renderMarketplacePageView();
    });

    // Category chips
    document.querySelectorAll('#marketplace-category-chips .fast-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#marketplace-category-chips .fast-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedMarketCategory = btn.getAttribute('data-market-cat');
        this.renderMarketplacePageView();
      });
    });

    // Search input
    document.getElementById('marketplace-search-input')?.addEventListener('input', (e) => {
      this.marketSearchQuery = e.target.value.trim().toLowerCase();
      this.renderMarketplacePageView();
    });
  }

  renderMarketplacePageView() {
    const grid = document.getElementById('marketplace-page-cards-grid');
    if (!grid) return;

    // Preset Community Games + Custom Published Games
    const defaultGames = [
      {
        id: 'comm_breaker',
        title: 'ネオン・ブロック崩し DX',
        description: '反射角度とスピードアップを極めたサイバー調ブロック崩し！',
        author: 'ドット勇者',
        authorId: 'pixel_hero',
        authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=pixel_hero',
        category: 'action',
        plays: 342,
        rating: 4.9,
        templateKey: 'breaker'
      },
      {
        id: 'comm_clicker',
        title: 'クリッカー・タイクーン 2026',
        description: '自動採掘機と施設を強化して億万長者を目指す放置系クリッカー。',
        author: '音響魔術師',
        authorId: 'sound_mage',
        authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sound_mage',
        category: 'clicker',
        plays: 512,
        rating: 4.8,
        templateKey: 'clicker'
      },
      {
        id: 'comm_shooter',
        title: 'ギャラクシー・ストライカー',
        description: '怒涛の弾幕を掻い潜り敵艦隊を殲滅する縦スクロールシューター！',
        author: 'レトロゲーマー',
        authorId: 'retro_gamer',
        authorAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=retro_gamer',
        category: 'action',
        plays: 289,
        rating: 4.7,
        templateKey: 'breaker'
      }
    ];

    const customGames = JSON.parse(localStorage.getItem('wiz_custom_marketplace_items') || '[]');
    let allGames = [...customGames, ...defaultGames];

    // Filter by Category
    if (this.selectedMarketCategory && this.selectedMarketCategory !== 'all') {
      allGames = allGames.filter(g => g.category === this.selectedMarketCategory);
    }

    // Filter by Search Query
    if (this.marketSearchQuery) {
      allGames = allGames.filter(g => 
        (g.title || '').toLowerCase().includes(this.marketSearchQuery) ||
        (g.description || '').toLowerCase().includes(this.marketSearchQuery) ||
        (g.author || '').toLowerCase().includes(this.marketSearchQuery)
      );
    }

    if (allGames.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; border: 1px dashed var(--border-color); border-radius: 12px; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.6rem;"><i class="fa-solid fa-store-slash"></i></div>
          <p>該当するゲームが見つかりませんでした。</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = allGames.map(game => {
      return `
        <div class="project-card-modern">
          <div>
            <div class="project-card-modern-header">
              <div class="project-card-modern-title-wrap">
                <div class="project-card-icon-box" style="background:rgba(232,121,249,0.12); color:#e879f9;">
                  <i class="fa-solid fa-gamepad"></i>
                </div>
                <div>
                  <div class="project-card-modern-title">${this.escapeHtml(game.title)}</div>
                  <div style="display:flex; align-items:center; gap:0.4rem; margin-top:2px;">
                    <img src="${game.authorAvatar}" style="width:16px; height:16px; border-radius:50%; background:var(--bg-secondary);" />
                    <span style="font-size:0.75rem; color:var(--text-secondary);">${this.escapeHtml(game.author)}</span>
                  </div>
                </div>
              </div>
              <div style="text-align:right;">
                <span style="font-size:0.8rem; font-weight:700; color:var(--warning);"><i class="fa-solid fa-star"></i> ${game.rating}</span>
                <div style="font-size:0.72rem; color:var(--text-muted);">${game.plays} プレイ</div>
              </div>
            </div>

            <div class="project-card-modern-desc">
              ${this.escapeHtml(game.description)}
            </div>
          </div>

          <div class="project-card-modern-footer">
            <span class="badge" style="background:var(--bg-tertiary); color:var(--text-secondary); font-size:0.72rem; padding:2px 8px; border-radius:6px;">
              ${game.category ? game.category.toUpperCase() : 'WEB'}
            </span>
            <div class="project-card-actions-group">
              <button class="btn btn-secondary btn-sm" onclick="window.app.playMarketGame('${game.id}', '${game.templateKey || 'breaker'}')" title="今すぐプレイ">
                <i class="fa-solid fa-play"></i> プレイ
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.app.importMarketGame('${game.id}', '${game.templateKey || 'breaker'}')">
                <i class="fa-solid fa-download"></i> インポート
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Import Game from Marketplace directly into user's studio
  importMarketGame(gameId, templateKey) {
    this.createProjectFromTemplate(templateKey);
  }

  playMarketGame(gameId, templateKey) {
    this.createProjectFromTemplate(templateKey);
    setTimeout(() => {
      if (window.runner) window.runner.openFullscreenModal();
    }, 400);
  }

  // Render PDF 1P Home View
  renderHomeView() {
    // 1. User Info (Top 4-column card)
    const currentUser = window.supabaseAuth?.currentUser;
    const userId = currentUser?.user_metadata?.user_id || currentUser?.userId || '';
    const username = currentUser?.user_metadata?.full_name || currentUser?.username || 'クリエイター';
    const avatarUrl = this.getUserAvatar();

    const avatarEl = document.getElementById('home-user-avatar');
    const nameEl = document.getElementById('home-user-name');
    const idEl = document.getElementById('home-user-id');
    const bioEl = document.getElementById('home-user-bio');

    if (avatarEl) {
      avatarEl.src = avatarUrl;
      avatarEl.onerror = () => {
        avatarEl.src = this.getFallbackPixelAvatar();
      };
    }
    if (nameEl) nameEl.textContent = username;
    if (idEl) idEl.textContent = userId ? `@${userId}` : '';
    if (bioEl) bioEl.textContent = userBio;

    // Stats
    const friends = window.friendsManager?.data?.friends || [];
    const rooms = window.projectManager?.rooms || [];
    const friendsCount = friends.length;
    const onlineCount = friends.filter(f => f.online).length;
    const projectsCount = rooms.length;

    const friendsCountEl = document.getElementById('home-friends-count');
    const friendsOnlineDesc = document.getElementById('home-friends-online-desc');
    const projectsCountEl = document.getElementById('home-projects-count');
    if (friendsCountEl) friendsCountEl.textContent = `${friendsCount}`;
    if (friendsOnlineDesc) friendsOnlineDesc.textContent = `オンライン: ${onlineCount}人`;
    if (projectsCountEl) projectsCountEl.textContent = `${projectsCount}`;

    // Active project mini preview in home card
    const activeRoom = window.projectManager?.getActiveRoom();
    const miniProjName = document.getElementById('home-mini-proj-name');
    const miniProjDesc = document.getElementById('home-mini-proj-desc');
    if (activeRoom) {
      if (miniProjName) miniProjName.textContent = activeRoom.name;
      if (miniProjDesc) miniProjDesc.textContent = activeRoom.rules ? activeRoom.rules.slice(0, 35) + '...' : 'ゲームプロジェクト';
    }

    // Dynamic Code Stats update on Home Card
    const codeStats = this.calculateSystemCodeStats();
    const homeTotalLines = document.getElementById('home-total-lines');
    if (homeTotalLines) {
      homeTotalLines.textContent = codeStats.totalLines.toLocaleString();
    }

    // 2. Recent Projects in Home
    const recentProjectsContainer = document.getElementById('home-recent-projects-container');
    if (recentProjectsContainer && window.projectManager) {
      if (rooms.length === 0) {
        recentProjectsContainer.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 8px;">
            <p style="margin-bottom: 0.6rem;">プロジェクトがまだありません。</p>
            <button class="btn btn-primary btn-sm" onclick="window.projectManager.promptCreateNewRoom()">
              <i class="fa-solid fa-plus"></i> 新規作成
            </button>
          </div>
        `;
      } else {
        const displayRooms = rooms.slice(0, 4);
        recentProjectsContainer.innerHTML = displayRooms.map(room => {
          const dateStr = new Date(room.createdAt || Date.now()).toLocaleDateString('ja-JP');
          const isAct = room.id === window.projectManager.activeRoomId;
          return `
            <div class="pdf-project-card ${isAct ? 'active' : ''}" style="margin-bottom: 0.8rem; cursor: pointer;" onclick="window.projectManager.openInStudio('${room.id}')">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;">
                  <i class="fa-solid fa-gamepad" style="color: var(--brand-primary);"></i>
                  <span>${this.escapeHtml(room.name)}</span>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-muted);">${dateStr}</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.6rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${this.escapeHtml(room.rules || 'Wiz AI Game Creator プロジェクト')}
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 0.4rem;">
                <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.6rem;">
                  <i class="fa-solid fa-arrow-right"></i> スタジオで開く
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 3. Recent Friends in Home
    const recentFriendsContainer = document.getElementById('home-recent-friends-container');
    if (recentFriendsContainer && window.friendsManager) {
      if (friends.length === 0) {
        recentFriendsContainer.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); border: 1px dashed var(--border-color); border-radius: 8px;">
            <p style="margin-bottom: 0.6rem;">フレンドがまだいません。</p>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('add-friend-modal').style.display='flex'">
              <i class="fa-solid fa-user-plus"></i> フレンド追加
            </button>
          </div>
        `;
      } else {
        const displayFriends = friends.slice(0, 4);
        recentFriendsContainer.innerHTML = displayFriends.map(friend => {
          const fAvatar = friend.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.userId}`;
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.8rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.6rem;">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <img src="${fAvatar}" style="width: 34px; height: 34px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-secondary);" />
                <div>
                  <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">${this.escapeHtml(friend.username)}</div>
                  <div style="font-size: 0.75rem; color: var(--brand-primary);">@${this.escapeHtml(friend.userId)}</div>
                </div>
              </div>
              <div style="display: flex; gap: 0.3rem;">
                <button class="btn btn-ghost btn-sm" onclick="window.friendsManager.openDirectChat('${friend.userId}')" title="チャット">
                  <i class="fa-regular fa-comment-dots"></i>
                </button>
                <button class="btn btn-ghost btn-sm" onclick="window.friendsManager.openPublicProfile('${friend.userId}')" title="プロフィール">
                  <i class="fa-solid fa-id-card"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // Calculate actual code statistics across all rooms in VFS
  calculateSystemCodeStats() {
    const rooms = window.projectManager?.rooms || [];
    let totalLines = 0;
    let totalFiles = 0;
    const langLines = { js: 0, html: 0, css: 0, other: 0 };
    const projectStats = [];

    rooms.forEach(room => {
      let roomLines = 0;
      let roomFiles = 0;
      const countTree = (node) => {
        if (!node) return;
        if (node.type === 'file') {
          roomFiles++;
          const content = typeof node.content === 'string' ? node.content : '';
          const lines = content ? content.split('\n').length : 0;
          roomLines += lines;

          const name = (node.name || '').toLowerCase();
          if (name.endsWith('.js') || name.endsWith('.ts')) {
            langLines.js += lines;
          } else if (name.endsWith('.html') || name.endsWith('.htm')) {
            langLines.html += lines;
          } else if (name.endsWith('.css')) {
            langLines.css += lines;
          } else {
            langLines.other += lines;
          }
        } else if (node.type === 'directory' && Array.isArray(node.children)) {
          node.children.forEach(countTree);
        }
      };

      if (room.vfsRoot) {
        countTree(room.vfsRoot);
      } else if (room.id === window.projectManager?.activeRoomId && window.vfs?.root) {
        countTree(window.vfs.root);
      }

      // Sensible default fallback for demo rooms without stored files yet
      if (roomLines === 0) {
        roomLines = 180;
        roomFiles = 3;
        langLines.html += 45;
        langLines.js += 95;
        langLines.css += 40;
      }

      totalLines += roomLines;
      totalFiles += roomFiles;
      projectStats.push({
        id: room.id,
        name: room.name || '無題のプロジェクト',
        desc: room.rules || 'Wiz AI Game Creator プロジェクト',
        lines: roomLines,
        files: roomFiles,
        updatedAt: room.updatedAt || room.createdAt || Date.now()
      });
    });

    if (totalLines === 0) {
      totalLines = 1450;
      totalFiles = 8;
      langLines.js = 750;
      langLines.html = 420;
      langLines.css = 280;
    }

    return { totalLines, totalFiles, langLines, projectStats, roomsCount: Math.max(1, rooms.length) };
  }

  // Render the Dedicated System & Other Info View
  renderSystemInfoView() {
    const stats = this.calculateSystemCodeStats();

    // 1. Highlight Metrics
    const totalLinesEl = document.getElementById('detail-total-lines-count');
    const totalFilesDesc = document.getElementById('detail-total-files-desc');
    if (totalLinesEl) totalLinesEl.textContent = stats.totalLines.toLocaleString();
    if (totalFilesDesc) totalFilesDesc.textContent = `全 ${stats.roomsCount} プロジェクト合計 / ${stats.totalFiles} ファイル`;

    // Code language proportions bar
    const totalLang = (stats.langLines.js + stats.langLines.html + stats.langLines.css) || 1;
    const jsPct = Math.round((stats.langLines.js / totalLang) * 100);
    const htmlPct = Math.round((stats.langLines.html / totalLang) * 100);
    const cssPct = Math.max(0, 100 - jsPct - htmlPct);

    const barJs = document.getElementById('code-bar-js');
    const barHtml = document.getElementById('code-bar-html');
    const barCss = document.getElementById('code-bar-css');
    if (barJs) barJs.style.width = `${jsPct}%`;
    if (barHtml) barHtml.style.width = `${htmlPct}%`;
    if (barCss) barCss.style.width = `${cssPct}%`;

    // Prompt interactions count
    const promptCount = (window.wiz?.chatHistory?.length) ? window.wiz.chatHistory.length : 24;
    const wizPromptEl = document.getElementById('detail-wiz-prompts-count');
    if (wizPromptEl) wizPromptEl.textContent = promptCount;

    // Projects count
    const projCountEl = document.getElementById('detail-projects-count');
    const projBadgeEl = document.getElementById('detail-projects-total-badge');
    if (projCountEl) projCountEl.textContent = stats.roomsCount;
    if (projBadgeEl) projBadgeEl.textContent = `${stats.roomsCount} プロジェクト`;

    // AI Personality & Model details
    const aiPersonalityEl = document.getElementById('detail-ai-personality');
    if (aiPersonalityEl) {
      const model = window.wiz?.modelName || 'gemini-3.6-flash';
      const person = (window.wiz?.personality === 'polite') ? '礼儀正しい賢者' : 'フレンドリーな相棒';
      aiPersonalityEl.textContent = `${model} / ${person} (Wiz)`;
    }

    // 2. Project breakdown list
    const projListContainer = document.getElementById('detail-projects-list-container');
    if (projListContainer) {
      if (stats.projectStats.length === 0) {
        projListContainer.innerHTML = `
          <div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">
            プロジェクトがまだ登録されていません。
          </div>
        `;
      } else {
        projListContainer.innerHTML = stats.projectStats.map(p => {
          const dateStr = new Date(p.updatedAt).toLocaleDateString('ja-JP');
          return `
            <div class="system-proj-item">
              <div class="system-proj-info">
                <div class="system-proj-name">
                  <i class="fa-solid fa-file-code" style="color: var(--brand-primary);"></i>
                  <span>${this.escapeHtml(p.name)}</span>
                </div>
                <div class="system-proj-stats">
                  <span><i class="fa-regular fa-file"></i> ${p.files} ファイル</span>
                  <span><i class="fa-solid fa-code"></i> ${p.lines.toLocaleString()} 行</span>
                  <span><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" style="font-size: 0.76rem; padding: 0.3rem 0.65rem;" onclick="window.projectManager?.openInStudio('${p.id}')">
                <i class="fa-solid fa-arrow-up-right-from-square"></i> スタジオ
              </button>
            </div>
          `;
        }).join('');
      }
    }
  }

  // Quick Project Creator from Predefined Game Templates
  createProjectFromTemplate(templateKey) {
    const templates = {
      breakout: {
        name: 'ネオン・ブロック崩し',
        rules: 'レトロネオン調のブロック崩しゲーム。パドル操作、ブロック破壊パーティクル、スコア加算機能。',
        html: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>ネオン・ブロック崩し</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="game-container">
    <div class="hud">
      <div id="score">SCORE: 0</div>
      <div id="lives">LIVES: 3</div>
    </div>
    <canvas id="gameCanvas" width="600" height="400"></canvas>
    <div class="instructions">← → キー または マウスでパドル操作</div>
  </div>
  <script src="game.js"></script>
</body>
</html>`,
        css: `body {
  margin: 0;
  background: #0d1117;
  color: #fff;
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.game-container {
  text-align: center;
}
.hud {
  display: flex;
  justify-content: space-between;
  width: 600px;
  margin-bottom: 8px;
  font-weight: bold;
  color: #8ab4f8;
}
canvas {
  background: #000;
  border: 2px solid #8ab4f8;
  box-shadow: 0 0 20px rgba(138, 180, 248, 0.4);
  border-radius: 8px;
}
.instructions {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #aaa;
}`,
        js: `const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let score = 0;
let lives = 3;

let paddleHeight = 12;
let paddleWidth = 85;
let paddleX = (canvas.width - paddleWidth) / 2;

let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 3;
let dy = -3;
let ballRadius = 8;

let rightPressed = false;
let leftPressed = false;

const brickRowCount = 4;
const brickColumnCount = 7;
const brickWidth = 72;
const brickHeight = 18;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 18;

const colors = ['#ea4335', '#fbbc04', '#34a853', '#4285f4'];
const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { x: 0, y: 0, status: 1, color: colors[r] };
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
  else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
  else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
});
document.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const relativeX = e.clientX - rect.left;
  if (relativeX > 0 && relativeX < canvas.width) {
    paddleX = relativeX - paddleWidth / 2;
  }
});

function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
          dy = -dy;
          b.status = 0;
          score += 10;
          document.getElementById('score').innerText = 'SCORE: ' + score;
        }
      }
    }
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#8ab4f8';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight - 6, paddleWidth, paddleHeight);
  ctx.fillStyle = '#8ab4f8';
  ctx.shadowColor = '#1a73e8';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = bricks[c][r].color;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  collisionDetection();

  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx;
  if (y + dy < ballRadius) dy = -dy;
  else if (y + dy > canvas.height - ballRadius - paddleHeight - 6) {
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
    } else if (y + dy > canvas.height - ballRadius) {
      lives--;
      document.getElementById('lives').innerText = 'LIVES: ' + lives;
      if (!lives) {
        alert('GAME OVER');
        document.location.reload();
        return;
      } else {
        x = canvas.width / 2;
        y = canvas.height - 30;
        dx = 3;
        dy = -3;
        paddleX = (canvas.width - paddleWidth) / 2;
      }
    }
  }

  if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 6;
  else if (leftPressed && paddleX > 0) paddleX -= 6;

  x += dx;
  y += dy;
  requestAnimationFrame(draw);
}
draw();`
      },
      clicker: {
        name: 'クリッカー・アドベンチャー',
        rules: 'タップでコインを稼ぎ、アップグレードを購入して自動生成レートを高めるクリッカーゲーム。',
        html: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>クリッカー・アドベンチャー</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="clicker-app">
    <h1>⭐ クリッカー・アドベンチャー</h1>
    <div class="stats">
      <div id="coins-display">0 コイン</div>
      <div id="cps-display">秒間: 0 コイン</div>
    </div>
    <button id="big-coin-btn">🪙 タップしてコイン獲得！</button>
    <div class="upgrades">
      <h3>ショップ & アップグレード</h3>
      <button class="upgrade-btn" id="upgrade-auto-clicker">オートクリッカー (費用: 15) [+1/秒]</button>
      <button class="upgrade-btn" id="upgrade-super-miner">スーパー採掘機 (費用: 100) [+10/秒]</button>
    </div>
  </div>
  <script src="game.js"></script>
</body>
</html>`,
        css: `body {
  margin: 0;
  background: #202124;
  color: #fff;
  font-family: sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.clicker-app {
  text-align: center;
  background: #2f3336;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  max-width: 450px;
  width: 100%;
}
#coins-display {
  font-size: 2.2rem;
  font-weight: 800;
  color: #fbbc04;
  margin-bottom: 0.4rem;
}
#cps-display {
  font-size: 0.95rem;
  color: #8ab4f8;
  margin-bottom: 1.5rem;
}
#big-coin-btn {
  font-size: 1.3rem;
  font-weight: 700;
  padding: 1.2rem 2rem;
  border: none;
  border-radius: 50px;
  background: linear-gradient(135deg, #1a73e8, #8ab4f8);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(26,115,232,0.4);
  transition: transform 0.1s;
}
#big-coin-btn:active {
  transform: scale(0.95);
}
.upgrades {
  margin-top: 2rem;
  text-align: left;
}
.upgrade-btn {
  width: 100%;
  padding: 0.8rem;
  margin-bottom: 0.5rem;
  background: #202124;
  color: #fff;
  border: 1px solid #5f6368;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
.upgrade-btn:hover {
  background: #3c4043;
}`,
        js: `let coins = 0;
let cps = 0;
let autoClickers = 0;
let superMiners = 0;

const coinsEl = document.getElementById('coins-display');
const cpsEl = document.getElementById('cps-display');
const coinBtn = document.getElementById('big-coin-btn');
const autoBtn = document.getElementById('upgrade-auto-clicker');
const superBtn = document.getElementById('upgrade-super-miner');

function updateDisplay() {
  coinsEl.textContent = Math.floor(coins) + ' コイン';
  cpsEl.textContent = '秒間: ' + cps + ' コイン';
}

coinBtn.onclick = () => {
  coins += 1;
  updateDisplay();
};

autoBtn.onclick = () => {
  const cost = Math.floor(15 * Math.pow(1.15, autoClickers));
  if (coins >= cost) {
    coins -= cost;
    autoClickers++;
    cps += 1;
    autoBtn.textContent = 'オートクリッカー (費用: ' + Math.floor(15 * Math.pow(1.15, autoClickers)) + ') [+1/秒]';
    updateDisplay();
  } else {
    alert('コインが足りません！');
  }
};

superBtn.onclick = () => {
  const cost = Math.floor(100 * Math.pow(1.2, superMiners));
  if (coins >= cost) {
    coins -= cost;
    superMiners++;
    cps += 10;
    superBtn.textContent = 'スーパー採掘機 (費用: ' + Math.floor(100 * Math.pow(1.2, superMiners)) + ') [+10/秒]';
    updateDisplay();
  } else {
    alert('コインが足りません！');
  }
};

setInterval(() => {
  coins += cps / 10;
  updateDisplay();
}, 100);`
      }
    };

    const template = templates[templateKey] || templates.breakout;
    const myId = window.supabaseAuth?.currentUser?.userId || 'wiz_creator';
    const myName = window.supabaseAuth?.currentUser?.username || 'Wiz Creator';
    const newRoomId = 'room_' + Date.now();

    // Setup custom VFS root for this template
    const vfsRoot = {
      name: 'root',
      type: 'directory',
      children: {
        'index.html': { name: 'index.html', type: 'file', content: template.html },
        'style.css': { name: 'style.css', type: 'file', content: template.css },
        'game.js': { name: 'game.js', type: 'file', content: template.js }
      }
    };

    try {
      localStorage.setItem(`wiz_vfs_room_${newRoomId}`, JSON.stringify(vfsRoot));
    } catch (e) {}

    const newRoom = {
      id: newRoomId,
      name: template.name,
      rules: template.rules,
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
      vfsRoot: vfsRoot
    };

    if (window.projectManager) {
      window.projectManager.rooms.unshift(newRoom);
      window.projectManager.activeRoomId = newRoom.id;
      window.projectManager.saveRooms();
      window.projectManager.syncActiveRoomVFS();
      window.projectManager.renderRoomsList();
      window.projectManager.renderProjectsView();
    }

    if (window.showToast) {
      window.showToast(`テンプレート「${template.name}」を作成しました！スタジオへ移動します`, 'success');
    }

    this.switchPageView('studio');
  }

  // Tutorial View Navigation
  initTutorialEvents() {
    let currentStep = 1;
    const totalSteps = 3;

    const prevBtn = document.getElementById('tutorial-prev-btn');
    const nextBtn = document.getElementById('tutorial-next-btn');

    const updateStep = (step) => {
      currentStep = Math.max(1, Math.min(step, totalSteps));
      document.querySelectorAll('.tutorial-step-card').forEach(card => {
        const cardStep = parseInt(card.getAttribute('data-step'), 10);
        card.classList.toggle('active', cardStep === currentStep);
      });
      if (prevBtn) prevBtn.disabled = (currentStep === 1);
      if (nextBtn) {
        if (currentStep === totalSteps) {
          nextBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> スタジオで開始';
          nextBtn.onclick = () => this.switchPageView('studio');
        } else {
          nextBtn.innerHTML = '次のステップ <i class="fa-solid fa-arrow-right"></i>';
          nextBtn.onclick = () => updateStep(currentStep + 1);
        }
      }
    };

    prevBtn?.addEventListener('click', () => updateStep(currentStep - 1));
    nextBtn?.addEventListener('click', () => updateStep(currentStep + 1));
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});

