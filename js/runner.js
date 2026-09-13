/**
 * Wiz AI Game Creator - Game & Script Runner
 * Handles HTML/JS/CSS sandbox execution, Pyodide Python execution,
 * and automated headless interaction + html2canvas screenshot captures
 */

class ProgramRunner {
  constructor() {
    this.pyodide = null;
    this.isPyodideLoading = false;
    this.activeRunTarget = 'index.html';
    
    // UI elements
    this.modal = document.getElementById('preview-modal-overlay');
    this.iframe = document.getElementById('preview-iframe');
    this.iframeWrapper = document.getElementById('preview-iframe-wrapper');
    this.pythonWrapper = document.getElementById('preview-python-wrapper');
    this.pythonOutput = document.getElementById('python-output');
    this.pyStatus = document.getElementById('pyodide-status');
    this.targetLabel = document.getElementById('preview-target-file');
    this.consoleLogsContainer = document.getElementById('console-drawer-logs');
    
    this.initEvents();
  }

  initEvents() {
    // Listen to iframe logs
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'WIZ_IFRAME_LOG') {
        this.addConsoleLog(e.data.level, e.data.message);
      }
    });

    // Controls
    document.getElementById('preview-close-btn')?.addEventListener('click', () => this.close());
    document.getElementById('preview-restart-btn')?.addEventListener('click', () => this.restart());
    document.getElementById('preview-open-tab-btn')?.addEventListener('click', () => this.openInNewTab());
    document.getElementById('clear-console-btn')?.addEventListener('click', () => this.clearConsole());

    // Keyboard shortcut ESC to close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.style.display !== 'none') {
        this.close();
      }
    });
  }

  clearConsole() {
    if (this.consoleLogsContainer) {
      this.consoleLogsContainer.innerHTML = '';
    }
  }

  addConsoleLog(level, message) {
    if (!this.consoleLogsContainer) return;
    const item = document.createElement('div');
    item.className = `log-item ${level}`;
    const time = new Date().toLocaleTimeString();
    item.textContent = `[${time}] ${message}`;
    this.consoleLogsContainer.appendChild(item);
    this.consoleLogsContainer.scrollTop = this.consoleLogsContainer.scrollHeight;
  }

  // Run a target file (HTML or Python)
  run(filePath = 'index.html') {
    this.activeRunTarget = filePath || 'index.html';
    if (this.targetLabel) {
      this.targetLabel.textContent = this.activeRunTarget;
    }
    this.clearConsole();
    this.modal.style.display = 'flex';

    if (this.activeRunTarget.endsWith('.py')) {
      this.runPython(this.activeRunTarget);
    } else {
      this.runHtml(this.activeRunTarget);
    }
  }

  restart() {
    this.run(this.activeRunTarget);
  }

  close() {
    this.modal.style.display = 'none';
    if (this.iframe) {
      this.iframe.srcdoc = '';
    }
  }

  openInNewTab() {
    if (this.activeRunTarget.endsWith('.py')) {
      window.showToast('Pythonスクリプトはプレビューモーダル内コンソールでのみ実行可能です。', 'warning');
      return;
    }
    const htmlBundle = window.vfs.buildHtmlBundle(this.activeRunTarget);
    const blob = new Blob([htmlBundle], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  }

  // Execute HTML in iframe
  runHtml(filePath) {
    this.pythonWrapper.style.display = 'none';
    this.iframeWrapper.style.display = 'block';

    this.addConsoleLog('info', `HTMLプログラム [${filePath}] を起動しています...`);
    const bundle = window.vfs.buildHtmlBundle(filePath);
    
    // Use srcdoc for clean isolated sandboxing
    this.iframe.srcdoc = bundle;
    this.addConsoleLog('info', '実行環境がロードされました。');
  }

  // Execute Python via Pyodide
  async runPython(filePath) {
    this.iframeWrapper.style.display = 'none';
    this.pythonWrapper.style.display = 'flex';
    this.pythonOutput.textContent = '';
    
    const code = window.vfs.readFile(filePath);
    if (!code) {
      this.pythonOutput.textContent = `エラー: ${filePath} の内容を読み込めませんでした。`;
      return;
    }

    if (!this.pyodide) {
      this.pyStatus.textContent = 'Pyodide ランタイム読み込み中 (初回のみ数秒)...';
      try {
        await this.loadPyodideScript();
        this.pyodide = await window.loadPyodide();
        this.pyStatus.textContent = 'Pyodide 準備完了';
      } catch (err) {
        this.pyStatus.textContent = 'Pyodide 読み込み失敗';
        this.pythonOutput.textContent = `Python環境の初期化に失敗しました:\n${err.message}`;
        return;
      }
    }

    this.pyStatus.textContent = '実行中...';
    let outputBuffer = '';
    
    this.pyodide.setStdout({
      batched: (text) => {
        outputBuffer += text + '\n';
        this.pythonOutput.textContent = outputBuffer;
        this.addConsoleLog('info', text);
      }
    });

    this.pyodide.setStderr({
      batched: (text) => {
        outputBuffer += '[Error] ' + text + '\n';
        this.pythonOutput.textContent = outputBuffer;
        this.addConsoleLog('error', text);
      }
    });

    try {
      await this.pyodide.runPythonAsync(code);
      this.pyStatus.textContent = '実行完了 (終了コード 0)';
    } catch (e) {
      outputBuffer += `\nTraceback (most recent call last):\n${e.message}`;
      this.pythonOutput.textContent = outputBuffer;
      this.pyStatus.textContent = 'エラー終了';
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

  /**
   * Headless click & screenshot capture feature:
   * "○○フォルダ内のindex.htmlを実行して『スタート』ボタンを押したら何が出てくるか画像を送って"
   * Loads HTML in a hidden container, optionally clicks a target button, waits, and takes a screenshot.
   */
  async executeAndCapture(filePath = 'index.html', clickSelector = null, waitMs = 1200) {
    return new Promise((resolve, reject) => {
      try {
        const bundle = window.vfs.buildHtmlBundle(filePath);
        
        // Create an offscreen iframe for capturing
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

            // Optional click on element if selector or text is given
            if (clickSelector) {
              await new Promise(r => setTimeout(r, 400)); // wait for DOM setup
              let targetEl = null;

              // Try standard CSS selector
              try {
                targetEl = iframeDoc.querySelector(clickSelector);
              } catch (e) {}

              // Fallback: search by text content (e.g. "スタート", "Start")
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

            // Wait for animations / rendering
            await new Promise(r => setTimeout(r, waitMs));

            // Capture screenshot using html2canvas on the iframe body
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
