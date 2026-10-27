// One narrator for a video with ElevenLabs, in ONE request so the voice never changes. Copy into <project>/scripts/.
// Keys load at runtime from the project's .env (or the file named by ELEVENLABS_ENV) and are never printed:
//   ELEVENLABS_API_KEY, VOICE_ID  (optional ELEVEN_MODEL, default eleven_multilingual_v2)
// Usage: node scripts/tts.mjs <video>
//   reads  scripts/<video>.json            { "prefix": "ab", "lines": [{ "text": "...", "say": "spoken form", "marks": { "tap": "a phrase" } }] }
//   writes public/audio/<prefix>-line<i>.mp3 and src/videos/<video>/voice.json
//          (clip lengths, plus each mark's time in seconds from its clip start, so beats land on the word)
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

process.loadEnvFile(process.env.ELEVENLABS_ENV ?? new URL('../.env', import.meta.url).pathname);
const { ELEVENLABS_API_KEY: key, VOICE_ID: voice, ELEVEN_MODEL: model = 'eleven_multilingual_v2' } = process.env;
if (!key || !voice) { console.error('ELEVENLABS_API_KEY or VOICE_ID missing'); process.exit(1); }

const video = process.argv[2];
const root = new URL('../', import.meta.url);
const { prefix, lines } = JSON.parse(readFileSync(new URL(`scripts/${video}.json`, root)));
const texts = lines.map(l => l.say ?? l.text);
const full = texts.join('\n\n');

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
  body: JSON.stringify({
    text: full,
    model_id: model,
    voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
  }),
});
if (!res.ok) { console.error('HTTP', res.status, (await res.text()).slice(0, 500)); process.exit(1); }
const { audio_base64, alignment } = await res.json();

const tmp = new URL('.tts-tmp/', root);
mkdirSync(tmp, { recursive: true });
const rawPath = new URL('full.mp3', tmp).pathname;
const normPath = new URL('full.wav', tmp).pathname;
writeFileSync(rawPath, Buffer.from(audio_base64, 'base64'));
// One loudness pass over the whole read keeps every line at the same level.
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', rawPath, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', normPath]);

// Character offsets of each line inside `full`, mapped to the alignment's times.
const { character_start_times_seconds: cs, character_end_times_seconds: ce } = alignment;
let offset = 0;
const spans = texts.map(text => {
  const first = full.indexOf(text, offset), last = first + text.length - 1;
  offset = last + 1;
  return { first, start: cs[first], end: ce[last] };
});

mkdirSync(new URL('public/audio/', root), { recursive: true });
const clips = spans.map((s, i) => {
  const from = Math.max(0, s.start - 0.06);
  const next = spans[i + 1]?.start ?? Infinity;
  const to = Math.min(s.end + 0.25, next - 0.03);
  const out = new URL(`public/audio/${prefix}-line${i}.mp3`, root).pathname;
  const len = to - from;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', normPath,
    '-af', `afade=t=in:d=0.02,afade=t=out:st=${(len - 0.06).toFixed(3)}:d=0.06`, '-b:a', '192k', out]);
  console.log(`line ${i}: ${len.toFixed(2)}s  "${texts[i].slice(0, 48)}"`);
  return Number(len.toFixed(3));
});
const marks = lines.map((l, i) => Object.fromEntries(Object.entries(l.marks ?? {}).map(([name, phrase]) => {
  const at = full.indexOf(phrase, spans[i].first);
  if (at < 0 || at >= spans[i].first + texts[i].length) throw new Error(`line ${i}: mark "${name}" phrase not found: ${phrase}`);
  return [name, Number((cs[at] - Math.max(0, spans[i].start - 0.06)).toFixed(3))];
})));
mkdirSync(new URL(`src/videos/${video}/`, root), { recursive: true });
writeFileSync(new URL(`src/videos/${video}/voice.json`, root), JSON.stringify({ model, clips, marks }, null, 2) + '\n');
rmSync(tmp, { recursive: true, force: true });
