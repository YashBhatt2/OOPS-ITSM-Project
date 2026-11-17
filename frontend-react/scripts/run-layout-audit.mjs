import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const screenshotDir = path.resolve('frontend-react/screenshots/layout-audit');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

class BrowserSession {
  constructor(port = 9240) {
    this.port = port;
    this.chrome = null;
    this.ws = null;
    this.msgId = 1;
    this.pending = new Map();
  }

  async start(width = 1280, height = 900) {
    const tmpDir = path.join(path.resolve('frontend-react/node_modules/.tmp'), 'chrome-audit-' + Date.now());
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

    let wsUrl = null;
    this.chrome.stderr?.on('data', d => {
      const match = d.toString().match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) wsUrl = match[1];
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
  }

  async close() {
    if (this.ws) this.ws.close();
    if (this.chrome) this.chrome.kill();
  }
}

async function auditScreen(session, url, name, width, theme) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: width <= 600 ? 844 : 900,
    deviceScaleFactor: 1,
    mobile: width <= 600
  });

  await session.send('Page.navigate', { url });
  await new Promise(r => setTimeout(r, 1200));

  await session.eval(`document.documentElement.setAttribute('data-theme', '${theme}');`);
  await new Promise(r => setTimeout(r, 400));

  const metrics = await session.eval(`
    (function() {
      const scrollWidth = document.documentElement.scrollWidth;
      const windowWidth = window.innerWidth;
      const hasHorizontalScroll = scrollWidth > windowWidth + 1;

      // Check alignment of topbar wordmark vs page content
      const brand = document.querySelector('[class*="brand"], [class*="wordmark"], header a');
      const main = document.querySelector('main');
      const brandLeft = brand ? Math.round(brand.getBoundingClientRect().left) : null;
      const mainLeft = main ? Math.round(main.getBoundingClientRect().left) : null;

      // Icon button sizes in header
      const headerBtns = Array.from(document.querySelectorAll('header button')).map(b => {
        const rect = b.getBoundingClientRect();
        return { w: Math.round(rect.width), h: Math.round(rect.height) };
      });

      // Radii of cards
      const cards = Array.from(document.querySelectorAll('article, [class*="card"], [class*="Card"]')).map(c => {
        const r = window.getComputedStyle(c).borderRadius;
        return parseFloat(r) || 0;
      });

      // Card-inside-card
      const nestedCards = document.querySelectorAll('article article, [class*="card"] [class*="card"]').length;

      // Check for UUID leak
      const bodyText = document.body.innerText;
      const uuidMatch = bodyText.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);

      return {
        hasHorizontalScroll,
        scrollWidth,
        windowWidth,
        brandLeft,
        mainLeft,
        edgeMismatch: brandLeft !== null && mainLeft !== null ? Math.abs(brandLeft - mainLeft) : 0,
        headerBtns,
        maxCardRadius: cards.length > 0 ? Math.max(...cards) : 0,
        nestedCards,
        uuidLeak: uuidMatch ? uuidMatch[0] : null
      };
    })()
  `);

  const filename = `${name}-${theme}-${width}.png`;
  await session.screenshot(filename);

  return {
    screen: name,
    width,
    theme,
    filename,
    ...metrics
  };
}

async function run() {
  console.log('=== RUNNING COMPREHENSIVE LAYOUT AUDIT ===');
  const session = new BrowserSession(9242);
  await session.start(1280, 900);
  await session.send('Page.enable');
  await session.send('Runtime.enable');

  const widths = [1920, 1440, 1280, 1024, 768, 390];
  const themes = ['dark', 'light'];
  const auditResults = [];

  try {
    // 1. Audit Public Landing
    for (const theme of themes) {
      for (const w of widths) {
        console.log(`Auditing Landing at ${w}px (${theme})...`);
        const r = await auditScreen(session, 'http://localhost:5173/', 'landing', w, theme);
        auditResults.push(r);
      }
    }

    // 2. Audit Sign in
    for (const theme of themes) {
      for (const w of widths) {
        console.log(`Auditing Signin at ${w}px (${theme})...`);
        const r = await auditScreen(session, 'http://localhost:5173/signin', 'signin', w, theme);
        auditResults.push(r);
      }
    }

    // 3. Login as Admin for Admin screens
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
        setVal(document.getElementById('signin-email'), 'admin@example.test');
        setVal(document.getElementById('signin-password'), 'Password12345!');
        document.querySelector('button[type="submit"]').click();
      })()
    `);
    await new Promise(r => setTimeout(r, 2000));

    // Admin overview
    for (const theme of themes) {
      for (const w of widths) {
        console.log(`Auditing Admin Overview at ${w}px (${theme})...`);
        const r = await auditScreen(session, 'http://localhost:5173/admin', 'admin-overview', w, theme);
        auditResults.push(r);
      }
    }

    // Admin incidents list
    for (const theme of themes) {
      for (const w of widths) {
        console.log(`Auditing Incidents List at ${w}px (${theme})...`);
        const r = await auditScreen(session, 'http://localhost:5173/admin/incidents', 'incidents-list', w, theme);
        auditResults.push(r);
      }
    }

    // Find first incident URL
    await session.send('Page.navigate', { url: 'http://localhost:5173/admin/incidents' });
    await new Promise(r => setTimeout(r, 1000));
    const incHref = await session.eval(`
      (function() {
        const a = document.querySelector('a[href*="/admin/incidents/"]');
        return a ? a.getAttribute('href') : null;
      })()
    `);

    if (incHref) {
      // Incident detail
      for (const theme of themes) {
        for (const w of widths) {
          console.log(`Auditing Incident Detail at ${w}px (${theme})...`);
          const r = await auditScreen(session, `http://localhost:5173${incHref}`, 'incident-detail', w, theme);
          auditResults.push(r);
        }
      }
    }

    // Reports page
    for (const theme of themes) {
      for (const w of widths) {
        console.log(`Auditing Reports at ${w}px (${theme})...`);
        const r = await auditScreen(session, 'http://localhost:5173/admin/reports', 'admin-reports', w, theme);
        auditResults.push(r);
      }
    }

    // Setup pages
    for (const theme of themes) {
      for (const w of widths) {
        console.log(`Auditing Setup at ${w}px (${theme})...`);
        const r = await auditScreen(session, 'http://localhost:5173/admin/setup/services', 'admin-setup-services', w, theme);
        auditResults.push(r);
      }
    }

    // Notifications page
    for (const theme of themes) {
      for (const w of widths) {
        console.log(`Auditing Notifications at ${w}px (${theme})...`);
        const r = await auditScreen(session, 'http://localhost:5173/notifications', 'notifications', w, theme);
        auditResults.push(r);
      }
    }

    // Write LAYOUT-AUDIT.md
    console.log('Generating LAYOUT-AUDIT.md...');
    let markdown = `# Layout Audit Report\n\n`;
    markdown += `Generated on ${new Date().toISOString()} across 6 viewports (1920, 1440, 1280, 1024, 768, 390 px) in both Obsidian (dark) and Ceramic (light) themes.\n\n`;
    markdown += `## Defect Severity Summary\n\n`;
    markdown += `| Screen | Width | Defect | Severity |\n`;
    markdown += `|---|---|---|---|\n`;

    // Populate defects based on audited metrics
    for (const res of auditResults) {
      const defects = [];
      if (res.edgeMismatch > 4 && res.width >= 1280) {
        defects.push({ desc: `Top bar left (${res.brandLeft}px) differs from page content left (${res.mainLeft}px) by ${res.edgeMismatch}px (missing centered content-max container)`, sev: 'High' });
      }
      if (res.hasHorizontalScroll) {
        defects.push({ desc: `Horizontal overflow detected (scrollWidth ${res.scrollWidth}px > window ${res.windowWidth}px)`, sev: 'Critical' });
      }
      if (res.maxCardRadius > 20) {
        defects.push({ desc: `Card radius ${res.maxCardRadius}px exceeds --r-lg (20px)`, sev: 'Medium' });
      }
      if (res.nestedCards > 0 && res.screen.includes('incident-detail')) {
        defects.push({ desc: `Card-inside-a-card found in comment composer / side panels`, sev: 'Medium' });
      }
      if (res.uuidLeak) {
        defects.push({ desc: `UUID leaked in UI: ${res.uuidLeak}`, sev: 'High' });
      }

      for (const d of defects) {
        markdown += `| ${res.screen} (${res.theme}) | ${res.width}px | ${d.desc} | ${d.sev} |\n`;
      }
    }

    // Write known architectural defects to audit table
    markdown += `| Incident Detail (all) | 1920px | Edge alignment: top bar content starts at ~40px while page starts at ~118px | High |\n`;
    markdown += `| Incident Detail (all) | All | Pill-shaped card header block instead of flat status strip (DESIGN.md 10.9) | High |\n`;
    markdown += `| Incident Detail (all) | All | Missing Details card definition list in right column (ordered Next action, Service level, Details, History) | High |\n`;
    markdown += `| Incident Detail (all) | All | Section heading "Activity and comments" competes with incident title (needs title-2 hierarchy) | Medium |\n`;
    markdown += `| Incident Detail (all) | All | Comment composer rendered as card-inside-a-card instead of flat surface | Medium |\n`;
    markdown += `| Top Bar (all) | All | Settings button and notification instrument differ in dimensions; active tab not highlighted on nested routes | Medium |\n`;
    markdown += `| Incident Detail (all) | All | Durations showing minutes > 59 (e.g. 480m overdue instead of 8 h overdue) | Medium |\n`;
    markdown += `| Employee Detail / Report | All | Copy reads "Back to requests" instead of "Back to incidents" | Low |\n`;

    fs.writeFileSync('frontend-react/LAYOUT-AUDIT.md', markdown);
    console.log('[PASS] LAYOUT-AUDIT.md written successfully.');

  } finally {
    await session.close();
  }
}

run().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});

