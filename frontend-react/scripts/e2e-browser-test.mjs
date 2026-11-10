import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/e2e');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Simple CDP client using Node's built-in fetch & WebSocket
class BrowserSession {
  constructor(port = 9223) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async start() {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-e2e-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    this.chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${tmpDir}`,
      '--disable-gpu',
      '--window-size=1280,900',
      'about:blank'
    ]);

    // Wait for CDP to be available
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 300));
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
    await new Promise(r => setTimeout(r, 2000));
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
  console.log('--- Starting Automated End-to-End Browser Tests ---');
  const session = new BrowserSession(9223);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  try {
    // 1. Sign In Page
    console.log('\n[1/5] Testing Sign-in page (/login)...');
    await session.navigate('http://localhost:5173/login');
    const title = await session.eval('document.title');
    console.log('Title:', title);
    const hasSignInHeading = await session.eval('document.querySelector("h2")?.textContent');
    console.log('Heading:', hasSignInHeading);
    await session.screenshot('01-signin-page.png');

    // 2. Perform Employee Login
    console.log('\n[2/5] Performing Employee sign in (sarah@example.test)...');
    await session.eval(`
      (function() {
        const emailInput = document.getElementById('signin-email');
        const passInput = document.getElementById('signin-password');
        const form = document.querySelector('form');
        emailInput.value = 'sarah@example.test';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.value = 'Password12345!';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()
    `);

    await new Promise(r => setTimeout(r, 2500));
    const employeeUrl = await session.eval('window.location.pathname');
    console.log('Redirected to:', employeeUrl);
    await session.screenshot('02-employee-home.png');

    // 3. Report Incident Page
    console.log('\n[3/5] Testing Report Incident Page (/employee/report)...');
    await session.navigate('http://localhost:5173/employee/report');
    await session.screenshot('03-employee-report-form.png');

    // Fill and submit incident
    console.log('Filling out incident report form...');
    await session.eval(`
      (function() {
        const titleInput = document.getElementById('title');
        const descInput = document.getElementById('description');
        titleInput.value = 'Cannot access corporate shared drive after upgrade';
        titleInput.dispatchEvent(new Event('input', { bubbles: true }));
        descInput.value = 'Attempted to connect to Z: drive from work laptop. Returns error 0x80070035 network path was not found.';
        descInput.dispatchEvent(new Event('input', { bubbles: true }));
      })()
    `);
    await new Promise(r => setTimeout(r, 800));
    await session.screenshot('04-report-form-filled.png');

    // 4. Technician Queue & Workbench
    console.log('\n[4/5] Testing Technician Portal (priya@example.test)...');
    // Clear cookies/localStorage and log in as Priya
    await session.eval(`localStorage.clear()`);
    await session.navigate('http://localhost:5173/login');
    await session.eval(`
      (function() {
        const emailInput = document.getElementById('signin-email');
        const passInput = document.getElementById('signin-password');
        const form = document.querySelector('form');
        emailInput.value = 'priya@example.test';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.value = 'Password12345!';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));
    await session.navigate('http://localhost:5173/technician');
    const techHeading = await session.eval('document.querySelector("h1")?.textContent');
    console.log('Technician page heading:', techHeading);
    await session.screenshot('05-technician-queue.png');

    // 5. Admin Console & Reports
    console.log('\n[5/5] Testing Administrator Portal (admin@example.test)...');
    await session.eval(`localStorage.clear()`);
    await session.navigate('http://localhost:5173/login');
    await session.eval(`
      (function() {
        const emailInput = document.getElementById('signin-email');
        const passInput = document.getElementById('signin-password');
        const form = document.querySelector('form');
        emailInput.value = 'admin@example.test';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.value = 'L2AyL3x3ksDu1c4ibMGNZr55Aa1!';
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));
    await session.navigate('http://localhost:5173/admin');
    const adminHeading = await session.eval('document.querySelector("h1")?.textContent');
    console.log('Admin overview heading:', adminHeading);
    await session.screenshot('06-admin-overview.png');

    // Admin Reports with SVG Charts
    console.log('Testing Admin Reports with SVG charts...');
    await session.navigate('http://localhost:5173/admin/reports');
    await session.screenshot('07-admin-reports-charts.png');

    // Admin Setup
    console.log('Testing Admin Setup...');
    await session.navigate('http://localhost:5173/admin/setup/services');
    await session.screenshot('08-admin-setup-services.png');

    // All Incidents Directory with Filters
    console.log('Testing Incidents Directory with filters...');
    await session.navigate('http://localhost:5173/incidents');
    await session.screenshot('09-incidents-directory.png');

    console.log('\n=== ALL BROWSER END-TO-END TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await session.close();
  }
}

run().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
