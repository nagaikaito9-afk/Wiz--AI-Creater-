const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9299',
    '--window-size=1280,850',
    'http://localhost:8085/index.html'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9299/json');
  const targets = await res.json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = id++;
    const fn = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === mid) { ws.removeEventListener('message', fn); resolve(d.result); }
    };
    ws.addEventListener('message', fn);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await send('Runtime.enable');
  await send('Page.enable');

  const r = await send('Runtime.evaluate', {
    expression: `
      (() => {
        document.getElementById('auth-gate-modal').style.display = 'none';
        document.getElementById('studio-app-root').style.display = 'flex';
        document.getElementById('wiz-home-dashboard').style.display = 'flex';
        document.getElementById('workspace-container').style.display = 'none';

        const banner = document.querySelector('.home-hero-banner');
        const children = Array.from(banner.children).map(c => ({
          tag: c.tagName,
          className: c.className,
          rect: c.getBoundingClientRect(),
          color: getComputedStyle(c).color,
          display: getComputedStyle(c).display,
          visibility: getComputedStyle(c).visibility,
          opacity: getComputedStyle(c).opacity,
          text: c.innerText
        }));

        return JSON.stringify({
          bannerRect: banner.getBoundingClientRect(),
          bannerStyle: {
            height: getComputedStyle(banner).height,
            maxHeight: getComputedStyle(banner).maxHeight,
            overflow: getComputedStyle(banner).overflow
          },
          children
        }, null, 2);
      })()
    `,
    returnByValue: true
  });
  console.log('Detailed banner inspect:\n', r.result.value);

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\1820c403-dad4-43c5-be57-d35df0458ef3\\.tempmediaStorage\\inspect_banner_standalone.png', Buffer.from(shot.data, 'base64'));

  edge.kill();
  process.exit(0);
})();
