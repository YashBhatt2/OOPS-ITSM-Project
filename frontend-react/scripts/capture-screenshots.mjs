import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve('frontend-react/screenshots/phase-1');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('Starting preview server...');
const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '5173'], {
  cwd: path.resolve('frontend-react'),
  stdio: 'ignore',
  shell: true,
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    p.on('error', reject);
  });
}

async function capture() {
  await wait(3500);

  const screens = [
    { name: 'signin', path: '/signin' },
    { name: 'register', path: '/register' },
  ];

  const themes = [
    { name: 'obsidian', q: 'dark' },
    { name: 'ceramic', q: 'light' },
  ];

  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 900 },
  ];

  for (const s of screens) {
    for (const t of themes) {
      for (const v of viewports) {
        const outName = `${s.name}-${t.name}-${v.width}.png`;
        const outPath = path.join(OUT_DIR, outName);
        const url = `http://localhost:5173${s.path}?theme=${t.q}`;
        console.log(`Capturing ${outName}...`);

        const args = [
          '--headless=new',
          '--no-sandbox',
          '--disable-gpu',
          `--window-size=${v.width},${v.height}`,
          `--screenshot=${outPath}`,
          '--virtual-time-budget=3000',
          '--hide-scrollbars',
          url,
        ];

        try {
          await runCommand(CHROME_PATH, args);
          console.log(`Saved ${outName}`);
        } catch (err) {
          console.error(`Failed to capture ${outName}:`, err.message);
        }
      }
    }
  }

  preview.kill();
  process.exit(0);
}

capture().catch((err) => {
  console.error(err);
  preview.kill();
  process.exit(1);
});
