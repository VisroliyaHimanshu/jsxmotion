// Renders chosen frames of a composition to qa/<id>-<frame>.png with one bundle.
// Usage: node qa/stills.mjs DocumentUpload 300 384 ...
import { existsSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
const [id, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: new URL('../src/index.ts', import.meta.url).pathname });
// Remotion renders with a Chromium browser only (Firefox and Safari can't). Use REMOTION_BROWSER if set, else the first
// installed Chrome, Chromium, Edge or Brave; with none, Remotion downloads its own headless Chrome on first run.
const { PROGRAMFILES: pf = 'C:\\Program Files', 'PROGRAMFILES(X86)': pf86 = 'C:\\Program Files (x86)' } = process.env;
const BROWSERS = {
  darwin: ['Google Chrome', 'Chromium', 'Microsoft Edge', 'Brave Browser'].map(n => `/Applications/${n}.app/Contents/MacOS/${n}`),
  linux: ['google-chrome', 'google-chrome-stable', 'chromium', 'microsoft-edge', 'brave-browser'].map(n => `/usr/bin/${n}`),
  win32: [`${pf}\\Google\\Chrome\\Application\\chrome.exe`, `${pf86}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${pf}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`],
};
const browserExecutable = process.env.REMOTION_BROWSER || (BROWSERS[process.platform] ?? []).find(existsSync) || null;
console.log('browser:', browserExecutable ?? "Remotion's own headless Chrome");
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: new URL(`${id}-${f}.png`, import.meta.url).pathname, browserExecutable });
  console.log('frame', f);
}
