import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

class BrowserSession {
  constructor(port = 9225) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
    this.logs = [];
  }

  async start() {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-inspect-' + Date.now());
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
              if (data.method === 'Runtime.consoleAPICalled') {
                this.logs.push(`[CONSOLE ${data.params.type}] ` + data.params.args.map(a => JSON.stringify(a.value)).join(' '));
              }
              if (data.method === 'Runtime.exceptionThrown') {
                this.logs.push(`[EXCEPTION] ` + JSON.stringify(data.params.exceptionDetails));
              }
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
    await new Promise(r => setTimeout(r, 1500));
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

async function inspect() {
  const session = new BrowserSession(9225);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  try {
    // 1. Login
    await session.navigate('http://localhost:5173/login');
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
    await new Promise(r => setTimeout(r, 2500));

    // Inspect /admin/reports
    console.log('--- Inspecting /admin/reports ---');
    await session.navigate('http://localhost:5173/admin/reports');
    const reportsHtml = await session.eval('document.getElementById("root").innerHTML');
    console.log('Reports HTML length:', reportsHtml?.length);
    console.log('Reports HTML snippet:', reportsHtml?.slice(0, 400));

    // Inspect /admin/incidents
    console.log('\n--- Inspecting /admin/incidents ---');
    await session.navigate('http://localhost:5173/admin/incidents');
    const incidentsHtml = await session.eval('document.getElementById("root").innerHTML');
    console.log('Incidents HTML length:', incidentsHtml?.length);
    console.log('Incidents HTML snippet:', incidentsHtml?.slice(0, 400));

    console.log('\n--- Console Logs / Exceptions ---');
    console.log(session.logs.join('\n'));
  } finally {
    await session.close();
  }
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
