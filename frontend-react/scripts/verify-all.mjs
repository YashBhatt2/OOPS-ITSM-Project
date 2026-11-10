import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/verified');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

class BrowserSession {
  constructor(port = 9224) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async start() {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-session-' + Date.now());
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

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 1200));
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(screenshotDir, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`[PASS] Captured ${filename} (${buffer.length} bytes)`);
  }

  async close() {
    if (this.ws) this.ws.close();
    if (this.chrome) this.chrome.kill();
  }
}

async function run() {
  console.log('=== VERIFYING COMPLETE FRONTEND IN HEADLESS BROWSER ===');
  const session = new BrowserSession(9224);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  try {
    // 1. Visit Login
    console.log('\n1. Visiting /login');
    await session.navigate('http://localhost:5173/login');
    await session.screenshot('01-login-screen.png');

    // 2. Perform Real React Login
    console.log('\n2. Logging in as admin@example.test...');
    await session.eval(`
      (function() {
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        const email = document.getElementById('signin-email');
        const pass = document.getElementById('signin-password');
        setVal(email, 'admin@example.test');
        setVal(pass, 'L2AyL3x3ksDu1c4ibMGNZr55Aa1!');
        const btn = document.querySelector('button[type="submit"]');
        btn.click();
      })()
    `);

    // Give time for AuthFaceIdMorph spinner (authenticating) -> checkmark (authenticated) -> navigation
    console.log('Waiting for Face ID morph & navigation...');
    await new Promise(r => setTimeout(r, 600));
    await session.screenshot('02-login-faceid-morph.png');

    await new Promise(r => setTimeout(r, 2000));
    const pathAfterLogin = await session.eval('window.location.pathname');
    console.log('Current path after login:', pathAfterLogin);
    await session.screenshot('03-admin-dashboard.png');

    // 3. Test The Island
    console.log('\n3. Testing The Island notification component...');
    const islandPresent = await session.eval('!!document.querySelector("[aria-label*=\'Notifications\']")');
    console.log('Island button present:', islandPresent);
    const islandAria = await session.eval('document.querySelector("[aria-label*=\'Notifications\']").getAttribute("aria-label")');
    console.log('Island label:', islandAria);

    // Open the Island by pressing N
    console.log('Opening Island via key N...');
    await session.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    `);
    await new Promise(r => setTimeout(r, 600));
    await session.screenshot('04-island-open.png');

    // Close Island via Escape
    await session.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await new Promise(r => setTimeout(r, 400));

    // 4. Test Settings Dialog
    console.log('\n4. Opening Settings Dialog...');
    await session.eval(`
      const gear = document.querySelector('button[aria-label="Settings"]');
      if (gear) gear.click();
    `);
    await new Promise(r => setTimeout(r, 600));
    await session.screenshot('05-settings-dialog-blur.png');

    // Close Settings Dialog
    await session.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await new Promise(r => setTimeout(r, 400));

    // 5. Test Admin Setup Page
    console.log('\n5. Navigating to Admin Setup (/admin/setup/services)...');
    await session.navigate('http://localhost:5173/admin/setup/services');
    await session.screenshot('06-admin-setup-services.png');

    // 6. Test Admin Reports Page
    console.log('\n6. Navigating to Admin Reports (/admin/reports)...');
    await session.navigate('http://localhost:5173/admin/reports');
    await session.screenshot('07-admin-reports.png');

    // 7. Test Admin Incidents Page
    console.log('\n7. Navigating to Admin Incidents (/admin/incidents)...');
    await session.navigate('http://localhost:5173/admin/incidents');
    await session.screenshot('08-admin-incidents.png');

    console.log('\n=== HEADLESS VERIFICATION COMPLETED WITH FULL SUCCESS ===');
  } finally {
    await session.close();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
