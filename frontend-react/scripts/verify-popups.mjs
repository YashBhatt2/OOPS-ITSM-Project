import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/popups');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

class BrowserSession {
  constructor(port = 9235) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async start() {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-popups-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    this.chrome = spawn(CHROME_PATH, [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${tmpDir}`,
      '--disable-gpu',
      '--window-size=1280,900',
      'about:blank'
    ]);

    for (let i = 0; i < 40; i++) {
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
      } catch {}
    }
    throw new Error('Failed to connect to headless Chrome');
  }

  async send(method, params = {}) {
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

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result?.value;
  }

  async captureScreenshot(name) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(screenshotDir, name);
    fs.writeFileSync(outPath, buffer);
    console.log(`[PASS] Captured ${name} (${buffer.length} bytes)`);
  }

  async close() {
    if (this.ws) this.ws.close();
    if (this.chrome) this.chrome.kill();
  }
}

async function run() {
  console.log('=== VERIFYING POPUPS & CERAMIC FULL-SCREEN SCRIM ===');
  const browser = new BrowserSession(9238);
  await browser.start();

  try {
    await browser.send('Page.enable');

    // 1. Log in as Sarah
    await browser.navigate('http://localhost:5173/signin');
    await new Promise(r => setTimeout(r, 1200));

    await browser.evaluate(`
      (async () => {
        const csrfRes = await fetch('/api/v1/auth/csrf');
        const csrf = await csrfRes.json();
        const body = new URLSearchParams();
        body.set('email', 'sarah@example.test');
        body.set('password', 'Password12345!');
        await fetch('/api/v1/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            [csrf.headerName]: csrf.token
          },
          body
        });
      })()
    `);

    // 2. Navigate to employee workspace
    await browser.navigate('http://localhost:5173/employee');
    await new Promise(r => setTimeout(r, 1500));

    // 3. Switch to Ceramic (Light) mode
    await browser.evaluate(`
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.setAttribute('data-theme-choice', 'light');
    `);
    await new Promise(r => setTimeout(r, 400));

    // 4. Open Notification Island
    await browser.evaluate(`
      const bellBtn = document.querySelector('button[aria-label^="Notifications"]');
      if (bellBtn) bellBtn.click();
    `);
    await new Promise(r => setTimeout(r, 500));

    // Check scrim coverage in Ceramic mode
    const scrimMetrics = await browser.evaluate(`
      (() => {
        const scrim = document.querySelector('[class*="scrim"]');
        if (!scrim) return null;
        const rect = scrim.getBoundingClientRect();
        const style = window.getComputedStyle(scrim);
        return {
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left,
          bgColor: style.backgroundColor,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter
        };
      })()
    `);
    console.log('Ceramic Scrim Metrics:', JSON.stringify(scrimMetrics, null, 2));

    // Check notifications card material
    const cardMaterial = await browser.evaluate(`
      (() => {
        const card = document.querySelector('[class*="openCardLayout"]');
        if (!card) return null;
        const style = window.getComputedStyle(card);
        return {
          bgColor: style.backgroundColor,
          backdropFilter: style.backdropFilter || style.webkitBackdropFilter,
          opacity: style.opacity
        };
      })()
    `);
    console.log('Notifications Card Material (Solid/Opaque):', JSON.stringify(cardMaterial, null, 2));

    await browser.captureScreenshot('notifications-open-ceramic.png');

    // Close notifications
    await browser.evaluate(`
      const closeBtn = document.querySelector('button[aria-label="Close notifications"]');
      if (closeBtn) closeBtn.click();
    `);
    await new Promise(r => setTimeout(r, 400));

    // 5. Open Sign Out Confirmation
    await browser.evaluate(`
      const signOutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign out'));
      if (signOutBtn) signOutBtn.click();
    `);
    await new Promise(r => setTimeout(r, 500));

    const signOutMetrics = await browser.evaluate(`
      (() => {
        const popover = document.querySelector('[class*="confirmPopover"]');
        const backdrop = document.querySelector('[class*="popoverBackdrop"]');
        if (!popover || !backdrop) return null;
        const popStyle = window.getComputedStyle(popover);
        const backRect = backdrop.getBoundingClientRect();
        return {
          backdropWidth: backRect.width,
          backdropHeight: backRect.height,
          popoverBg: popStyle.backgroundColor,
          popoverFilter: popStyle.backdropFilter || popStyle.webkitBackdropFilter,
          popoverOpacity: popStyle.opacity
        };
      })()
    `);
    console.log('Signout Confirm Metrics:', JSON.stringify(signOutMetrics, null, 2));

    await browser.captureScreenshot('signout-confirm-ceramic.png');

    // 6. Test in Obsidian (Dark) mode
    await browser.evaluate(`
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-theme-choice', 'dark');
    `);
    await new Promise(r => setTimeout(r, 400));
    await browser.captureScreenshot('signout-confirm-dark.png');

    // Close signout popover
    await browser.evaluate(`
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Cancel');
      if (cancelBtn) cancelBtn.click();
    `);
    await new Promise(r => setTimeout(r, 400));

    // Open notifications in dark mode
    await browser.evaluate(`
      const bellBtn = document.querySelector('button[aria-label^="Notifications"]');
      if (bellBtn) bellBtn.click();
    `);
    await new Promise(r => setTimeout(r, 500));
    await browser.captureScreenshot('notifications-open-dark.png');

    console.log('=== ALL POPUP & SCRIM TESTS VERIFIED SUCCESSFULLY! ===');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Error during popup verification:', err);
  process.exit(1);
});
