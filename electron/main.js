/**
 * Wiz AI Game Creator - Electron Main Process
 * 
 * Security Architecture:
 * - nodeIntegration: false
 * - contextIsolation: true
 * - sandbox: true
 * - Safe external link delegation via shell.openExternal
 * - Zero API secrets embedded: Relays Wiz AI chat & verification to Vercel Serverless Backend
 */

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');

// Production Vercel Serverless Backend URL
const VERCEL_BACKEND_URL = 'https://wiz-ai-creater.vercel.app';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1080,
    minHeight: 720,
    title: 'Wiz AI Creater',
    icon: path.join(__dirname, '../assets/icon.png'),
    backgroundColor: '#0d1117',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    }
  });

  // Load the shared local index.html
  mainWindow.loadFile(path.join(__dirname, '../index.html'));

  // Security: Prevent untrusted external navigation inside the main window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    // Only allow local file navigation, delegate web links to system browser
    if (navigationUrl.startsWith('http://') || navigationUrl.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC: App Information
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

// IPC: Safe External URL Opener
ipcMain.handle('app:open-external', async (event, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// IPC: Wiz AI Chat Relay to Vercel Serverless Function (/api/chat)
// Never exposes Gemini API keys on the client
ipcMain.handle('wiz:chat', async (event, payload) => {
  try {
    const response = await fetch(`${VERCEL_BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        error: errJson.error || `Serverless Error HTTP ${response.status}`
      };
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('[Electron Main] Error relaying /api/chat:', err);
    return {
      error: `Vercel API への接続に失敗しました: ${err.message}`
    };
  }
});

// IPC: Send Email OTP Relay to Vercel Serverless Function (/api/send-code)
ipcMain.handle('wiz:send-code', async (event, payload) => {
  try {
    const response = await fetch(`${VERCEL_BACKEND_URL}/api/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('[Electron Main] Error relaying /api/send-code:', err);
    return {
      error: `認証コード送信サーバーへの接続に失敗しました: ${err.message}`
    };
  }
});

// IPC: Native File Dialogs (For Desktop File Adapter)
ipcMain.handle('dialog:save', async (event, options) => {
  if (!mainWindow) return { canceled: true };
  return await dialog.showSaveDialog(mainWindow, options || {});
});

ipcMain.handle('dialog:open', async (event, options) => {
  if (!mainWindow) return { canceled: true };
  return await dialog.showOpenDialog(mainWindow, options || {});
});
