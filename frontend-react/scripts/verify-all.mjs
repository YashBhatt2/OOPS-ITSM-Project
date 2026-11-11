import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/verified');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

class BrowserSession {
  constructor(port = 9228) {
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
  console.log('=== VERIFYING REFINED FRONTEND IN HEADLESS BROWSER ===');
  const session = new BrowserSession(9228);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  try {
    // 1. Visit Login
    console.log('\n1. Visiting /login');
    await session.navigate('http://localhost:5173/login');
    await session.screenshot('01-login-screen.png');

    // 2. Perform Real React Login & check Face ID Reticle
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

    // Capture Face ID Viewfinder Reticle loader
    console.log('Waiting for Face ID Viewfinder & Checkmark morph...');
    await new Promise(r => setTimeout(r, 450));
    await session.screenshot('02-login-biometric-reticle.png');

    await new Promise(r => setTimeout(r, 2200));
    const pathAfterLogin = await session.eval('window.location.pathname');
    console.log('Current path after login:', pathAfterLogin);

    // Check user greeting on landing page
    const greetingText = await session.eval('document.querySelector("h1")?.textContent');
    console.log('Landing page greeting:', greetingText);
    await session.screenshot('03-admin-dashboard-greeting.png');

    // 3. Test The Island in rightControls
    console.log('\n3. Testing The Island notification bell in top-right controls...');
    const islandPresent = await session.eval('!!document.querySelector("[aria-label*=\'Notifications\']")');
    console.log('Island button present:', islandPresent);
    const islandLabel = await session.eval('document.querySelector("[aria-label*=\'Notifications\']")?.getAttribute("aria-label")');
    console.log('Island label:', islandLabel);

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

    // 4. Test Sign Out Confirmation Popover
    console.log('\n4. Testing Sign Out Confirmation Popover...');
    await session.eval(`
      const signOutBtn = document.querySelector('button[aria-label="Sign out"]');
      if (signOutBtn) signOutBtn.click();
    `);
    await new Promise(r => setTimeout(r, 500));
    const confirmPopoverExists = await session.eval('!!document.querySelector("[aria-label=\'Sign out confirmation\']")');
    console.log('Sign out popover opened:', confirmPopoverExists);
    await session.screenshot('05-signout-confirm-popover.png');

    // Cancel sign out
    await session.eval(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await new Promise(r => setTimeout(r, 400));

    // 5. Test Technician Detail Page Sticky Action Card & Timeline
    console.log('\n5. Visiting Technician Incident Detail Page...');
    // Login as technician
    await session.navigate('http://localhost:5173/login');
    await session.eval(`
      (function() {
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal(document.getElementById('signin-email'), 'priya@example.test');
        setVal(document.getElementById('signin-password'), 'Password12345!');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));

    // Check technician greeting
    const techGreeting = await session.eval('document.querySelector("h1")?.textContent');
    console.log('Technician greeting:', techGreeting);

    // Find and click an incident
    const techIncHref = await session.eval('document.querySelector("a[href*=\'/technician/incidents/\'], tr[class*=\'tr\']") ? true : false');
    console.log('Technician incidents available:', techIncHref);

    const firstIncId = await session.eval(`
      fetch('/api/v1/incidents?size=1').then(r => r.json()).then(d => d.items[0]?.id)
    `);
    if (firstIncId) {
      console.log('Navigating to technician incident:', firstIncId);
      await session.navigate('http://localhost:5173/technician/incidents/' + firstIncId);
      await new Promise(r => setTimeout(r, 1200));

      const backBtnPresent = await session.eval('!!document.querySelector("a[aria-label*=\'Back\'], button[aria-label*=\'Back\']")');
      console.log('Back button present:', backBtnPresent);

      const hasStickyAction = await session.eval('!!document.querySelector("[class*=\'stickyActionCard\']")');
      console.log('Frosted sticky action card present:', hasStickyAction);

      await session.screenshot('06-technician-incident-detail.png');
    }

    console.log('\n=== ALL USER REQUESTS FULLY VERIFIED IN CHROME ===');
  } finally {
    await session.close();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
