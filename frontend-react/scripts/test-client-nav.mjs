import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

class BrowserSession {
  constructor(port = 9226) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async start() {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-check-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    this.chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${tmpDir}`,
      '--disable-gpu',
      '--window-size=1280,900',
      'about:blank'
    ]);

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch(`http://localhost:${this.port}/json/list`);
        if (res.ok) {
          const list = await res.json();
          const page = list.find(t => t.type === 'page');
          if (page && page.webSocketDebuggerUrl) {
            this.ws = new WebSocket(page.webSocketDebuggerUrl);
            await new Promise(resolve => this.ws.onopen = resolve);
            this.ws.onmessage = (event) => {
              const data = JSON.parse(event.data);
              if (data.id && this.pending.has(data.id)) {
                const { resolve, reject } = this.pending.get(data.id);
                this.pending.delete(data.id);
                if (data.error) reject(data.error);
                else resolve(data.result);
              }
            };
            return;
          }
        }
      } catch (e) {}
    }
    throw new Error('Failed to start Chrome CDP');
  }

  send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  async close() {
    if (this.ws) this.ws.close();
    if (this.chrome) this.chrome.kill();
  }
}

async function test() {
  const session = new BrowserSession(9226);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  try {
    await session.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await new Promise(r => setTimeout(r, 1200));

    // Login as Admin
    await session.eval(`
      (function() {
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal(document.getElementById('signin-email'), 'admin@example.test');
        setVal(document.getElementById('signin-password'), 'L2AyL3x3ksDu1c4ibMGNZr55Aa1!');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));

    // Test client-side navigation via link or pushState/history
    console.log('Current URL after login:', await session.eval('window.location.pathname'));

    // Navigate to /incidents via client-side router
    await session.eval(`
      window.history.pushState({}, '', '/incidents');
      window.dispatchEvent(new PopStateEvent('popstate'));
    `);
    await new Promise(r => setTimeout(r, 1500));

    console.log('URL after pushing /incidents:', await session.eval('window.location.pathname'));
    const h1 = await session.eval('document.querySelector("h1")?.textContent');
    console.log('Heading on /incidents:', h1);
    const incidentCount = await session.eval('document.querySelectorAll("table tbody tr, [class*=\'card\']").length');
    console.log('Rendered incident count or rows:', incidentCount);

    // Navigate to /admin/reports
    await session.eval(`
      window.history.pushState({}, '', '/admin/reports');
      window.dispatchEvent(new PopStateEvent('popstate'));
    `);
    await new Promise(r => setTimeout(r, 1500));

    console.log('URL after pushing /admin/reports:', await session.eval('window.location.pathname'));
    const reportsH1 = await session.eval('document.querySelector("h1")?.textContent');
    console.log('Heading on /admin/reports:', reportsH1);
  } finally {
    await session.close();
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
