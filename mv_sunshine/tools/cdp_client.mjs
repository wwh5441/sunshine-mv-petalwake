// Zero-dependency Chrome DevTools Protocol Metal-WebGL client + local static server for Petalwake MV.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PETALWAKE_ROOT = path.resolve(__dirname, '../..');

const CHROME_BIN =
  process.env.CHROME_BIN ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.u16': 'application/octet-stream',
  '.wasm': 'application/wasm',
};

export function startLocalServer(rootDir = PETALWAKE_ROOT) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const cleanPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = cleanPath === '/' ? '/index.html' : cleanPath;
      const fullPath = path.resolve(rootDir, '.' + rel);
      if (!fullPath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.stat(fullPath, (err, st) => {
        if (err || !st.isFile()) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(fullPath).toLowerCase();
        res.writeHead(200, {
          'Content-Type': MIME_MAP[ext] || 'application/octet-stream',
          'Content-Length': st.size,
          'Cache-Control': 'no-store',
        });
        fs.createReadStream(fullPath).pipe(res);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

class CDPSocket {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      ws.addEventListener('open', () => resolve(this));
      ws.addEventListener('error', (ev) => reject(ev.error || new Error('CDP WebSocket error')));
      ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
        if (msg.id) {
          const entry = this.pending.get(msg.id);
          if (entry) {
            this.pending.delete(msg.id);
            if (msg.error) entry.reject(new Error(`CDP ${entry.method}: ${msg.error.message}`));
            else entry.resolve(msg.result);
          }
        } else if (msg.method) {
          const key = msg.sessionId ? `${msg.sessionId}:${msg.method}` : msg.method;
          for (const fn of this.listeners.get(key) || []) fn(msg.params);
        }
      });
      ws.addEventListener('close', () => {
        for (const [, entry] of this.pending) entry.reject(new Error('CDP WebSocket closed'));
        this.pending.clear();
      });
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  on(method, fn, sessionId = undefined) {
    const key = sessionId ? `${sessionId}:${method}` : method;
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(fn);
  }

  close() {
    try {
      this.ws?.close();
    } catch {}
  }
}

function launchHeadlessChrome(width, height) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'petalwake-mv-cdp-'));
  const args = [
    '--headless=new',
    '--use-angle=metal',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--disable-gpu-vsync',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--window-size=${width},${height}`,
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(CHROME_BIN, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderrBuf = '';
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        proc.kill('SIGKILL');
        reject(new Error(`Timed out waiting for Chrome WS URL:\n${stderrBuf}`));
      }
    }, 15000);

    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const match = /DevTools listening on (ws:\/\/[^\s\r\n]+)/.exec(stderrBuf);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ proc, wsUrl: match[1], userDataDir });
      }
    });
    proc.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

export async function withMetalBrowser(width, height, fn) {
  const { proc, wsUrl, userDataDir } = await launchHeadlessChrome(width, height);
  const cdp = await new CDPSocket(wsUrl).connect();
  const openedTargets = [];

  async function openMVPage(url) {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    openedTargets.push(targetId);
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: false },
      sessionId
    );

    const errors = [];
    cdp.on(
      'Runtime.exceptionThrown',
      (p) => {
        const txt = p?.exceptionDetails?.exception?.description || p?.exceptionDetails?.text || 'Uncaught';
        errors.push(txt);
        console.error('[page exception]:', txt);
      },
      sessionId
    );
    cdp.on(
      'Runtime.consoleAPICalled',
      (p) => {
        if (p?.type === 'error') {
          const txt = (p.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
          errors.push(txt);
          console.error('[console.error]:', txt);
        }
      },
      sessionId
    );

    await cdp.send('Page.navigate', { url }, sessionId);

    async function evaluate(pageFn, arg) {
      const expr =
        typeof pageFn === 'string'
          ? pageFn
          : `(${pageFn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)})`;
      const res = await cdp.send(
        'Runtime.evaluate',
        { expression: expr, awaitPromise: true, returnByValue: true },
        sessionId
      );
      if (res.exceptionDetails) {
        throw new Error(
          res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Eval error'
        );
      }
      return res.result?.value;
    }

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      const bootErr = await evaluate('window.__SUNSHINE_BOOT_ERROR__ || null');
      if (bootErr) throw new Error(`MV boot error: ${bootErr}`);
      const ready = await evaluate('window.__SUNSHINE_READY__ === true');
      if (ready) break;
      await new Promise((r) => setTimeout(r, 120));
    }
    const ok = await evaluate('window.__SUNSHINE_READY__ === true');
    if (!ok) throw new Error('Timed out waiting for __SUNSHINE_READY__');

    return { targetId, sessionId, errors, evaluate };
  }

  try {
    return await fn({ openMVPage });
  } finally {
    for (const targetId of openedTargets) {
      try {
        await cdp.send('Target.closeTarget', { targetId });
      } catch {}
    }
    cdp.close();
    try {
      proc.kill('SIGTERM');
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}
