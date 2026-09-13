const { spawn } = require('child_process');

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
  const r = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const d = document.getElementById('wiz-home-dashboard');
        d.style.display = 'flex';
        const banner = document.querySelector('.home-hero-banner');
        const title = document.querySelector('.hero-title');
        return JSON.stringify({
          bannerRect: banner?.getBoundingClientRect(),
          titleRect: title?.getBoundingClientRect(),
          titleStyle: title ? {
            display: getComputedStyle(title).display,
            visibility: getComputedStyle(title).visibility,
            opacity: getComputedStyle(title).opacity,
            color: getComputedStyle(title).color,
            fontSize: getComputedStyle(title).fontSize,
            lineHeight: getComputedStyle(title).lineHeight
          } : null,
          titleText: title?.innerText,
          html: banner?.innerHTML
        });
      })()
    `,
    returnByValue: true
  });
  console.log('Banner inspect:', r.result.value);
  edge.kill();
  process.exit(0);
})();
