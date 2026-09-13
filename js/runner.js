/**
 * Wiz AI Game Creator - Game & Script Runner (Ultra Edition)
 * Supports:
 * - Panel Inline Execution & Fullscreen Modal Execution
 * - Pyodide Python execution
 * - Error detection for Auto-Debug Mode
 * - Automated click & screenshot captures
 */

class ProgramRunner {
  constructor() {
    this.pyodide = null;
    this.isPyodideLoading = false;
    this.activeRunTarget = 'index.html';
    this.errorCount = 0;
    this.lastAutoDebugTime = 0;
    
    // Modal DOM
    this.modal = document.getElementById('preview-modal-overlay');
    this.modalIframe = document.getElementById('preview-iframe');
    this.modalIframeWrapper = document.getElementById('preview-iframe-wrapper');
    this.modalPythonWrapper = document.getElementById('preview-python-wrapper');
    this.modalPythonOutput = document.getElementById('python-output');
    this.modalPyStatus = document.getElementById('pyodide-status');
    this.modalTargetLabel = document.getElementById('preview-target-file');
    this.modalConsoleLogs = document.getElementById('console-drawer-logs');

    // Inline Panel DOM
    this.inlineIframe = document.getElementById('inline-preview-iframe');
    this.inlinePythonWrapper = document.getElementById('inline-python-wrapper');
    this.inlinePythonOutput = document.getElementById('inline-python-output');
    this.inlinePyStatus = document.getElementById('inline-py-status');
    this.inlineTargetLabel = document.getElementById('inline-preview-target');
    this.inlineConsoleLogs = document.getElementById('inline-console-logs');
    this.logCounterBadge = document.getElementById('log-counter-badge');
    
    this.initEvents();
  }

  initEvents() {
    // Listen to iframe logs
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'WIZ_IFRAME_LOG') {
        this.addConsoleLog(e.data.level, e.data.message);
      }
    });

    // Modal controls
    document.getElementById('preview-close-btn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('preview-restart-btn')?.addEventListener('click', () => this.restart());
    document.getElementById('preview-open-tab-btn')?.addEventListener('click', () => this.openInNewTab());
    document.getElementById('clear-console-btn')?.addEventListener('click', () => this.clearConsole());

    // Inline controls
    document.getElementById('inline-preview-restart-btn')?.addEventListener('click', () => this.restart());
    document.getElementById('inline-preview-modal-btn')?.addEventListener('click', () => this.openInModal(this.activeRunTarget));
    document.getElementById('clear-inline-logs-btn')?.addEventListener('click', () => this.clearConsole());

    // ESC to close modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.style.display !== 'none') {
        this.closeModal();
      }
    });
  }

  clearConsole() {
    if (this.modalConsoleLogs) this.modalConsoleLogs.innerHTML = '';
    if (this.inlineConsoleLogs) this.inlineConsoleLogs.innerHTML = '';
    this.errorCount = 0;
    this.updateLogBadge(0);
  }

  updateLogBadge(count) {
    if (!this.logCounterBadge) return;
    if (count > 0) {
      this.logCounterBadge.style.display = 'inline-block';
      this.logCounterBadge.textContent = count;
    } else {
      this.logCounterBadge.style.display = 'none';
    }
  }

  addConsoleLog(level, message) {
    const time = new Date().toLocaleTimeString();

    // Append to modal drawer
    if (this.modalConsoleLogs) {
      const item = document.createElement('div');
      item.className = `log-item ${level}`;
      item.textContent = `[${time}] ${message}`;
      this.modalConsoleLogs.appendChild(item);
      this.modalConsoleLogs.scrollTop = this.modalConsoleLogs.scrollHeight;
    }

    // Append to inline logs pane
    if (this.inlineConsoleLogs) {
      const item = document.createElement('div');
      item.className = `log-item ${level}`;
      item.textContent = `[${time}] ${message}`;
      this.inlineConsoleLogs.appendChild(item);
      this.inlineConsoleLogs.scrollTop = this.inlineConsoleLogs.scrollHeight;
    }

    if (level === 'error') {
      this.errorCount++;
      this.updateLogBadge(this.errorCount);

      // Trigger Auto-Debug Mode if enabled (debounce: max once per 6 seconds)
      const now = Date.now();
      if (window.app?.autoDebugMode && now - this.lastAutoDebugTime > 6000) {
        this.lastAutoDebugTime = now;
        window.app.triggerAutoDebug(this.activeRunTarget, message);
      }
    }
  }

  // Master run dispatcher: respects user setting (panel vs modal)
  run(filePath = 'index.html') {
    this.activeRunTarget = filePath || 'index.html';
    const displayMode = window.app?.previewDisplayMode || 'panel';

    if (displayMode === 'modal') {
      this.openInModal(this.activeRunTarget);
    } else {
      this.openInPanel(this.activeRunTarget);
    }
  }

  restart() {
    this.run(this.activeRunTarget);
  }

  // Run inside right panel pane
  openInPanel(filePath) {
    if (window.app) {
      window.app.expandSidebar();
      window.app.switchRightView('preview');
    }
    if (this.inlineTargetLabel) {
      this.inlineTargetLabel.textContent = filePath;
    }

    if (filePath.endsWith('.py')) {
      this.runPythonInline(filePath);
    } else {
      this.runHtmlInline(filePath);
    }
  }

  runHtmlInline(filePath) {
    if (this.inlinePythonWrapper) this.inlinePythonWrapper.style.display = 'none';
    if (this.inlineIframe) {
      this.inlineIframe.style.display = 'block';
      this.addConsoleLog('info', `HTMLプログラム [${filePath}] をパネル内で起動しています...`);
      const bundle = window.vfs.buildHtmlBundle(filePath);
      this.inlineIframe.srcdoc = bundle;
    }
  }

  async runPythonInline(filePath) {
    if (this.inlineIframe) this.inlineIframe.style.display = 'none';
    if (this.inlinePythonWrapper) {
      this.inlinePythonWrapper.style.display = 'flex';
      this.inlinePythonOutput.textContent = '';
    }

    const code = window.vfs.readFile(filePath);
    if (!code) {
      if (this.inlinePythonOutput) this.inlinePythonOutput.textContent = `エラー: ${filePath} の内容を読み込めませんでした。`;
      return;
    }

    if (!this.pyodide) {
      if (this.inlinePyStatus) this.inlinePyStatus.textContent = 'Pyodide ランタイム読み込み中...';
      try {
        await this.loadPyodideScript();
        this.pyodide = await window.loadPyodide();
        if (this.inlinePyStatus) this.inlinePyStatus.textContent = 'Pyodide 準備完了';
      } catch (err) {
        if (this.inlinePyStatus) this.inlinePyStatus.textContent = '読み込み失敗';
        if (this.inlinePythonOutput) this.inlinePythonOutput.textContent = `Python環境の初期化に失敗しました:\n${err.message}`;
        return;
      }
    }

    if (this.inlinePyStatus) this.inlinePyStatus.textContent = '実行中...';
    let outputBuffer = '';

    this.pyodide.setStdout({
      batched: (text) => {
        outputBuffer += text + '\n';
        if (this.inlinePythonOutput) this.inlinePythonOutput.textContent = outputBuffer;
        this.addConsoleLog('info', text);
      }
    });

    this.pyodide.setStderr({
      batched: (text) => {
        outputBuffer += '[Error] ' + text + '\n';
        if (this.inlinePythonOutput) this.inlinePythonOutput.textContent = outputBuffer;
        this.addConsoleLog('error', text);
      }
    });

    try {
      await this.pyodide.runPythonAsync(code);
      if (this.inlinePyStatus) this.inlinePyStatus.textContent = '実行完了 (0)';
    } catch (e) {
      outputBuffer += `\nTraceback (most recent call last):\n${e.message}`;
      if (this.inlinePythonOutput) this.inlinePythonOutput.textContent = outputBuffer;
      if (this.inlinePyStatus) this.inlinePyStatus.textContent = 'エラー終了';
      this.addConsoleLog('error', e.message);
    }
  }

  // Run inside fullscreen modal
  openInModal(filePath) {
    if (this.modalTargetLabel) {
      this.modalTargetLabel.textContent = filePath;
    }
    if (this.modal) {
      this.modal.style.display = 'flex';
    }

    if (filePath.endsWith('.py')) {
      this.runPythonModal(filePath);
    } else {
      this.runHtmlModal(filePath);
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
    if (this.modalIframe) {
      this.modalIframe.srcdoc = '';
    }
  }

  runHtmlModal(filePath) {
    if (this.modalPythonWrapper) this.modalPythonWrapper.style.display = 'none';
    if (this.modalIframeWrapper) this.modalIframeWrapper.style.display = 'block';

    this.addConsoleLog('info', `HTMLプログラム [${filePath}] を全画面モーダルで起動しています...`);
    const bundle = window.vfs.buildHtmlBundle(filePath);
    if (this.modalIframe) {
      this.modalIframe.srcdoc = bundle;
    }
  }

  async runPythonModal(filePath) {
    if (this.modalIframeWrapper) this.modalIframeWrapper.style.display = 'none';
    if (this.modalPythonWrapper) this.modalPythonWrapper.style.display = 'flex';
    if (this.modalPythonOutput) this.modalPythonOutput.textContent = '';

    const code = window.vfs.readFile(filePath);
    if (!code) {
      if (this.modalPythonOutput) this.modalPythonOutput.textContent = `エラー: ${filePath} の内容を読み込めませんでした。`;
      return;
    }

    if (!this.pyodide) {
      if (this.modalPyStatus) this.modalPyStatus.textContent = 'Pyodide ランタイム読み込み中...';
      try {
        await this.loadPyodideScript();
        this.pyodide = await window.loadPyodide();
        if (this.modalPyStatus) this.modalPyStatus.textContent = 'Pyodide 準備完了';
      } catch (err) {
        if (this.modalPyStatus) this.modalPyStatus.textContent = '読み込み失敗';
        if (this.modalPythonOutput) this.modalPythonOutput.textContent = `Python環境の初期化に失敗しました:\n${err.message}`;
        return;
      }
    }

    if (this.modalPyStatus) this.modalPyStatus.textContent = '実行中...';
    let outputBuffer = '';

    this.pyodide.setStdout({
      batched: (text) => {
        outputBuffer += text + '\n';
        if (this.modalPythonOutput) this.modalPythonOutput.textContent = outputBuffer;
        this.addConsoleLog('info', text);
      }
    });

    this.pyodide.setStderr({
      batched: (text) => {
        outputBuffer += '[Error] ' + text + '\n';
        if (this.modalPythonOutput) this.modalPythonOutput.textContent = outputBuffer;
        this.addConsoleLog('error', text);
      }
    });

    try {
      await this.pyodide.runPythonAsync(code);
      if (this.modalPyStatus) this.modalPyStatus.textContent = '実行完了 (0)';
    } catch (e) {
      outputBuffer += `\nTraceback (most recent call last):\n${e.message}`;
      if (this.modalPythonOutput) this.modalPythonOutput.textContent = outputBuffer;
      if (this.modalPyStatus) this.modalPyStatus.textContent = 'エラー終了';
      this.addConsoleLog('error', e.message);
    }
  }

  loadPyodideScript() {
    return new Promise((resolve, reject) => {
      if (window.loadPyodide) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error('Pyodide CDNスクリプトのロードに失敗しました'));
      document.head.appendChild(script);
    });
  }

  openInNewTab() {
    if (this.activeRunTarget.endsWith('.py')) {
      window.showToast('Pythonスクリプトはプレビュー内コンソールでのみ実行可能です。', 'warning');
      return;
    }
    const htmlBundle = window.vfs.buildHtmlBundle(this.activeRunTarget);
    const blob = new Blob([htmlBundle], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  }

  // Headless click & screenshot capture
  async executeAndCapture(filePath = 'index.html', clickSelector = null, waitMs = 1200) {
    return new Promise((resolve, reject) => {
      try {
        const bundle = window.vfs.buildHtmlBundle(filePath);
        const hiddenIframe = document.createElement('iframe');
        hiddenIframe.style.position = 'fixed';
        hiddenIframe.style.top = '-9999px';
        hiddenIframe.style.left = '-9999px';
        hiddenIframe.style.width = '800px';
        hiddenIframe.style.height = '600px';
        hiddenIframe.style.border = 'none';
        hiddenIframe.sandbox = 'allow-scripts allow-same-origin';
        document.body.appendChild(hiddenIframe);

        hiddenIframe.srcdoc = bundle;

        hiddenIframe.onload = async () => {
          try {
            const iframeDoc = hiddenIframe.contentDocument || hiddenIframe.contentWindow.document;

            if (clickSelector) {
              await new Promise(r => setTimeout(r, 400));
              let targetEl = null;

              try {
                targetEl = iframeDoc.querySelector(clickSelector);
              } catch (e) {}

              if (!targetEl) {
                const buttons = iframeDoc.querySelectorAll('button, a, .btn, [role="button"]');
                for (const btn of buttons) {
                  if (btn.textContent.includes(clickSelector) || btn.id.includes(clickSelector)) {
                    targetEl = btn;
                    break;
                  }
                }
              }

              if (targetEl) {
                targetEl.click();
              }
            }

            await new Promise(r => setTimeout(r, waitMs));

            const canvas = await html2canvas(iframeDoc.body, {
              backgroundColor: '#080c16',
              logging: false,
              useCORS: true
            });

            const dataUrl = canvas.toDataURL('image/png');
            document.body.removeChild(hiddenIframe);
            resolve(dataUrl);

          } catch (err) {
            if (document.body.contains(hiddenIframe)) {
              document.body.removeChild(hiddenIframe);
            }
            reject(err);
          }
        };

        hiddenIframe.onerror = (e) => {
          if (document.body.contains(hiddenIframe)) {
            document.body.removeChild(hiddenIframe);
          }
          reject(e);
        };

      } catch (err) {
        reject(err);
      }
    });
  }
}

window.runner = new ProgramRunner();
