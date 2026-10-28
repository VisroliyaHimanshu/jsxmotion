// All ElevenLabs audio for one video, from scripts/<video>.json. Copy into <project>/scripts/.
// Keys load at runtime and are never printed: ELEVENLABS_API_KEY, VOICE_ID (optional ELEVEN_MODEL, default eleven_multilingual_v2).
// First match wins: the environment, the project's .env (or the file named by ELEVENLABS_ENV), then
// ~/.claude/jsxmotion/elevenlabs.env, the keys shared by every project (the plugin writes it from its settings, or write it by hand).
// ELEVENLABS_API_KEY=proxy sends no key: a proxy adds it (Claude Code cloud sessions with a network secret).
// Usage: node scripts/tts.mjs <video> [voice|check|sfx|music] [--force]   ·   node scripts/tts.mjs keys
//   voice (default): ONE take, so a voice never changes between lines, then cut per line by its timings.
//     One narrator: "voice" in the script (else VOICE_ID) reads every line.
//     Several voices: "voices": { "HOST": "VOICE_ID", "GUEST": "VOICE_GUEST" } and "who" on every line give one eleven_v3
//     text to dialogue take (audio tags like [whispers] allowed, optional "seed"). A voices value is the name of a
//     variable holding a voice id, or the id itself.
//     writes public/audio/<prefix>-line<i>.mp3, the uncut take public/audio/<prefix>-take.mp3, and src/videos/<video>/voice.json:
//     clip lengths, each mark's time in seconds from its clip start (so beats land on the word), and for dialogue
//     the spoken words with their times, for word by word captions.
//   sfx: every "sfx" entry { "name": { "text", "duration" } } → public/sfx/<name>.mp3
//   music: "music" { "prompt", "ms" } → public/music/<prefix>.mp3 (instrumental)
//   check: transcribes every cut clip (ElevenLabs speech to text, a few cents) and compares it with the script line.
//   sfx and music skip files already on disk (credits), unless --force.
//   keys: which keys and voices are set, by name only. Check it before casting.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

// loadEnvFile never overwrites a variable that is already set, so the first file to set one wins.
for (const envFile of [process.env.ELEVENLABS_ENV ?? new URL('../.env', import.meta.url).pathname,
  join(homedir(), '.claude', 'jsxmotion', 'elevenlabs.env')]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
// `node scripts/tts.mjs keys`: which keys and voices are set, by name only (never the values). Check this before casting.
if (process.argv[2] === 'keys') {
  const names = ['ELEVENLABS_API_KEY', 'VOICE_ID', ...Object.keys(process.env).filter(n => n.startsWith('VOICE_') && n !== 'VOICE_ID').sort()];
  for (const n of names) console.log(`${n}: ${process.env[n] ? 'set' : 'missing'}`);
  process.exit(0);
}
const missing = name => {
  console.error(`${name} missing: set it in the JSXMotion plugin settings (/plugin, Installed, JSXMotion, Configure options), ` +
    "the project's .env or ~/.claude/jsxmotion/elevenlabs.env (use ELEVENLABS_API_KEY=proxy when a proxy adds the key)");
  process.exit(1);
};
const key = process.env.ELEVENLABS_API_KEY;
if (!key) missing('ELEVENLABS_API_KEY');

const [video, what = 'voice'] = process.argv.slice(2).filter(a => a !== '--force');
const force = process.argv.includes('--force');
const root = new URL('../', import.meta.url);
const path = p => new URL(p, root).pathname;
const spec = JSON.parse(readFileSync(path(`scripts/${video}.json`)));
const ff = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);

async function post(url, body) {
  const res = await fetch(`https://api.elevenlabs.io${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(key !== 'proxy' && { 'xi-api-key': key }) },
    body: JSON.stringify(body),
  });
  if (!res.ok) { console.error('HTTP', res.status, (await res.text()).slice(0, 500)); process.exit(1); }
  return res;
}

async function voice() {
  const { prefix, lines } = spec;
  const texts = lines.map(l => l.say ?? l.text);
  let model, take, text, cs, ce, spans, cut;

  // A voice in the script is the name of a variable holding a voice id, or the id itself.
  const voiceId = v => process.env[v] ?? (/^[A-Za-z0-9]{20}$/.test(v) ? v : null);

  if (!spec.voices) {
    // "voice" in the script picks this video's narrator; without it, VOICE_ID.
    const id = voiceId(spec.voice ?? 'VOICE_ID');
    if (!id) missing(spec.voice ? `narrator voice (${spec.voice})` : 'VOICE_ID');
    model = process.env.ELEVEN_MODEL ?? 'eleven_multilingual_v2';
    text = texts.join('\n\n');
    const res = await post(`/v1/text-to-speech/${id}/with-timestamps?output_format=mp3_44100_128`, {
      text,
      model_id: model,
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    });
    const { audio_base64, alignment } = await res.json();
    take = audio_base64;
    ({ character_start_times_seconds: cs, character_end_times_seconds: ce } = alignment);
    // Character offsets of each line inside the take's text, mapped to the alignment's times.
    let offset = 0;
    spans = texts.map(t => {
      const first = text.indexOf(t, offset), stop = first + t.length;
      offset = stop;
      return { first, stop, start: cs[first], end: ce[stop - 1] };
    });
    cut = (s, i) => {
      const from = Math.max(0, s.start - 0.06), to = Math.min(s.end + 0.25, (spans[i + 1]?.start ?? Infinity) - 0.03);
      return { from, to, fade: `afade=t=in:d=0.02,afade=t=out:st=${(to - from - 0.06).toFixed(3)}:d=0.06` };
    };
  } else {
    const ids = Object.fromEntries(Object.entries(spec.voices).map(([who, v]) => {
      const id = voiceId(v);
      if (!id) missing(`voice for ${who} (${v})`);
      return [who, id];
    }));
    lines.forEach((l, i) => { if (!ids[l.who]) throw new Error(`line ${i}: "who" must name one of voices (${Object.keys(ids).join(', ')})`); });
    model = 'eleven_v3'; // the only model text to dialogue takes
    const res = await post('/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128', {
      model_id: model,
      inputs: lines.map((l, i) => ({ text: texts[i], voice_id: ids[l.who] })),
      settings: { stability: 0.5 },
      ...(spec.seed != null && { seed: spec.seed }),
    });
    const { audio_base64, voice_segments, alignment } = await res.json();
    take = audio_base64;
    text = alignment.characters.join('');
    ({ character_start_times_seconds: cs, character_end_times_seconds: ce } = alignment);
    spans = lines.map((_, i) => {
      const segs = voice_segments.filter(s => s.dialogue_input_index === i);
      if (!segs.length) throw new Error(`line ${i}: no voice segment`);
      return {
        start: Math.min(...segs.map(s => s.start_time_seconds)),
        end: Math.max(...segs.map(s => s.end_time_seconds)),
        first: Math.min(...segs.map(s => s.character_start_index)),
        stop: Math.max(...segs.map(s => s.character_end_index)),
      };
    });
    cut = (s, i) => {
      const from = Math.max(0, s.start - 0.04, spans[i - 1]?.end ?? 0), to = Math.min(s.end + 0.15, spans[i + 1]?.start ?? Infinity);
      return { from, to, fade: `afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, to - from - 0.05).toFixed(3)}:d=0.05` };
    };
  }

  const tmp = path('.tts-tmp/');
  mkdirSync(tmp, { recursive: true });
  mkdirSync(path('public/audio/'), { recursive: true });
  // Keep the uncut take, so a bad cut can be redone without paying for a new take.
  writeFileSync(path(`public/audio/${prefix}-take.mp3`), Buffer.from(take, 'base64'));
  // One loudness pass over the whole take keeps every line and every voice at the same level.
  ff('-i', path(`public/audio/${prefix}-take.mp3`), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', tmp + 'full.wav');
  if (spec.voices) {
    // eleven_v3's timings can run behind the audio (once by about 0.75 s from line 1 on): every clip then opens on
    // the previous line's tail. Transcribe the clips before using them.
    const took = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', tmp + 'full.wav']));
    if (took - ce.at(-1) > 0.4) console.warn(`WARNING: the audio runs ${(took - ce.at(-1)).toFixed(2)} s past its timings, so these cuts are late. Check each clip before using it.`);
  }

  const clips = [], marks = [], words = [];
  spans.forEach((s, i) => {
    const { from, to, fade } = cut(s, i);
    const len = to - from;
    ff('-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', tmp + 'full.wav', '-af', fade, '-b:a', '192k',
      path(`public/audio/${prefix}-line${i}.mp3`));
    clips.push(Number(len.toFixed(3)));
    marks.push(Object.fromEntries(Object.entries(lines[i].marks ?? {}).map(([name, phrase]) => {
      const at = text.indexOf(phrase, s.first);
      if (at < 0 || at >= s.stop) throw new Error(`line ${i}: mark "${name}" phrase not found: ${phrase}`);
      return [name, Number((cs[at] - from).toFixed(3))];
    })));
    if (spec.voices) {
      // Spoken words with their start times, for word by word captions. Audio tags ([whispers]) drop out.
      const spoken = text.slice(s.first, s.stop).replace(/\[[^\]]*\]/g, m => ' '.repeat(m.length));
      words.push([...spoken.matchAll(/\S+/g)].map(m => ({ w: m[0], t: Number((cs[s.first + m.index] - from).toFixed(3)) })));
    }
    console.log(`line ${i}${lines[i].who ? ` ${lines[i].who}` : ''}: ${len.toFixed(2)}s  "${texts[i].slice(0, 48)}"`);
  });
  mkdirSync(path(`src/videos/${video}/`), { recursive: true });
  writeFileSync(path(`src/videos/${video}/voice.json`),
    JSON.stringify({ model, clips, marks, ...(spec.voices && { words }) }, null, 2) + '\n');
  rmSync(tmp, { recursive: true, force: true });
}

async function sfx() {
  mkdirSync(path('public/sfx/'), { recursive: true });
  for (const [name, { text, duration }] of Object.entries(spec.sfx ?? {})) {
    const out = path(`public/sfx/${name}.mp3`);
    if (existsSync(out) && !force) { console.log(`sfx ${name}: exists, skipped (--force to redo)`); continue; }
    // ElevenLabs takes 0.5 to 30 s; a shorter sound is trimmed in the video instead.
    const res = await post('/v1/sound-generation', { text, duration_seconds: Math.min(30, Math.max(0.5, duration)), prompt_influence: 0.6 });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    console.log(`sfx ${name}: done`);
  }
}

async function music() {
  const out = path(`public/music/${spec.prefix}.mp3`);
  if (existsSync(out) && !force) return console.log('music: exists, skipped (--force to redo)');
  mkdirSync(path('public/music/'), { recursive: true });
  const res = await post('/v1/music', { prompt: spec.music.prompt, music_length_ms: spec.music.ms, force_instrumental: true });
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log('music: done');
}

// Every cut clip must hold its own line, nothing from its neighbours: the alignment can drift (eleven_v3 did).
async function check() {
  const words = s => s.toLowerCase().replace(/\[[^\]]*\]/g, ' ').match(/[a-z0-9']+/g)?.join(' ') ?? '';
  let off = 0;
  for (const [i, l] of spec.lines.entries()) {
    const form = new FormData();
    form.append('model_id', 'scribe_v1');
    form.append('file', new Blob([readFileSync(path(`public/audio/${spec.prefix}-line${i}.mp3`))], { type: 'audio/mpeg' }), `line${i}.mp3`);
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', body: form, headers: key === 'proxy' ? {} : { 'xi-api-key': key } });
    if (!res.ok) { console.error('HTTP', res.status, (await res.text()).slice(0, 300)); process.exit(1); }
    const heard = (await res.json()).text.trim();
    const ok = words(heard).replace(/ /g, '') === words(l.say ?? l.text).replace(/ /g, '');
    if (!ok) off++;
    console.log(`line ${i}: ${ok ? 'ok   ' : 'CHECK'} heard "${heard}"`);
  }
  console.log(off ? `${off} line(s) to listen to: a word cut off, or one from the next line.` : 'every clip holds exactly its line');
}

const run = { voice, check, sfx, music }[what];
if (!run) { console.error('usage: node scripts/tts.mjs <video> [voice|check|sfx|music] [--force]   or   node scripts/tts.mjs keys'); process.exit(1); }
await run();
