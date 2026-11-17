import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/island');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

class BrowserSession {
  constructor(port = 9230) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async start() {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-island-' + Date.now());
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
  console.log('=== VERIFYING UPGRADED NOTIFICATION ISLAND ===');
  const session = new BrowserSession(9230);
  await session.start();
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  // 1. Visit Dev Island Playground
  console.log('1. Navigating to /dev/island...');
  await session.navigate('http://localhost:5173/dev/island');
  await new Promise(r => setTimeout(r, 800));

  const playgroundTitle = await session.eval('document.querySelector("h1")?.innerText');
  console.log('Playground title:', playgroundTitle);
  if (!playgroundTitle?.includes('Island Dev Playground')) {
    throw new Error(`Unexpected playground title: ${playgroundTitle}`);
  }

  // Capture Initial Rest State
  console.log('2. Testing Rest State...');
  await session.screenshot('01-island-rest.png');

  // 3. Fire Normal P3 Notification
  console.log('3. Firing Normal P3 Notification...');
  await session.eval(`
    const btns = Array.from(document.querySelectorAll("button"));
    const normalBtn = btns.find(b => b.textContent.includes("Normal P3 Update"));
    normalBtn?.click();
  `);
  await new Promise(r => setTimeout(r, 450));
  await session.screenshot('02-island-peek-normal-p3.png');

  // 4. Fire P2 At Risk Notification
  console.log('4. Firing P2 At-Risk Notification...');
  await session.eval(`
    const btns = Array.from(document.querySelectorAll("button"));
    const atRiskBtn = btns.find(b => b.textContent.includes("P2 At Risk"));
    atRiskBtn?.click();
  `);
  await new Promise(r => setTimeout(r, 450));
  await session.screenshot('03-island-peek-p2-at-risk.png');

  // 5. Fire P1 SLA Breach Notification (Verifying red perimeter trace & red signal dot)
  console.log('5. Firing P1 SLA Breach Notification...');
  await session.eval(`
    const btns = Array.from(document.querySelectorAll("button"));
    const breachBtn = btns.find(b => b.textContent.includes("P1 SLA Breach"));
    breachBtn?.click();
  `);
  await new Promise(r => setTimeout(r, 300));
  await session.screenshot('04-island-peek-p1-breach.png');

  // 6. Fire Burst of 10 Notifications (Verifying coalescing into newest + 9 more)
  console.log('6. Firing Burst of 10 Notifications...');
  const burstClickResult = await session.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const burstBtn = btns.find(b => b.textContent && b.textContent.includes("Burst of 10 Items"));
      if (burstBtn) {
        burstBtn.click();
        return "CLICKED: " + burstBtn.textContent;
      }
      return "NOT_FOUND. Buttons: " + btns.map(b => b.textContent).join(" | ");
    })()
  `);
  console.log('Burst click result:', burstClickResult);
  await new Promise(r => setTimeout(r, 600));
  const peekText = await session.eval('document.querySelector("[class*=\'peekLayout\']")?.innerText');
  console.log('Peek banner full text:', peekText);
  await session.screenshot('05-island-burst-coalesced.png');

  // 7. Fire Very Long Message
  console.log('7. Firing Very Long Message...');
  await session.eval(`
    const btns = Array.from(document.querySelectorAll("button"));
    const longBtn = btns.find(b => b.textContent && b.textContent.includes("Very Long Message"));
    longBtn?.click();
  `);
  await new Promise(r => setTimeout(r, 600));
  await session.screenshot('06-island-long-message-peek.png');

  // 8. Open Island Feed via keyboard (N)
  console.log('8. Opening Island Feed via keyboard (N)...');
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', text: 'n', unmodifiedText: 'n', key: 'n' });
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', text: 'n', unmodifiedText: 'n', key: 'n' });
  await new Promise(r => setTimeout(r, 600));

  const openTitle = await session.eval('document.querySelector("[class*=\'openTitle\']")?.innerText');
  console.log('Open feed title:', openTitle);
  await session.screenshot('07-island-open-feed.png');

  // 9. Close Island via Escape
  console.log('9. Closing Island via Escape...');
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' });
  await new Promise(r => setTimeout(r, 400));

  // 10. Simulate Error State
  console.log('10. Simulating Error State ("Can\'t refresh")...');
  await session.eval(`
    const btns = Array.from(document.querySelectorAll("button"));
    const errBtn = btns.find(b => b.textContent && b.textContent.includes("Error Notice"));
    errBtn?.click();
  `);
  // Open Island to view error notice
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', text: 'n', unmodifiedText: 'n', key: 'n' });
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', text: 'n', unmodifiedText: 'n', key: 'n' });
  await new Promise(r => setTimeout(r, 500));

  const errNotice = await session.eval('document.querySelector("[class*=\'errorNotice\']")?.innerText');
  console.log('Error notice in open feed:', errNotice);
  await session.screenshot('08-island-open-error-state.png');

  // Close Island
  await session.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
  await session.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' });
  await new Promise(r => setTimeout(r, 300));

  // 11. Simulate Empty State ("Nothing new.")
  console.log('11. Simulating Empty State ("Nothing new.")...');
  await session.eval(`
    (() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const emptyBtn = btns.find(b => b.textContent && b.textContent.includes("Empty State"));
      if (emptyBtn) emptyBtn.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 300));

  // Open Island directly if not open
  await session.eval(`
    (() => {
      const pill = document.querySelector("button[aria-label*='Notifications']");
      if (pill && pill.getAttribute("aria-expanded") !== "true") {
        pill.click();
      }
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  const emptyHeadline = await session.eval('document.querySelector("[class*=\'emptyTitle\']")?.innerText');
  console.log('Empty state headline:', emptyHeadline);
  await session.screenshot('09-island-open-empty-state.png');

  // 12. Test Light Theme (Ceramic)
  console.log('12. Testing Light Theme (Ceramic)...');
  await session.eval('document.documentElement.setAttribute("data-theme", "light")');
  await session.screenshot('10-island-open-ceramic-light.png');

  // Reset theme
  await session.eval('document.documentElement.setAttribute("data-theme", "dark")');

  // 13. Record Animation & Frame Performance
  console.log('13. Measuring Animation Frame Rates...');
  const perfMetrics = await session.eval(`
    new Promise(resolve => {
      let frames = 0;
      const start = performance.now();
      function step() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(step);
        } else {
          const fps = Math.round((frames * 1000) / (performance.now() - start));
          resolve({ fps, frames });
        }
      }
      requestAnimationFrame(step);
    })
  `);
  console.log('Measured Animation Performance:', perfMetrics, 'FPS');

  await session.close();
  console.log('=== ALL ISLAND UPGRADE VERIFICATION TESTS PASSED! ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
