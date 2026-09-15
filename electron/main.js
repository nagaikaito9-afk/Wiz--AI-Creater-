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
let activeAuthServer = null;
let activeAuthTimeout = null;

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

// IPC: Native Auth0 OAuth 2.0 PKCE Loopback Flow
ipcMain.handle('auth:login-auth0', async (event, { domain, clientId }) => {
  if (!domain || !clientId) {
    return { error: 'Auth0 Domain と Client ID が指定されていません。' };
  }

  // Cleanup existing auth server if any
  if (activeAuthServer) {
    try { activeAuthServer.close(); } catch (e) {}
    activeAuthServer = null;
  }
  if (activeAuthTimeout) {
    clearTimeout(activeAuthTimeout);
    activeAuthTimeout = null;
  }

  return new Promise((resolve) => {
    const port = 42813;
    const redirectUri = `http://127.0.0.1:${port}/callback`;

    // Generate PKCE parameters
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(sha256(Buffer.from(codeVerifier)));
    const state = base64URLEncode(crypto.randomBytes(16));

    const server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://127.0.0.1:${port}`);
      if (reqUrl.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const returnedCode = reqUrl.searchParams.get('code');
      const returnedState = reqUrl.searchParams.get('state');
      const returnedError = reqUrl.searchParams.get('error');
      const returnedErrorDesc = reqUrl.searchParams.get('error_description');

      if (returnedError) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0d1117; color: #f85149;">
            <h2>認証エラー</h2>
            <p>${returnedErrorDesc || returnedError}</p>
            <p style="color:#8b949e;">このタブを閉じてアプリに戻ってください。</p>
          </div>
        `);
        cleanup();
        resolve({ error: returnedErrorDesc || returnedError });
        return;
      }

      if (returnedState !== state || !returnedCode) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0d1117; color: #f85149;">
            <h2>state検証エラー</h2>
            <p>無効な認証レスポンスです。</p>
          </div>
        `);
        cleanup();
        resolve({ error: 'OAuth state 不一致または認証コードが見つかりません。' });
        return;
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
            code: returnedCode,
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

        // 1. Decode ID Token (JWT) directly for instant, guaranteed profile
        if (tokens.id_token) {
          try {
            const payloadBase64 = tokens.id_token.split('.')[1];
            userInfo = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
          } catch (e) {
            console.warn('[Electron Main] Failed to parse id_token payload:', e);
          }
        }

        // 2. Fallback to /userinfo endpoint if needed
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

        // HTML Response to default browser
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0d1117; color: #c9d1d9;">
            <h2 style="color: #58a6ff;">🧙 Wiz AI Creater</h2>
            <h3 style="color: #3fb950; margin: 15px 0;">🎉 ログインに成功しました！</h3>
            <p style="color: #8b949e; line-height: 1.6;">このブラウザタブを閉じて、Wiz AI Creater アプリへお戻りください。</p>
          </div>
        `);

        cleanup();

        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }

        resolve({ success: true, user: userInfo, tokens });
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 40px; background: #0d1117; color: #f85149;">
            <h2>トークン取得エラー</h2>
            <p>${err.message}</p>
          </div>
        `);
        cleanup();
        resolve({ error: err.message });
      }
    });

    server.on('error', (err) => {
      cleanup();
      resolve({ error: `ローカル認証ポート (${port}) の起動に失敗しました: ${err.message}` });
    });

    server.listen(port, '127.0.0.1', () => {
      activeAuthServer = server;

      // 3-minute timeout
      activeAuthTimeout = setTimeout(() => {
        cleanup();
        resolve({ error: 'Auth0 ログインがタイムアウトしました (3分)' });
      }, 180000);

      // Construct Auth0 authorization URL
      const authUrl = `https://${domain}/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20profile%20email&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

      // Open in OS default browser
      shell.openExternal(authUrl);
    });

    function cleanup() {
      if (server) {
        try { server.close(); } catch (e) {}
      }
      activeAuthServer = null;
      if (activeAuthTimeout) {
        clearTimeout(activeAuthTimeout);
        activeAuthTimeout = null;
      }
    }
  });
});
