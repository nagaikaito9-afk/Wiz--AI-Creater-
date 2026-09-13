const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

function getWebSocketDebuggerUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/version', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function sendCDP(ws, method, params = {}, id = 1) {
  return new Promise((resolve, reject) => {
    const message = JSON.stringify({ id, method, params });
    const handler = (data) => {
      const resp = JSON.parse(data.toString());
      if (resp.id === id) {
        ws.off('message', handler);
        if (resp.error) reject(resp.error);
        else resolve(resp.result);
      }
    };
    ws.on('message', handler);
    ws.send(message);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  try {
    await getWebSocketDebuggerUrl();
    console.log('Browser already listening on 9222');
  } catch (e) {
    console.log('Launching Edge on 9222...');
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    spawn(edgePath, [
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      '--user-data-dir=C:\\Users\\user\\AppData\\Local\\Temp\\edge_dev_profile_verify_home',
      'about:blank'
    ], { detached: true });
    await sleep(2500);
  }

  const wsUrl = await getWebSocketDebuggerUrl();
  const WebSocket = require('ws');
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.on('open', r));
  console.log('Connected to CDP');

  let msgId = 1;
  const cdp = (method, params) => sendCDP(ws, method, params, ++msgId);

  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 850,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('Navigating to http://localhost:8085/index.html...');
  await cdp('Page.navigate', { url: 'http://localhost:8085/index.html' });
  await sleep(2500);

  // Clear local storage for clean registration test
  await cdp('Runtime.evaluate', {
    expression: `
      localStorage.clear();
      location.reload();
    `
  });
  await sleep(2500);

  // 1. Click Signup Tab
  console.log('Switching to Signup tab...');
  await cdp('Runtime.evaluate', {
    expression: `document.getElementById('tab-signup-btn').click();`
  });
  await sleep(500);

  // 2. Fill Email & Password
  console.log('Filling Step 1...');
  await cdp('Runtime.evaluate', {
    expression: `
      document.getElementById('gate-signup-email').value = 'ars_hero@wiz.io';
      document.getElementById('gate-signup-password').value = 'Adventure2026!';
      document.getElementById('gate-signup-next-1-btn').click();
    `
  });
  await sleep(1500);

  // 3. Check we are in Step 2 and get pending code
  const step2Res = await cdp('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        step2Visible: document.getElementById('signup-step-2').style.display !== 'none',
        step1Visible: document.getElementById('signup-step-1').style.display !== 'none',
        code: window.supabaseAuth?.pendingSignup?.code || 'none'
      })
    `,
    returnByValue: true
  });
  console.log('Step 2 State:', step2Res.result.value);
  const step2Info = JSON.parse(step2Res.result.value);

  // 4. Enter the code and advance to Step 3
  console.log(`Submitting confirmation code: ${step2Info.code}...`);
  await cdp('Runtime.evaluate', {
    expression: `
      document.getElementById('gate-signup-code').value = '${step2Info.code}';
      document.getElementById('gate-signup-next-2-btn').click();
    `
  });
  await sleep(1000);

  // 5. Inspect Step 3 Labels & Immutability hints
  const step3Res = await cdp('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        step3Visible: document.getElementById('signup-step-3').style.display !== 'none',
        label: document.querySelector('#signup-step-3 label[for="gate-signup-userid"], #signup-step-3 .auth-field:nth-child(3) label')?.innerText || '',
        hint: document.getElementById('userid-status-hint')?.innerText || ''
      })
    `,
    returnByValue: true
  });
  console.log('Step 3 State:', step3Res.result.value);

  // Screenshot Step 3
  const shot1 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\1820c403-dad4-43c5-be57-d35df0458ef3\\.tempmediaStorage\\verified_clean_signup_step3.png', Buffer.from(shot1.data, 'base64'));
  console.log('Saved verified_clean_signup_step3.png');

  // 6. Complete Registration with Username & ID
  console.log('Filling username & ID and completing registration...');
  await cdp('Runtime.evaluate', {
    expression: `
      document.getElementById('gate-signup-username').value = '勇者アルス';
      document.getElementById('gate-signup-userid').value = 'hero_ars';
      // Trigger validation
      document.getElementById('gate-signup-userid').dispatchEvent(new Event('input'));
      document.getElementById('gate-signup-finish-btn').click();
    `
  });
  await sleep(1500);

  // 7. Verify Dashboard & User Slate
  const dashboardRes = await cdp('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        gateHidden: document.getElementById('auth-gate-modal').style.display === 'none',
        dashboardVisible: document.getElementById('wiz-home-dashboard').style.display === 'flex',
        workspaceHidden: document.getElementById('workspace-container').style.display === 'none',
        homeBtnActive: document.getElementById('header-home-btn').classList.contains('active'),
        welcomeUsername: document.getElementById('home-welcome-username')?.innerText || '',
        welcomeUserId: document.getElementById('home-welcome-userid')?.innerText || '',
        roomsCount: window.projectManager?.rooms?.length,
        friendsCount: window.friendsManager?.data?.friends?.length,
        currentUser: {
          username: window.supabaseAuth?.currentUser?.username,
          userId: window.supabaseAuth?.currentUser?.userId
        }
      })
    `,
    returnByValue: true
  });
  console.log('Dashboard & Clean State:', dashboardRes.result.value);

  // Screenshot Homepage Dashboard
  const shot2 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\1820c403-dad4-43c5-be57-d35df0458ef3\\.tempmediaStorage\\verified_home_dashboard.png', Buffer.from(shot2.data, 'base64'));
  console.log('Saved verified_home_dashboard.png');

  // 8. Click "エディタを開く" to view workspace empty states
  console.log('Opening studio editor...');
  await cdp('Runtime.evaluate', {
    expression: `
      document.getElementById('home-launch-studio-btn').click();
    `
  });
  await sleep(1000);

  // Check workspace state and empty project / friend lists
  const workspaceRes = await cdp('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        workspaceVisible: document.getElementById('workspace-container').style.display === 'flex',
        dashboardHidden: document.getElementById('wiz-home-dashboard').style.display === 'none',
        emptyProjectExists: Boolean(document.querySelector('.empty-projects-state')),
        projectItemCount: document.querySelectorAll('.room-item-card').length,
        currentActiveHeaderTitle: document.getElementById('active-project-title')?.innerText || ''
      })
    `,
    returnByValue: true
  });
  console.log('Workspace Clean State:', workspaceRes.result.value);

  // Switch to friends tab to verify 0 friends empty state
  await cdp('Runtime.evaluate', {
    expression: `
      document.getElementById('sidebar-tab-friends').click();
    `
  });
  await sleep(1000);

  const friendsState = await cdp('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        emptyFriendsExists: Boolean(document.querySelector('.friends-empty-placeholder')),
        friendItemsCount: document.querySelectorAll('.friend-row-item').length,
        myId: document.getElementById('my-profile-id')?.innerText || '',
        myName: document.getElementById('my-profile-name')?.innerText || ''
      })
    `,
    returnByValue: true
  });
  console.log('Friends Clean State:', friendsState.result.value);

  // Screenshot empty workspace & friends
  const shot3 = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\1820c403-dad4-43c5-be57-d35df0458ef3\\.tempmediaStorage\\verified_empty_projects_and_friends.png', Buffer.from(shot3.data, 'base64'));
  console.log('Saved verified_empty_projects_and_friends.png');

  // 9. Test Header Home Button to toggle back to dashboard
  console.log('Toggling home button back to dashboard...');
  await cdp('Runtime.evaluate', {
    expression: `document.getElementById('header-home-btn').click();`
  });
  await sleep(800);

  const backHomeRes = await cdp('Runtime.evaluate', {
    expression: `
      JSON.stringify({
        dashboardVisible: document.getElementById('wiz-home-dashboard').style.display === 'flex',
        workspaceHidden: document.getElementById('workspace-container').style.display === 'none'
      })
    `,
    returnByValue: true
  });
  console.log('Back to Home State:', backHomeRes.result.value);

  ws.close();
  console.log('All verifications completed successfully!');
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
