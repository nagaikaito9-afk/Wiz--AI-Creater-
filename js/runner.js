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

    // Inline Panel DOM & Stage Elements
    this.inlineIframe = document.getElementById('inline-preview-iframe');
    this.stageContainer = document.getElementById('preview-stage-container');
    this.stageViewport = document.getElementById('preview-stage-viewport');
    this.aspectSelect = document.getElementById('preview-aspect-select');
    this.fpsBadge = document.getElementById('preview-fps-badge');
    this.pauseBtn = document.getElementById('preview-pause-btn');
    this.muteBtn = document.getElementById('preview-mute-btn');

    this.inlinePythonWrapper = document.getElementById('inline-python-wrapper');
    this.inlinePythonOutput = document.getElementById('inline-python-output');
    this.inlinePyStatus = document.getElementById('inline-py-status');
    this.inlineTargetLabel = document.getElementById('inline-preview-target');
    this.inlineConsoleLogs = document.getElementById('inline-console-logs');
    this.logCounterBadge = document.getElementById('log-counter-badge');
    
    // State
    this.currentAspect = localStorage.getItem('wiz_preview_aspect') || '4-3';
    this.isPaused = false;
    this.isMuted = false;
    this.resizeObserver = null;

    this.initEvents();
    this.initStageSizing();
    this.initPreviewTools();
  }

  initEvents() {
    // Listen to iframe logs and FPS
    window.addEventListener('message', (e) => {
      if (!e.data) return;
      if (e.data.type === 'WIZ_IFRAME_LOG') {
        this.addConsoleLog(e.data.level, e.data.message);
      } else if (e.data.type === 'WIZ_IFRAME_FPS') {
        this.updateFpsBadge(e.data.fps);
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

  // Stage Sizing & Auto-Scale (Guarantees zero distortion & zero overflow)
  initStageSizing() {
    if (this.aspectSelect) {
      this.aspectSelect.value = this.currentAspect;
      this.aspectSelect.addEventListener('change', () => {
        this.currentAspect = this.aspectSelect.value;
        localStorage.setItem('wiz_preview_aspect', this.currentAspect);
        this.updateStageDimensions();
      });
    }

    if (this.stageContainer) {
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => {
          this.updateStageDimensions();
        });
        this.resizeObserver.observe(this.stageContainer);
      }
      window.addEventListener('resize', () => this.updateStageDimensions());
    }

    // Initial sizing
    setTimeout(() => this.updateStageDimensions(), 100);
  }

  updateStageDimensions() {
    if (!this.stageContainer || !this.stageViewport) return;

    const containerW = this.stageContainer.clientWidth;
    const containerH = this.stageContainer.clientHeight;
    if (!containerW || !containerH) return;

    // Safety padding so viewport never touches edges
    const pad = 16;
    const availW = Math.max(100, containerW - pad);
    const availH = Math.max(100, containerH - pad);

    if (this.currentAspect === 'auto') {
      this.stageViewport.style.width = '100%';
      this.stageViewport.style.height = '100%';
      this.stageViewport.style.aspectRatio = 'auto';
      return;
    }

    const ratioMap = {
      '16-9': 16 / 9,
      '4-3': 4 / 3,
      '9-16': 9 / 16,
      '1-1': 1 / 1
    };

    const targetRatio = ratioMap[this.currentAspect] || (4 / 3);

    let targetW = availW;
    let targetH = targetW / targetRatio;

    if (targetH > availH) {
      targetH = availH;
      targetW = targetH * targetRatio;
    }

    this.stageViewport.style.width = `${Math.floor(targetW)}px`;
    this.stageViewport.style.height = `${Math.floor(targetH)}px`;
    this.stageViewport.style.aspectRatio = String(targetRatio);
  }

  // Preview Tools (Screenshot, Pause, Mute, FPS)
  initPreviewTools() {
    // Screenshot
    document.getElementById('preview-screenshot-btn')?.addEventListener('click', () => this.captureScreenshot());

    // Pause / Resume
    this.pauseBtn?.addEventListener('click', () => {
      this.isPaused = !this.isPaused;
      const label = document.getElementById('pause-btn-label');
      const icon = this.pauseBtn.querySelector('i');
      if (this.isPaused) {
        if (icon) icon.className = 'fa-solid fa-play';
        if (label) label.textContent = '再開';
        this.pauseBtn.classList.add('active');
      } else {
        if (icon) icon.className = 'fa-solid fa-pause';
        if (label) label.textContent = '停止';
        this.pauseBtn.classList.remove('active');
      }

      this.inlineIframe?.contentWindow?.postMessage({ type: 'WIZ_SET_PAUSE', paused: this.isPaused }, '*');
      this.modalIframe?.contentWindow?.postMessage({ type: 'WIZ_SET_PAUSE', paused: this.isPaused }, '*');

      if (window.showToast) {
        window.showToast(this.isPaused ? 'ゲームを一時停止しました' : 'ゲームを再開しました', 'info');
      }
    });

    // Mute / Unmute
    this.muteBtn?.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      const label = document.getElementById('mute-btn-label');
      const icon = this.muteBtn.querySelector('i');
      if (this.isMuted) {
        if (icon) icon.className = 'fa-solid fa-volume-xmark';
        if (label) label.textContent = '消音中';
        this.muteBtn.classList.add('active');
      } else {
        if (icon) icon.className = 'fa-solid fa-volume-high';
        if (label) label.textContent = '消音';
        this.muteBtn.classList.remove('active');
      }

      this.inlineIframe?.contentWindow?.postMessage({ type: 'WIZ_MUTE_AUDIO', muted: this.isMuted }, '*');
      this.modalIframe?.contentWindow?.postMessage({ type: 'WIZ_MUTE_AUDIO', muted: this.isMuted }, '*');

      if (window.showToast) {
        window.showToast(this.isMuted ? '消音（ミュート）にしました' : '消音を解除しました', 'info');
      }
    });
  }

  // Capture Game Screenshot (Downloads PNG)
  async captureScreenshot() {
    try {
      let dataUrl = null;
      // 1. Try reading canvas directly from iframe
      const doc = this.inlineIframe?.contentDocument;
      const canvas = doc?.querySelector('canvas');
      if (canvas) {
        try {
          dataUrl = canvas.toDataURL('image/png');
        } catch (e) {
          console.warn('Canvas toDataURL warning:', e);
        }
      }

      // 2. Fallback using html2canvas on stage viewport
      if (!dataUrl && window.html2canvas && this.stageViewport) {
        const rendered = await window.html2canvas(this.stageViewport, { backgroundColor: '#000000' });
        dataUrl = rendered.toDataURL('image/png');
      }

      if (dataUrl) {
        const link = document.createElement('a');
        link.download = `game_screenshot_${Date.now()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (window.showToast) window.showToast('ゲーム画面のスクリーンショットを保存しました！📸', 'success');
      } else {
        if (window.showToast) window.showToast('スクリーンショットのキャプチャに失敗しました', 'warning');
      }
    } catch (err) {
      console.error('Screenshot error:', err);
      if (window.showToast) window.showToast('キャプチャ中にエラーが発生しました', 'error');
    }
  }

  updateFpsBadge(fps) {
    if (!this.fpsBadge) return;
    this.fpsBadge.textContent = `${fps} FPS`;
    if (fps >= 50) {
      this.fpsBadge.style.color = '#10b981';
      this.fpsBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    } else if (fps >= 30) {
      this.fpsBadge.style.color = '#f59e0b';
      this.fpsBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    } else {
      this.fpsBadge.style.color = '#ef4444';
      this.fpsBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    }
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

    this.updateStageDimensions();
    setTimeout(() => this.updateStageDimensions(), 100);

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
