import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

class BrowserSession {
  constructor(port = 9227) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
    this.logs = [];
  }

  async start() {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-emp-' + Date.now());
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
  const session = new BrowserSession(9227);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  try {
    // 1. Visit Login
    await session.send('Page.navigate', { url: 'http://localhost:5173/login' });
    await new Promise(r => setTimeout(r, 1200));

    // 2. Login as Sarah (Employee)
    await session.eval(`
      (function() {
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal(document.getElementById('signin-email'), 'sarah@example.test');
        setVal(document.getElementById('signin-password'), 'Password12345!');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2500));

    console.log('Logged in path:', await session.eval('window.location.pathname'));

    // 3. Find first incident link on employee home page
    const incidentHref = await session.eval(`
      (function() {
        const a = document.querySelector('a[href*="/employee/incidents/"]');
        return a ? a.getAttribute('href') : null;
      })()
    `);
    console.log('Found incident href on dashboard:', incidentHref);

    if (incidentHref) {
      console.log('Clicking incident link:', incidentHref);
      await session.eval(`
        document.querySelector('a[href*="/employee/incidents/"]').click();
      `);
      await new Promise(r => setTimeout(r, 1500));

      console.log('New pathname:', await session.eval('window.location.pathname'));
      const heading = await session.eval('document.querySelector("h1")?.textContent');
      console.log('Heading on incident detail page:', heading);
      const rootLength = await session.eval('document.getElementById("root")?.innerHTML?.length');
      console.log('Root HTML length:', rootLength);
    } else {
      console.log('No incident links found on employee home page. Let us check incidents list directly:');
      const incList = await session.eval(`
        fetch('/api/v1/incidents?size=5').then(r => r.json()).then(d => d.items.map(i => ({ id: i.id, ref: i.reference })))
      `);
      console.log('Available incidents from API:', incList);
      if (incList && incList.length > 0) {
        const testId = incList[0].id;
        console.log('Navigating directly to /employee/incidents/' + testId);
        await session.eval(`
          window.history.pushState({}, '', '/employee/incidents/${testId}');
          window.dispatchEvent(new PopStateEvent('popstate'));
        `);
        await new Promise(r => setTimeout(r, 1500));
        console.log('New pathname:', await session.eval('window.location.pathname'));
        const heading = await session.eval('document.querySelector("h1")?.textContent');
        console.log('Heading on incident detail page:', heading);
        const rootLength = await session.eval('document.getElementById("root")?.innerHTML?.length');
        console.log('Root HTML length:', rootLength);
      }
    }

    console.log('\n--- Console logs and exceptions ---');
    console.log(session.logs.join('\n'));
  } finally {
    await session.close();
  }
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});

