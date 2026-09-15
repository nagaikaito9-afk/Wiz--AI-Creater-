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
const http = require('http');
const crypto = require('crypto');

// Production Vercel Serverless Backend URL
const VERCEL_BACKEND_URL = 'https://wiz-ai-creater.vercel.app';

let mainWindow = null;

function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

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

// IPC: Native Auth0 OAuth 2.0 In-App Modal Flow (Zero dashboard config needed, uses registered Web callback URL)
ipcMain.handle('auth:login-auth0', async (event, { domain, clientId }) => {
  if (!domain || !clientId) {
    return { error: 'Auth0 Domain と Client ID が指定されていません。' };
  }

  // Use the registered Vercel Callback URL already allowed in Auth0 dashboard
  // This completely eliminates "Callback URL mismatch" without requiring ANY changes to Auth0 dashboard!
  const redirectUri = `${VERCEL_BACKEND_URL}/`;

  return new Promise((resolve) => {
    // Generate PKCE parameters (RFC 7636)
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));
    const state = base64URLEncode(crypto.randomBytes(16));

    let isResolved = false;
    let authWindow = new BrowserWindow({
      width: 540,
      height: 720,
      parent: mainWindow || undefined,
      modal: Boolean(mainWindow),
      title: 'Wiz AI Creater - Auth0 ログイン / 新規登録',
      autoHideMenuBar: true,
      backgroundColor: '#0d1117',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    const safeResolve = (data) => {
      if (isResolved) return;
      isResolved = true;
      if (authWindow && !authWindow.isDestroyed()) {
        try { authWindow.destroy(); } catch (e) {}
      }
      authWindow = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
      resolve(data);
    };

    const handleCallbackUrl = async (rawUrl) => {
      if (!rawUrl) return false;
      let urlObj;
      try {
        urlObj = new URL(rawUrl);
      } catch (e) {
        return false;
      }

      // Check if redirected to our callback domain or contains auth code/error
      const isCallbackHost = urlObj.origin === VERCEL_BACKEND_URL || urlObj.hostname.includes('wiz-ai-creater.vercel.app');
      const hasCodeOrError = urlObj.searchParams.has('code') || urlObj.searchParams.has('error');

      if (isCallbackHost && hasCodeOrError) {
        const error = urlObj.searchParams.get('error');
        const errorDesc = urlObj.searchParams.get('error_description');
        const code = urlObj.searchParams.get('code');
        const returnedState = urlObj.searchParams.get('state');

        if (error) {
          safeResolve({ error: errorDesc || error });
          return true;
        }

        if (returnedState !== state || !code) {
          safeResolve({ error: 'OAuth state検証エラーまたは認証コードがありません。' });
          return true;
        }

        try {
          // Exchange authorization code for tokens
          const tokenRes = await fetch(`https://${domain}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              client_id: clientId,
              code_verifier: codeVerifier,
              code: code,
              redirect_uri: redirectUri
            })
          });

          if (!tokenRes.ok) {
            const errData = await tokenRes.json().catch(() => ({}));
            throw new Error(errData.error_description || errData.error || `Token Exchange Failed: ${tokenRes.status}`);
          }

          const tokens = await tokenRes.json();

          // Fetch / Decode User Profile
          let userInfo = null;
          if (tokens.id_token) {
            try {
              const payloadBase64 = tokens.id_token.split('.')[1];
              userInfo = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
            } catch (e) {
              console.warn('[Electron Main] Failed to parse id_token payload:', e);
            }
          }

          if (!userInfo && tokens.access_token) {
            try {
              const userRes = await fetch(`https://${domain}/userinfo`, {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
              });
              if (userRes.ok) {
                userInfo = await userRes.json();
              }
            } catch (e) {
              console.warn('[Electron Main] /userinfo fetch error:', e);
            }
          }

          safeResolve({ success: true, user: userInfo, tokens });
          return true;
        } catch (err) {
          safeResolve({ error: `認証トークン取得エラー: ${err.message}` });
          return true;
        }
      }
      return false;
    };

    // Intercept redirect navigation before it actually loads the web page
    authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
      if (navigationUrl.includes(VERCEL_BACKEND_URL) || navigationUrl.includes('code=')) {
        event.preventDefault();
        handleCallbackUrl(navigationUrl);
      }
    });

    authWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      if (navigationUrl.includes(VERCEL_BACKEND_URL) || navigationUrl.includes('code=')) {
        event.preventDefault();
        handleCallbackUrl(navigationUrl);
      }
    });

    authWindow.on('closed', () => {
      if (!isResolved) {
        safeResolve({ error: '認証ウィンドウが閉じられました。' });
      }
    });

    // 3-minute timeout
    setTimeout(() => {
      if (!isResolved) {
        safeResolve({ error: 'ログインがタイムアウトしました。' });
      }
    }, 180000);

    // Construct Auth0 authorization URL
    const authUrl = `https://${domain}/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

    authWindow.loadURL(authUrl).catch(err => {
      safeResolve({ error: `Auth0 画面の読み込みに失敗しました: ${err.message}` });
    });
  });
});
