// Renders chosen frames of a composition to qa/<id>-<frame>.png with one bundle.
// Usage: node qa/stills.mjs DocumentUpload 300 384 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
const [id, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: new URL('../src/index.ts', import.meta.url).pathname });
const browserExecutable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const composition = await selectComposition({ serveUrl, id, browserExecutable });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: new URL(`${id}-${f}.png`, import.meta.url).pathname, browserExecutable });
  console.log('frame', f);
}
