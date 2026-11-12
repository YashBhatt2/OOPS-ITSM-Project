import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/landing');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

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
      } catch (e) {}
    }
    throw new Error('Failed to start browser CDP on port ' + this.port);
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

  async scrollTo(y) {
    await this.eval(`window.scrollTo({ top: ${y}, behavior: 'instant' });`);
    await new Promise(r => setTimeout(r, 300));
  }

  async close() {
    if (this.ws) this.ws.close();
    if (this.chrome) this.chrome.kill();
  }
}

async function run() {
  console.log('=== VERIFYING REBUILT LANDING PAGE & CAPTURING PROOF ===');
  console.log('Using browser binary:', CHROME_PATH);
  const session = new BrowserSession(9229);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  session.ws.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('[Browser Console]', data.params.type, ...data.params.args.map(a => a.value || a.description));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[Browser Exception]', data.params.exceptionDetails);
    }
  });

  // 1. Desktop Landing Page - 1280px (Obsidian Dark)
  await session.setViewport(1280, 900);
  await session.navigate('http://localhost:5173/');

  let headline = '';
  for (let i = 0; i < 30; i++) {
    headline = await session.eval('document.querySelector("h1")?.innerText');
    if (headline) break;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Landing headline:', headline);
  if (!headline) {
    const bodyText = await session.eval('document.body.innerText');
    const docTitle = await session.eval('document.title');
    console.log('Document title:', docTitle);
    console.log('Body text preview:', bodyText?.slice(0, 300));
  }
  if (!headline?.includes('Every incident, seen through.')) {
    throw new Error(`Unexpected headline: ${headline}`);
  }

  // Hero section screenshots
  await session.screenshot('hero-1280-dark.png');

  // Lifecycle story section
  await session.eval('document.getElementById("how-it-works")?.scrollIntoView({ behavior: "instant" })');
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('lifecycle-1280-dark.png');

  // Roles section
  await session.eval('document.getElementById("roles")?.scrollIntoView({ behavior: "instant" })');
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('roles-1280-dark.png');

  // SLA section
  await session.eval('document.getElementById("sla")?.scrollIntoView({ behavior: "instant" })');
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('sla-1280-dark.png');

  // Closing section
  await session.scrollTo(99999);
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('closing-1280-dark.png');

  // 2. Desktop 1920px (Ultra-wide, Dark)
  await session.setViewport(1920, 1080);
  await session.scrollTo(0);
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('hero-1920-dark.png');

  // 3. Tablet 768px (Dark)
  await session.setViewport(768, 1024);
  await session.scrollTo(0);
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('hero-768-dark.png');

  // 4. Mobile 390px (Dark)
  await session.setViewport(390, 844);
  await session.scrollTo(0);
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('hero-390-dark.png');

  await session.eval('document.getElementById("how-it-works")?.scrollIntoView({ behavior: "instant" })');
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('lifecycle-390-dark.png');

  // 5. Ceramic Light Theme (1280px and 390px)
  await session.eval('document.documentElement.setAttribute("data-theme", "light")');
  await session.setViewport(1280, 900);
  await session.scrollTo(0);
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('hero-1280-light.png');

  await session.eval('document.getElementById("how-it-works")?.scrollIntoView({ behavior: "instant" })');
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('lifecycle-1280-light.png');

  await session.eval('document.getElementById("sla")?.scrollIntoView({ behavior: "instant" })');
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('sla-1280-light.png');

  await session.setViewport(390, 844);
  await session.scrollTo(0);
  await new Promise(r => setTimeout(r, 400));
  await session.screenshot('hero-390-light.png');

  // Reset to dark
  await session.eval('document.documentElement.setAttribute("data-theme", "dark")');

  // 6. Test Calm Sign In screen (/signin)
  await session.navigate('http://localhost:5173/signin');
  await new Promise(r => setTimeout(r, 600));
  const signinTitle = await session.eval('document.querySelector("h2")?.innerText');
  console.log('Sign in panel title:', signinTitle);

  // 7. Test Calm Register screen (/register)
  await session.navigate('http://localhost:5173/register');
  await new Promise(r => setTimeout(r, 600));
  const registerTitle = await session.eval('document.querySelector("h2")?.innerText');
  console.log('Register panel title:', registerTitle);

  // 8. Test Redirect: /login -> /signin
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

  // 9. Login as Sarah and verify / shows "Open your workspace" (NO auto-redirect)
  console.log('Authenticating Sarah to test landing page authenticated state...');
  const loginStatus = await session.eval(`
    (async function() {
      const csrfRes = await fetch('/api/v1/auth/csrf');
      const csrf = await csrfRes.json();
      const body = new URLSearchParams();
      body.set('email', 'sarah@example.test');
      body.set('password', 'Password12345!');
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          [csrf.headerName]: csrf.token
        },
        body
      });
      return res.status;
    })()
  `);
  console.log('API login response status in browser:', loginStatus);

  // Navigate back to /
  console.log('Navigating back to / as authenticated user...');
  await session.navigate('http://localhost:5173/');
  await new Promise(r => setTimeout(r, 1200));

  const authLandingUrl = await session.eval('window.location.pathname');
  console.log('Landing page URL for logged-in user:', authLandingUrl);
  if (authLandingUrl !== '/') {
    throw new Error(`User was auto-redirected away from / to ${authLandingUrl}`);
  }

  let topBarBtn = '';
  for (let i = 0; i < 30; i++) {
    topBarBtn = await session.eval('document.querySelector("header a button")?.innerText');
    if (topBarBtn?.includes('Open your workspace')) break;
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('Top bar primary button:', topBarBtn);
  if (!topBarBtn?.includes('Open your workspace')) {
    throw new Error(`Expected "Open your workspace", found: ${topBarBtn}`);
  }

  await session.screenshot('authenticated-landing-1280-dark.png');

  await session.close();
  console.log('=== ALL REBUILT LANDING PAGE TESTS PASSED CLEANLY! ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
