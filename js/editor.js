/**
 * Wiz AI Game Creator - Code Editor & File Explorer (Ultra Edition)
 * Features:
 * - Single file downloads from tree and editor bar
 * - Selection right-click context menu (Cut, Copy, Paste, Ask Wiz)
 * - Tab management, syntax highlighting, line numbers, and tree navigation
 */

class CodeEditorManager {
  constructor() {
    this.openTabs = ['index.html'];
    this.activeFile = 'index.html';
    this.isDirty = false;

    // DOM Elements
    this.treeContainer = document.getElementById('file-tree-container');
    this.tabsBar = document.getElementById('editor-tabs-bar');
    this.textarea = document.getElementById('code-textarea');
    this.lineNumbers = document.getElementById('editor-line-numbers');
    this.highlightLayer = document.getElementById('highlight-layer');
    this.highlightCode = document.getElementById('highlight-code');
    this.activeFileNameEl = document.getElementById('active-file-name');
    this.activeFileIconEl = document.getElementById('active-file-icon');
    this.dirtyDot = document.getElementById('file-dirty-dot');
    this.cursorPosEl = document.getElementById('cursor-position-info');
    this.syntaxBadge = document.getElementById('file-syntax-badge');
    this.aiBadge = document.getElementById('ai-editing-indicator');
    this.downloadCurrentFileBtn = document.getElementById('download-current-file-btn');
    this.contextMenu = document.getElementById('code-context-menu');

    this.initEvents();
    this.initContextMenu();
    this.renderTree();
    this.openFile('index.html');

    // Subscribe to VFS modifications
    window.vfs.onChange(() => {
      this.renderTree();
      this.renderTabs();
      if (this.activeFile) {
        const content = window.vfs.readFile(this.activeFile);
        if (content !== null && content !== this.textarea.value) {
          this.loadFileContent(this.activeFile, content);
        }
      }
    });
  }

  initEvents() {
    // Textarea input
    this.textarea.addEventListener('input', () => {
      this.updateLineNumbers();
      this.updateHighlighting();
      this.setDirty(true);
      window.vfs.createFile(this.activeFile, this.textarea.value);
    });

    // Sync scrolling
    this.textarea.addEventListener('scroll', () => {
      this.highlightLayer.scrollTop = this.textarea.scrollTop;
      this.highlightLayer.scrollLeft = this.textarea.scrollLeft;
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    });

    // Track cursor
    this.textarea.addEventListener('keyup', () => this.updateCursorPos());
    this.textarea.addEventListener('click', () => {
      this.updateCursorPos();
      this.hideContextMenu();
    });

    // Tab indentation
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '  ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 2;
        this.updateLineNumbers();
        this.updateHighlighting();
        window.vfs.createFile(this.activeFile, this.textarea.value);
      }
    });

    // Save
    document.getElementById('save-file-btn')?.addEventListener('click', () => this.saveCurrentFile());
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveCurrentFile();
      }
    });

    // Single File Download Button in editor bar
    this.downloadCurrentFileBtn?.addEventListener('click', () => {
      if (this.activeFile) {
        window.vfs.downloadSingleFile(this.activeFile);
      }
    });

    // Explorer Buttons
    document.getElementById('btn-add-file')?.addEventListener('click', () => this.promptCreateFile());
    document.getElementById('new-file-quick-btn')?.addEventListener('click', () => this.promptCreateFile());
    document.getElementById('btn-add-folder')?.addEventListener('click', () => this.promptCreateFolder());
    document.getElementById('new-folder-quick-btn')?.addEventListener('click', () => this.promptCreateFolder());
    document.getElementById('btn-refresh-tree')?.addEventListener('click', () => this.renderTree());
  }

  // Right-Click Context Menu (Cut, Copy, Paste, Ask)
  initContextMenu() {
    if (!this.contextMenu) return;

    // Show on contextmenu on textarea
    this.textarea.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const x = Math.min(e.clientX, window.innerWidth - 190);
      const y = Math.min(e.clientY, window.innerHeight - 170);

      this.contextMenu.style.left = `${x}px`;
      this.contextMenu.style.top = `${y}px`;
      this.contextMenu.style.display = 'flex';
    });

    // Close when clicking outside
    window.addEventListener('click', (e) => {
      if (!this.contextMenu.contains(e.target)) {
        this.hideContextMenu();
      }
    });

    // Context Menu Actions
    document.getElementById('ctx-cut-btn')?.addEventListener('click', () => this.handleContextCut());
    document.getElementById('ctx-copy-btn')?.addEventListener('click', () => this.handleContextCopy());
    document.getElementById('ctx-paste-btn')?.addEventListener('click', () => this.handleContextPaste());
    document.getElementById('ctx-ask-btn')?.addEventListener('click', () => this.handleContextAsk());
  }

  hideContextMenu() {
    if (this.contextMenu) {
      this.contextMenu.style.display = 'none';
    }
  }

  getSelectedText() {
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    return this.textarea.value.substring(start, end);
  }

  async handleContextCut() {
    this.hideContextMenu();
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    const selected = this.textarea.value.substring(start, end);

    if (selected) {
      await navigator.clipboard.writeText(selected);
      this.textarea.value = this.textarea.value.substring(0, start) + this.textarea.value.substring(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start;
      this.updateLineNumbers();
      this.updateHighlighting();
      window.vfs.createFile(this.activeFile, this.textarea.value);
      window.showToast('選択範囲をカットしました', 'info');
    } else {
      window.showToast('範囲が選択されていません', 'warning');
    }
  }

  async handleContextCopy() {
    this.hideContextMenu();
    const selected = this.getSelectedText();
    if (selected) {
      await navigator.clipboard.writeText(selected);
      window.showToast('選択範囲をコピーしました！', 'success');
    } else {
      window.showToast('範囲が選択されていません', 'warning');
    }
  }

  async handleContextPaste() {
    this.hideContextMenu();
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + text + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + text.length;
        this.updateLineNumbers();
        this.updateHighlighting();
        window.vfs.createFile(this.activeFile, this.textarea.value);
        window.showToast('貼り付けました', 'info');
      }
    } catch (e) {
      window.showToast('クリップボードの読み取りを許可してください', 'warning');
    }
  }

  handleContextAsk() {
    this.hideContextMenu();
    const selected = this.getSelectedText();
    const ext = this.getFileExtension(this.activeFile) || 'code';

    if (selected) {
      const prompt = `このコード（${this.activeFile}）について質問です：\n\`\`\`${ext}\n${selected}\n\`\`\`\nこの部分は何をしているのか、わかりやすく解説して！`;
      const chatInput = document.getElementById('chat-user-input');
      if (chatInput) {
        chatInput.value = prompt;
        chatInput.focus();
        if (window.app) {
          window.app.handleSendMessage();
        }
      }
    } else {
      window.showToast('解説してほしいコードを範囲選択してから「質問」を押してね！', 'info');
    }
  }

  setDirty(val) {
    this.isDirty = val;
    if (this.dirtyDot) {
      this.dirtyDot.style.display = val ? 'inline-block' : 'none';
    }
  }

  saveCurrentFile() {
    if (this.activeFile) {
      window.vfs.createFile(this.activeFile, this.textarea.value);
      this.setDirty(false);
      window.showToast(`${this.activeFile} を保存しました`, 'success');
    }
  }

  showAiEditing(isEditing = true) {
    if (this.aiBadge) {
      this.aiBadge.style.display = isEditing ? 'flex' : 'none';
    }
  }

  // Open file in editor
  openFile(filePath) {
    const clean = window.vfs.normalizePath(filePath);
    if (!window.vfs.exists(clean)) return;

    if (!this.openTabs.includes(clean)) {
      this.openTabs.push(clean);
    }
    this.activeFile = clean;
    const content = window.vfs.readFile(clean) || '';
    this.loadFileContent(clean, content);
    this.renderTabs();
    this.renderTree();
  }

  loadFileContent(filePath, content) {
    this.textarea.value = content;
    this.activeFileNameEl.textContent = filePath.split('/').pop();
    this.updateFileIcon(filePath);
    this.updateSyntaxBadge(filePath);
    this.updateLineNumbers();
    this.updateHighlighting();
    this.updateCursorPos();
    this.setDirty(false);
  }

  closeTab(filePath, e) {
    if (e) e.stopPropagation();
    this.openTabs = this.openTabs.filter(t => t !== filePath);
    if (this.activeFile === filePath) {
      if (this.openTabs.length > 0) {
        this.openFile(this.openTabs[this.openTabs.length - 1]);
      } else {
        this.activeFile = null;
        this.textarea.value = '';
        this.activeFileNameEl.textContent = 'ファイルなし';
        this.updateLineNumbers();
        this.updateHighlighting();
      }
    }
    this.renderTabs();
  }

  renderTabs() {
    if (!this.tabsBar) return;
    this.tabsBar.innerHTML = '';
    this.openTabs.forEach(filePath => {
      const tab = document.createElement('div');
      tab.className = `editor-tab ${filePath === this.activeFile ? 'active' : ''}`;
      
      const icon = document.createElement('i');
      icon.className = this.getIconClassForFile(filePath);
      tab.appendChild(icon);

      const label = document.createElement('span');
      label.textContent = filePath.split('/').pop();
      tab.appendChild(label);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close-btn';
      closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      closeBtn.onclick = (e) => this.closeTab(filePath, e);
      tab.appendChild(closeBtn);

      tab.onclick = () => this.openFile(filePath);
      this.tabsBar.appendChild(tab);
    });
  }

  updateLineNumbers() {
    const lines = this.textarea.value.split('\n').length;
    let nums = '';
    for (let i = 1; i <= lines; i++) {
      nums += i + '\n';
    }
    this.lineNumbers.textContent = nums;
  }

  updateHighlighting() {
    const ext = this.getFileExtension(this.activeFile);
    let lang = 'html';
    if (ext === 'js') lang = 'javascript';
    else if (ext === 'css') lang = 'css';
    else if (ext === 'py') lang = 'python';
    else if (ext === 'cpp' || ext === 'hpp') lang = 'cpp';
    else if (ext === 'json') lang = 'javascript';

    this.highlightCode.className = `language-${lang}`;
    this.highlightCode.textContent = this.textarea.value;

    if (window.Prism) {
      Prism.highlightElement(this.highlightCode);
    }
  }

  updateCursorPos() {
    const textLines = this.textarea.value.substr(0, this.textarea.selectionStart).split('\n');
    const currentLineNumber = textLines.length;
    const currentColumnIndex = textLines[textLines.length - 1].length + 1;
    if (this.cursorPosEl) {
      this.cursorPosEl.textContent = `行 ${currentLineNumber}, 列 ${currentColumnIndex}`;
    }
  }

  updateSyntaxBadge(filePath) {
    const ext = this.getFileExtension(filePath).toUpperCase() || 'TXT';
    if (this.syntaxBadge) {
      this.syntaxBadge.textContent = ext;
    }
  }

  updateFileIcon(filePath) {
    if (!this.activeFileIconEl) return;
    this.activeFileIconEl.className = this.getIconClassForFile(filePath);
  }

  getFileExtension(filePath) {
    if (!filePath) return '';
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  getIconClassForFile(filePath) {
    const ext = this.getFileExtension(filePath);
    switch (ext) {
      case 'html': return 'fa-brands fa-html5 node-icon';
      case 'css': return 'fa-brands fa-css3-alt node-icon';
      case 'js': return 'fa-brands fa-js node-icon';
      case 'py': return 'fa-brands fa-python node-icon';
      case 'cpp':
      case 'hpp':
      case 'c': return 'fa-solid fa-code node-icon';
      case 'json': return 'fa-solid fa-brackets-curly node-icon';
      case 'md': return 'fa-solid fa-file-lines node-icon';
      default: return 'fa-regular fa-file-code node-icon';
    }
  }

  // Render File Explorer Tree (With individual download buttons!)
  renderTree() {
    if (!this.treeContainer) return;
    this.treeContainer.innerHTML = '';
    this.buildTreeNodes(window.vfs.root, '', this.treeContainer);
  }

  buildTreeNodes(node, currentPath, container) {
    if (!node || !node.children) return;

    const entries = Object.entries(node.children).sort((a, b) => {
      if (a[1].type === b[1].type) return a[0].localeCompare(b[0]);
      return a[1].type === 'dir' ? -1 : 1;
    });

    entries.forEach(([name, item]) => {
      const fullPath = currentPath ? `${currentPath}/${name}` : name;
      const nodeRow = document.createElement('div');
      nodeRow.className = `tree-node ${item.type === 'dir' ? 'is-dir' : ''} ${fullPath === this.activeFile ? 'active' : ''}`;

      if (item.type === 'dir') {
        nodeRow.innerHTML = `
          <i class="fa-regular fa-folder node-icon"></i>
          <span class="node-name">${name}</span>
          <div class="node-actions">
            <button title="ファイル追加" class="add-file-btn"><i class="fa-solid fa-plus"></i></button>
            <button title="削除" class="delete-btn"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        `;
        const childrenBox = document.createElement('div');
        childrenBox.className = 'dir-children';
        this.buildTreeNodes(item, fullPath, childrenBox);

        nodeRow.querySelector('.node-name').onclick = () => {
          const isHidden = childrenBox.style.display === 'none';
          childrenBox.style.display = isHidden ? 'block' : 'none';
          const icon = nodeRow.querySelector('.node-icon');
          icon.className = isHidden ? 'fa-regular fa-folder-open node-icon' : 'fa-regular fa-folder node-icon';
        };

        nodeRow.querySelector('.add-file-btn').onclick = (e) => {
          e.stopPropagation();
          this.promptCreateFile(fullPath);
        };

        nodeRow.querySelector('.delete-btn').onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.showConfirm(`フォルダ "${fullPath}" とその中身を削除しますか？`, 'フォルダの削除');
          if (ok) {
            window.vfs.delete(fullPath);
            window.showToast(`フォルダ "${fullPath}" を削除しました`, 'info');
          }
        };

        container.appendChild(nodeRow);
        container.appendChild(childrenBox);

      } else {
        nodeRow.innerHTML = `
          <i class="${this.getIconClassForFile(name)}"></i>
          <span class="node-name">${name}</span>
          <div class="node-actions">
            <button title="個別にダウンロード" class="download-btn"><i class="fa-solid fa-download"></i></button>
            <button title="リネーム" class="rename-btn"><i class="fa-solid fa-pen"></i></button>
            <button title="削除" class="delete-btn"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        `;

        nodeRow.onclick = () => this.openFile(fullPath);

        // Single file download from tree
        nodeRow.querySelector('.download-btn').onclick = (e) => {
          e.stopPropagation();
          window.vfs.downloadSingleFile(fullPath);
        };

        nodeRow.querySelector('.rename-btn').onclick = async (e) => {
          e.stopPropagation();
          const newName = await window.showPrompt('新しいファイル名を入力してください:', name, 'ファイル名のリネーム');
          if (newName && newName !== name) {
            window.vfs.rename(fullPath, newName);
            window.showToast(`ファイル名を "${newName}" に変更しました`, 'success');
          }
        };

        nodeRow.querySelector('.delete-btn').onclick = async (e) => {
          e.stopPropagation();
          const ok = await window.showConfirm(`ファイル "${fullPath}" を削除しますか？`, 'ファイルの削除');
          if (ok) {
            window.vfs.delete(fullPath);
            this.closeTab(fullPath);
            window.showToast(`ファイル "${fullPath}" を削除しました`, 'info');
          }
        };

        container.appendChild(nodeRow);
      }
    });
  }

  async promptCreateFile(baseDir = '') {
    const filename = await window.showPrompt('作成するファイル名を入力してください (例: main.js, player.py):', '', '新規ファイル作成');
    if (!filename) return;
    const targetPath = baseDir ? `${baseDir}/${filename}` : filename;
    if (window.vfs.exists(targetPath)) {
      window.showToast('同名のファイルが既に存在します。', 'warning');
      return;
    }
    window.vfs.createFile(targetPath, '');
    this.openFile(targetPath);
    window.showToast(`ファイル "${targetPath}" を作成しました`, 'success');
  }

  async promptCreateFolder(baseDir = '') {
    const folderName = await window.showPrompt('作成するフォルダ名を入力してください (例: sounds, assets):', '', '新規フォルダ作成');
    if (!folderName) return;
    const targetPath = baseDir ? `${baseDir}/${folderName}` : folderName;
    window.vfs.createDir(targetPath);
    window.showToast(`フォルダ "${targetPath}" を作成しました`, 'success');
  }
}

window.editor = new CodeEditorManager();
