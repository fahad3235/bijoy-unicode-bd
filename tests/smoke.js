// bijoy-unicode-bd -- headless-Chrome smoke test via raw CDP.
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9354;
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/bubd-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };

  // ---- Empty state ----
  check('page title', (await ev('document.title')) === 'Bijoy to Unicode Converter \u2014 bijoy-unicode-bd');
  check('default direction is Bijoy to Unicode', (await ev(`window.__bijoy.state.dir`)) === 'b2u');
  check('empty hint visible with no input', (await ev(`document.getElementById('emptyHint').hidden`)) === false);
  check('copy disabled with no input', (await ev(`document.getElementById('copyBtn').disabled`)) === true);
  check('notes list has 5 items', (await ev(`document.querySelectorAll('#notesList li').length`)) === 5);

  // ---- Live conversion Bijoy -> Unicode (famous line) ----
  await ev(`window.__bijoy.setInput('Avwg evsjvq Mvb MvB')`);
  check('B2U famous line converts', (await ev(`document.getElementById('outputText').value`)) === '\u0986\u09ae\u09bf \u09ac\u09be\u0982\u09b2\u09be\u09df \u0997\u09be\u09a8 \u0997\u09be\u0987');
  check('input count shows 19 characters', (await ev(`document.getElementById('inputCount').textContent`)).includes('19 characters'));
  check('output count shows Bengali', (await ev(`document.getElementById('outputCount').textContent`)).includes('characters'));

  // ---- Sample buttons load the right side for the direction ----
  await ev(`document.getElementById('sample3Btn').click()`);
  check('conjunct sample loads Bijoy input', (await ev(`document.getElementById('inputText').value`)) === 'wK\u0161\u2018 \u00b6gv ag\u00a9 c\u00d6Kvk msL\u00a8v we`\u00a8yr');
  check('conjunct sample converts', (await ev(`document.getElementById('outputText').value`)) === '\u0995\u09bf\u09a8\u09cd\u09a4\u09c1 \u0995\u09cd\u09b7\u09ae\u09be \u09a7\u09b0\u09cd\u09ae \u09aa\u09cd\u09b0\u0995\u09be\u09b6 \u09b8\u0982\u0996\u09cd\u09af\u09be \u09ac\u09bf\u09a6\u09cd\u09af\u09c1\u09ce');

  // ---- Round-trip verify: exact for the sample ----
  await ev(`document.getElementById('verifyBtn').click()`);
  check('verify shows ok class', (await ev(`document.getElementById('verifyResult').className`)) === 'verify ok');
  check('verify result visible', (await ev(`document.getElementById('verifyResult').hidden`)) === false);

  // ---- Switch direction: Unicode -> Bijoy ----
  await ev(`window.__bijoy.setDir('u2b')`);
  check('direction flips to u2b', (await ev(`window.__bijoy.state.dir`)) === 'u2b');
  await ev(`window.__bijoy.setInput('\u0986\u09ae\u09bf \u09ac\u09be\u0982\u09b2\u09be\u09df \u0997\u09be\u09a8 \u0997\u09be\u0987')`);
  check('U2B famous line converts', (await ev(`document.getElementById('outputText').value`)) === 'Avwg evsjvq Mvb MvB');
  await ev(`document.getElementById('sample2Btn').click()`);
  check('paragraph sample in u2b loads Unicode', (await ev(`document.getElementById('inputText').value`)) === '\u09ac\u09be\u0982\u09b2\u09be \u0986\u09ae\u09be\u09b0 \u09ad\u09be\u09b7\u09be\u0964 \u0986\u09ae\u09bf \u09ac\u09be\u0982\u09b2\u09be\u09df \u09a6\u09c7\u0996\u09bf \u09b8\u09cd\u09ac\u09aa\u09cd\u09a8!');
  check('paragraph sample converts to Bijoy', (await ev(`document.getElementById('outputText').value`)) === 'evsjv Avgvi fvlv| Avwg evsjvq \u2020`wL \u00af^c\u0153!');

  // ---- Swap button: output becomes input, direction flips ----
  await ev(`document.getElementById('swapBtn').click()`);
  check('swap flips direction back to b2u', (await ev(`window.__bijoy.state.dir`)) === 'b2u');
  check('swap puts old output in input', (await ev(`document.getElementById('inputText').value`)) === 'evsjv Avgvi fvlv| Avwg evsjvq \u2020`wL \u00af^c\u0153!');
  check('swap converts back to the paragraph', (await ev(`document.getElementById('outputText').value`)) === '\u09ac\u09be\u0982\u09b2\u09be \u0986\u09ae\u09be\u09b0 \u09ad\u09be\u09b7\u09be\u0964 \u0986\u09ae\u09bf \u09ac\u09be\u0982\u09b2\u09be\u09df \u09a6\u09c7\u0996\u09bf \u09b8\u09cd\u09ac\u09aa\u09cd\u09a8!');

  // ---- Clear ----
  await ev(`document.getElementById('clearBtn').click()`);
  check('clear empties input', (await ev(`document.getElementById('inputText').value`)) === '');
  check('clear empties output', (await ev(`document.getElementById('outputText').value`)) === '');
  check('empty hint returns after clear', (await ev(`document.getElementById('emptyHint').hidden`)) === false);

  // ---- Language toggle: Bengali UI + Bengali digits, persists ----
  await ev(`window.__bijoy.setInput('Avwg')`);
  await ev(`document.getElementById('langBtn').click()`);
  check('BN toggle: title in Bengali', (await ev(`document.getElementById('title').textContent`)) === '\u09ac\u09bf\u099c\u09af\u09bc \u2194 \u0987\u0989\u09a8\u09bf\u0995\u09cb\u09a1 \u0995\u09a8\u09ad\u09be\u09b0\u09cd\u099f\u09be\u09b0');
  check('BN toggle: counts use Bengali digits', (await ev(`document.getElementById('inputCount').textContent`)).includes('\u09ea'));
  check('BN toggle: direction button in Bengali', (await ev(`document.getElementById('dirB2U').textContent`)) === '\u09ac\u09bf\u099c\u09af\u09bc \u2192 \u0987\u0989\u09a8\u09bf\u0995\u09cb\u09a1');
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  check('BN toggle + input persist after reload', (await ev(`window.__bijoy.state.lang`)) === 'bn');
  check('input persists after reload', (await ev(`document.getElementById('inputText').value`)) === 'Avwg');
  check('conversion persists after reload', (await ev(`document.getElementById('outputText').value`)) === '\u0986\u09ae\u09bf');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN', (await ev(`window.__bijoy.state.lang`)) === 'en');

  // ---- Mobile 390px: no horizontal overflow ----
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow', overflow <= 0, 'overflow=' + overflow);

  // ---- Zero network requests: app is fully offline (only file:// loads) ----
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
