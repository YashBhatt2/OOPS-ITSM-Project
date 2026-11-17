import fs from 'node:fs';
import path from 'node:path';

const port = 9228;
const outputDir = path.resolve('brag-output');
const framesDir = path.join(outputDir, 'frames');
fs.mkdirSync(framesDir, { recursive: true });

const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const target = targets.find((entry) => entry.type === 'page');
if (!target?.webSocketDebuggerUrl) throw new Error('No Chrome page is available for capture.');

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function command(method, params = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function captureFrame(index) {
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(framesDir, `frame-${String(index).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
}

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await command('Page.navigate', { url: 'http://127.0.0.1:5173/' });
await sleep(4500);

const pageInfo = await evaluate(`({ title: document.title, height: document.documentElement.scrollHeight })`);
console.log(`Capturing ${pageInfo.title}; page height ${pageInfo.height}px`);

let frame = 0;
const segments = [
  { start: 0, end: Math.min(700, pageInfo.height - 100), seconds: 2.8 },
  { start: Math.min(700, pageInfo.height - 100), end: Math.min(1900, pageInfo.height - 100), seconds: 4.2 },
  { start: Math.min(1900, pageInfo.height - 100), end: Math.min(3500, pageInfo.height - 100), seconds: 4.2 },
  { start: Math.min(3500, pageInfo.height - 100), end: pageInfo.height, seconds: 4.0 },
];

for (const segment of segments) {
  const count = Math.ceil(segment.seconds * 24);
  for (let step = 0; step < count; step++) {
    const progress = step / Math.max(1, count - 1);
    const eased = progress * progress * (3 - 2 * progress);
    const y = Math.round(segment.start + (segment.end - segment.start) * eased);
    await evaluate(`window.scrollTo({ top: ${y}, behavior: 'instant' })`);
    await sleep(1000 / 24);
    await captureFrame(frame++);
  }
}

await evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
await sleep(500);
await captureFrame(frame++);
socket.close();
console.log(`Captured ${frame} frames in ${framesDir}`);
