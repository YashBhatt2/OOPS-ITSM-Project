import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/landing');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

class BrowserSession {
  constructor(port = 9229) {
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

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600
    });
    await new Promise(r => setTimeout(r, 300));
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
  console.log('=== VERIFYING LANDING PAGE, AUTH SCREENS & ROUTING ===');
  const session = new BrowserSession(9229);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  // 1. Desktop Landing Page (Obsidian Dark)
  await session.setViewport(1280, 900);
  await session.navigate('http://localhost:5173/');
  
  let headline = '';
  for (let i = 0; i < 25; i++) {
    headline = await session.eval('document.querySelector("h1")?.innerText');
    if (headline) break;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Landing headline:', headline);
  if (!headline?.includes('Every incident, from report to resolution')) {
    throw new Error(`Unexpected headline: ${headline}`);
  }

  await session.screenshot('01-landing-desktop-dark.png');

  // 2. Mobile Landing Page (390px, Dark)
  await session.setViewport(390, 844);
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('02-landing-mobile-dark.png');

  // 3. Desktop Landing Page (Ceramic Light)
  await session.setViewport(1280, 900);
  await session.eval('document.documentElement.setAttribute("data-theme", "light")');
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('03-landing-desktop-light.png');

  // Reset to dark
  await session.eval('document.documentElement.setAttribute("data-theme", "dark")');

  // 4. Test Calm Sign In screen (/signin)
  await session.navigate('http://localhost:5173/signin');
  await new Promise(r => setTimeout(r, 600));
  const signinTitle = await session.eval('document.querySelector("h2")?.innerText');
  console.log('Sign in panel title:', signinTitle);
  await session.screenshot('04-signin-calm-dark.png');

  // 5. Test Calm Register screen (/register)
  await session.navigate('http://localhost:5173/register');
  await new Promise(r => setTimeout(r, 600));
  const registerTitle = await session.eval('document.querySelector("h2")?.innerText');
  console.log('Register panel title:', registerTitle);
  await session.screenshot('05-register-calm-dark.png');

  // 6. Test Redirect: /login -> /signin
  await session.navigate('http://localhost:5173/login');
  let redirectedUrl = '';
  for (let i = 0; i < 25; i++) {
    redirectedUrl = await session.eval('window.location.pathname');
    if (redirectedUrl === '/signin') break;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Redirect test: /login resulted in path:', redirectedUrl);
  if (redirectedUrl !== '/signin') {
    throw new Error(`Expected redirect to /signin, but got ${redirectedUrl}`);
  }

  // 7. Login as Sarah and verify / shows "Open your workspace" (NO auto-redirect)
  console.log('Authenticating Sarah to test landing page authenticated state...');
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
      setVal(email, 'sarah@example.test');
      setVal(pass, 'Password12345!');
      const btn = document.querySelector('button[type="submit"]');
      btn.click();
    })()
  `);

  let postLoginUrl = '';
  for (let i = 0; i < 35; i++) {
    postLoginUrl = await session.eval('window.location.pathname');
    if (postLoginUrl === '/employee') break;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Post-login landed on:', postLoginUrl);

  // Now navigate back to /
  console.log('Navigating back to / as authenticated user...');
  await session.navigate('http://localhost:5173/');
  await new Promise(r => setTimeout(r, 1000));

  const authLandingUrl = await session.eval('window.location.pathname');
  console.log('Landing page URL for logged-in user:', authLandingUrl);
  if (authLandingUrl !== '/') {
    throw new Error(`User was auto-redirected away from / to ${authLandingUrl}`);
  }

  let topBarBtn = '';
  for (let i = 0; i < 20; i++) {
    topBarBtn = await session.eval('document.querySelector("header a button")?.innerText');
    if (topBarBtn) break;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Top bar primary button:', topBarBtn);
  if (!topBarBtn?.includes('Open your workspace')) {
    throw new Error(`Expected "Open your workspace", found: ${topBarBtn}`);
  }

  await session.screenshot('06-landing-authenticated-dark.png');

  await session.close();
  console.log('=== ALL LANDING PAGE & ROUTING TESTS PASSED! ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
