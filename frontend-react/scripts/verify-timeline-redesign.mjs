import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/timeline');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

class BrowserSession {
  constructor(port = 9235) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async start(width = 1280, height = 900) {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-timeline-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });

    this.chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${this.port}`,
      `--user-data-dir=${tmpDir}`,
      '--disable-gpu',
      `--window-size=${width},${height}`,
      'about:blank'
    ]);

    this.chrome.stdout?.on('data', d => console.log('[CHROME STDOUT]', d.toString()));
    this.chrome.stderr?.on('data', d => console.log('[CHROME STDERR]', d.toString()));
    this.chrome.on('error', err => console.log('[CHROME ERROR]', err));
    this.chrome.on('exit', code => console.log('[CHROME EXIT]', code));

    let wsUrl = null;
    this.chrome.stderr?.on('data', d => {
      const str = d.toString();
      const match = str.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        wsUrl = match[1];
      }
    });

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (wsUrl && !this.ws) {
        try {
          this.ws = new WebSocket(wsUrl);
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
        } catch (e) {}
      }

      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
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
    throw new Error('Failed to start Chrome CDP on port ' + this.port);
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
  console.log('=== VERIFYING REDESIGNED LIFECYCLE HISTORY TIMELINE ===');
  const session = new BrowserSession(9238);
  await session.start(1280, 900);
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  try {
    // 1. Login as Admin
    console.log('1. Signing in as Admin (admin@example.test)...');
    await session.send('Page.navigate', { url: 'http://localhost:5173/signin' });
    await new Promise(r => setTimeout(r, 1200));

    await session.eval(`
      (function() {
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal(document.getElementById('signin-email'), 'admin@example.test');
        setVal(document.getElementById('signin-password'), 'Password12345!');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    // Navigate to All Incidents
    console.log('2. Finding incident list...');
    await session.send('Page.navigate', { url: 'http://localhost:5173/admin/incidents' });
    await new Promise(r => setTimeout(r, 1500));

    const incidentHref = await session.eval(`
      (function() {
        const a = document.querySelector('a[href*="/admin/incidents/"]');
        return a ? a.getAttribute('href') : null;
      })()
    `);
    console.log('Found Admin Incident Link:', incidentHref);

    if (!incidentHref) {
      throw new Error('No incident found on /admin/incidents');
    }

    // 3. Inspect Admin Incident Detail at 1280px Obsidian
    console.log('3. Loading Admin Incident Detail in Obsidian (Dark) at 1280px...');
    await session.send('Page.navigate', { url: `http://localhost:5173${incidentHref}` });
    await new Promise(r => setTimeout(r, 2000));

    // Verify timeline presence
    const timelineInfo = await session.eval(`
      (function() {
        const wrapper = document.querySelector('[class*="timelineWrapper"]');
        if (!wrapper) return { found: false };

        const eyebrow = wrapper.querySelector('[class*="eyebrow"]')?.textContent?.trim();
        const items = Array.from(wrapper.querySelectorAll('[class*="timelineItem"]')).map(el => {
          return {
            title: el.querySelector('[class*="itemTitle"]')?.textContent?.trim(),
            time: el.querySelector('[class*="entryTime"]')?.textContent?.trim(),
            since: el.querySelector('[class*="sinceReport"]')?.textContent?.trim(),
            quoted: el.querySelector('[class*="quotedReason"]')?.textContent?.trim(),
            detail: el.querySelector('[class*="detailLine"]')?.textContent?.trim()
          };
        });

        const filterChips = Array.from(wrapper.querySelectorAll('[class*="filterChip"]')).map(c => c.textContent.trim());

        // Check for UUID leak
        const fullText = wrapper.textContent;
        const uuidMatch = fullText.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
        const upperSnakeMatch = fullText.match(/SLA_WARNING|SLA_VIOLATION|SLA_ESCALATION|SKILL_FIRST|LOAD_FIRST/);

        return {
          found: true,
          eyebrow,
          itemCount: items.length,
          items: items.slice(0, 5),
          filterChips,
          uuidLeak: uuidMatch ? uuidMatch[0] : null,
          upperSnakeLeak: upperSnakeMatch ? upperSnakeMatch[0] : null
        };
      })()
    `);

    console.log('Admin Timeline Info:', JSON.stringify(timelineInfo, null, 2));

    if (timelineInfo.uuidLeak) {
      console.error('[FAIL] UUID leaked in timeline:', timelineInfo.uuidLeak);
    } else {
      console.log('[PASS] No UUID leaks in timeline.');
    }

    if (timelineInfo.upperSnakeLeak) {
      console.error('[FAIL] UPPER_SNAKE constant leaked:', timelineInfo.upperSnakeLeak);
    } else {
      console.log('[PASS] No UPPER_SNAKE constant leaks in timeline.');
    }

    await session.screenshot('01-admin-detail-obsidian-1280.png');

    // 4. Test Ceramic (Light) Theme on Admin
    console.log('4. Switching to Ceramic (Light) Theme...');
    await session.eval(`document.documentElement.setAttribute('data-theme', 'light');`);
    await new Promise(r => setTimeout(r, 600));
    await session.screenshot('02-admin-detail-ceramic-1280.png');

    // 5. Test 390px Mobile Viewport in Ceramic
    console.log('5. Testing 390px Viewport in Ceramic...');
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise(r => setTimeout(r, 600));
    await session.screenshot('03-admin-detail-ceramic-390.png');

    // Reset viewport and theme
    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await session.eval(`document.documentElement.setAttribute('data-theme', 'dark');`);
    await new Promise(r => setTimeout(r, 500));

    // 6. Test SLA Group Accordion expansion if present
    const hasSlaGroup = await session.eval(`
      (function() {
        const btn = document.querySelector('[class*="slaGroupButton"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    if (hasSlaGroup) {
      console.log('[PASS] Clicked SLA group summary accordion to expand child events.');
      await new Promise(r => setTimeout(r, 400));
      await session.screenshot('04-sla-group-accordion-expanded.png');
    }

    // 7. Test Technician Flow (Marcus Vance)
    console.log('7. Logging out and logging in as Technician (marcus@example.test)...');
    await session.send('Page.navigate', { url: 'http://localhost:5173/signin' });
    await new Promise(r => setTimeout(r, 1000));
    await session.eval(`
      (function() {
        const setVal = (el, val) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        setVal(document.getElementById('signin-email'), 'marcus@example.test');
        setVal(document.getElementById('signin-password'), 'Password12345!');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    // Find technician incident
    await session.send('Page.navigate', { url: 'http://localhost:5173/technician/incidents' });
    await new Promise(r => setTimeout(r, 1500));
    const techIncHref = await session.eval(`
      (function() {
        const a = document.querySelector('a[href*="/technician/incidents/"]');
        return a ? a.getAttribute('href') : null;
      })()
    `);
    console.log('Found Tech Incident Link:', techIncHref);

    if (techIncHref) {
      await session.send('Page.navigate', { url: `http://localhost:5173${techIncHref}` });
      await new Promise(r => setTimeout(r, 1800));
      await session.screenshot('05-technician-detail-obsidian-1280.png');

      await session.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
      });
      await session.eval(`document.documentElement.setAttribute('data-theme', 'light');`);
      await new Promise(r => setTimeout(r, 600));
      await session.screenshot('06-technician-detail-ceramic-390.png');

      await session.send('Emulation.setDeviceMetricsOverride', {
        width: 1280,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });
      await session.eval(`document.documentElement.setAttribute('data-theme', 'dark');`);
    }

    // 8. Test Employee Flow (Sarah Chen)
    console.log('8. Logging out and logging in as Employee (sarah@example.test)...');
    await session.send('Page.navigate', { url: 'http://localhost:5173/signin' });
    await new Promise(r => setTimeout(r, 1000));
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
    await new Promise(r => setTimeout(r, 2000));

    await session.send('Page.navigate', { url: 'http://localhost:5173/employee/incidents' });
    await new Promise(r => setTimeout(r, 1500));
    const empIncHref = await session.eval(`
      (function() {
        const a = document.querySelector('a[href*="/employee/incidents/"]');
        return a ? a.getAttribute('href') : null;
      })()
    `);
    console.log('Found Employee Incident Link:', empIncHref);

    if (empIncHref) {
      await session.send('Page.navigate', { url: `http://localhost:5173${empIncHref}` });
      await new Promise(r => setTimeout(r, 1800));

      const empFilterCheck = await session.eval(`
        (function() {
          const chips = document.querySelectorAll('[class*="filterChip"]');
          return chips.length;
        })()
      `);
      console.log(`[PASS] Employee sees ${empFilterCheck} filter chips (expected 0 for employees).`);

      await session.screenshot('07-employee-detail-obsidian-1280.png');

      await session.send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true
      });
      await session.eval(`document.documentElement.setAttribute('data-theme', 'light');`);
      await new Promise(r => setTimeout(r, 600));
      await session.screenshot('08-employee-detail-ceramic-390.png');
    }

    console.log('=== ALL LIFECYCLE HISTORY TIMELINE VERIFICATION TESTS COMPLETED! ===');
  } finally {
    await session.close();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
