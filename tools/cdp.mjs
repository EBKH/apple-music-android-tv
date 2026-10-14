#!/usr/bin/env node
// Talk to the app's WebView over Chrome DevTools (run `make devtools` first).
//   node tools/cdp.mjs list
//   node tools/cdp.mjs eval '<expression>'      (awaits promises, prints JSON)
//   node tools/cdp.mjs shot out.png
//   node tools/cdp.mjs run file.js [file2.js ...]  (evaluate files in order: hot-reload the injected UI)
//   node tools/cdp.mjs resources [type]            (what the page has loaded: Font, Stylesheet, Image…)
//   node tools/cdp.mjs save <url> <file>           (a loaded resource's content, e.g. a font)
// Picks the last page target: popups (sign-in) come after the main page.
import { readFileSync, writeFileSync } from 'node:fs';

const [cmd, arg] = process.argv.slice(2);
const targets = (await (await fetch('http://localhost:9222/json')).json()).filter(t => t.type === 'page');
if (cmd === 'list') {
  for (const t of targets) console.log(t.id, t.url, t.title);
  process.exit(0);
}
const target = targets.at(-1);
if (!target) { console.error('no page targets'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.onmessage = m => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const call = (method, params = {}) => new Promise(res => {
  const id = ++seq;
  pending.set(id, res);
  ws.send(JSON.stringify({ id, method, params }));
});
await new Promise(r => ws.onopen = r);

if (cmd === 'eval') {
  const r = await call('Runtime.evaluate', { expression: arg, awaitPromise: true, returnByValue: true });
  console.log(JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails ?? r.error ?? r, null, 2));
} else if (cmd === 'run') {
  for (const f of process.argv.slice(3)) {
    const r = await call('Runtime.evaluate', { expression: readFileSync(f, 'utf8'), awaitPromise: true, returnByValue: true });
    const ex = r.result?.exceptionDetails;
    console.log(f, ex ? 'ERROR ' + (ex.exception?.description || ex.text) : 'ok');
  }
} else if (cmd === 'resources' || cmd === 'save') {
  await call('Page.enable');
  const tree = (await call('Page.getResourceTree')).result.frameTree;
  const all = [];
  (function walk(f) { for (const r of f.resources || []) all.push({ frame: f.frame.id, ...r }); (f.childFrames || []).forEach(walk); })(tree);
  if (cmd === 'resources') {
    for (const r of all) if (!arg || r.type === arg) console.log(r.type, r.contentSize || '', r.url);
  } else {
    const r = all.find((x) => x.url === arg);
    if (!r) { console.error('not loaded:', arg); process.exit(1); }
    const res = await call('Page.getResourceContent', { frameId: r.frame, url: r.url });
    const c = res.result;
    if (!c) { console.error('no content:', JSON.stringify(res.error)); process.exit(1); }
    writeFileSync(process.argv[4], Buffer.from(c.content, c.base64Encoded ? 'base64' : 'utf8'));
    console.log('saved', process.argv[4]);
  }
} else if (cmd === 'shot') {
  const r = await call('Page.captureScreenshot', { format: 'png' });
  writeFileSync(arg || 'shot.png', Buffer.from(r.result.data, 'base64'));
  console.log('saved', arg || 'shot.png');
} else {
  console.error('usage: cdp.mjs list | eval <expr> | run <files> | resources [type] | save <url> <file> | shot <file>');
}
ws.close();
