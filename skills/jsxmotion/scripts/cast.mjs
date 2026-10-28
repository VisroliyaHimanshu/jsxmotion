// Casts each role in scripts/<video>.json "cast" from the ElevenLabs Voice Library: several searches per role, merged,
// adult voices only, ranked by one year usage, a voice offered to one role only. Prints the top candidates and saves
// their free preview clips to voice-previews/<video>/ to listen to. No credits spent. Copy into <project>/scripts/.
// Put the ids the user picks in the script's "voices" (or "voice" for a single narrator).
// Usage: node scripts/cast.mjs <video> [topN]
//   "cast": { "HOST": { "gender": "male", "ages": ["middle_aged"], "terms": ["game show", "cheesy", "host"], "accent": "american" } }
//   gender: male | female | neutral; ages: any of young, middle_aged, old; accent optional; 3 to 6 terms work best.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

for (const envFile of [process.env.ELEVENLABS_ENV ?? new URL('../.env', import.meta.url).pathname,
  join(homedir(), '.claude', 'jsxmotion', 'elevenlabs.env')]) {
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error('ELEVENLABS_API_KEY missing (see docs/GUIDE.md, Keys)'); process.exit(1); }

const [video, topArg] = process.argv.slice(2);
const top = Number(topArg ?? 5);
const root = new URL('../', import.meta.url);
const { cast } = JSON.parse(readFileSync(new URL(`scripts/${video}.json`, root)));
if (!cast) { console.error(`scripts/${video}.json has no "cast"`); process.exit(1); }
const dir = new URL(`voice-previews/${video}/`, root).pathname;
mkdirSync(dir, { recursive: true });

const headers = key === 'proxy' ? {} : { 'xi-api-key': key };
const childlike = /\b(kids?|child(ren)?|teens?|teenage(r)?|baby|toddler)\b/i;
const seen = new Set();
for (const [role, { gender, ages = ['young', 'middle_aged', 'old'], terms, accent }] of Object.entries(cast)) {
  const pool = new Map();
  for (const search of terms) {
    const p = new URLSearchParams({ page_size: '30', language: 'en', search, sort: 'usage_character_count_1y',
      ...(gender && { gender }), ...(accent && { accent }) });
    const res = await fetch(`https://api.elevenlabs.io/v1/shared-voices?${p}`, { headers });
    if (!res.ok) { console.error('HTTP', res.status, (await res.text()).slice(0, 300)); process.exit(1); }
    for (const v of (await res.json()).voices ?? []) {
      if (ages.includes(v.age) && !childlike.test(`${v.name} ${v.description ?? ''}`)) pool.set(v.voice_id, v);
    }
  }
  const ranked = [...pool.values()].filter(v => !seen.has(v.voice_id))
    .sort((a, b) => (b.usage_character_count_1y ?? 0) - (a.usage_character_count_1y ?? 0)).slice(0, top);
  console.log(`\n## ${role}  (${pool.size} matched)`);
  for (const [n, v] of ranked.entries()) {
    seen.add(v.voice_id);
    const file = `${role}-${n + 1}-${v.name.replace(/[^A-Za-z0-9]+/g, '-').slice(0, 30)}.mp3`;
    if (v.preview_url) writeFileSync(join(dir, file), Buffer.from(await (await fetch(v.preview_url)).arrayBuffer()));
    console.log(`${n + 1}. ${v.name} | ${v.age} ${v.accent} ${v.descriptive ?? ''} ${v.use_case ?? ''} | ` +
      `${Math.round((v.usage_character_count_1y ?? 0) / 1e6)}M/yr | ${v.voice_id}\n   ${(v.description ?? '').replace(/\s+/g, ' ').slice(0, 160)}\n   ${join(dir, file)}`);
  }
}
