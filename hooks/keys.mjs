// SessionStart hook: hands the ElevenLabs key and voices entered in the plugin's settings to scripts/tts.mjs.
// Commands Claude runs never see plugin options, so they go to ~/.claude/jsxreel/elevenlabs.env, readable by the user only,
// which tts.mjs reads after the project's own .env. Other lines in that file are kept, so a voice removed from the settings
// stays there (unused) until deleted by hand. Prints nothing: a SessionStart hook's stdout would land in Claude's context.
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

const clean = v => v?.replace(/[\r\n]/g, '').trim();
const set = {
  ELEVENLABS_API_KEY: clean(process.env.CLAUDE_PLUGIN_OPTION_ELEVENLABS_API_KEY),
  VOICE_ID: clean(process.env.CLAUDE_PLUGIN_OPTION_VOICE_ID),
};
// "HOST=abc123, GUEST=def456" → VOICE_HOST, VOICE_GUEST. A malformed pair is skipped.
for (const pair of clean(process.env.CLAUDE_PLUGIN_OPTION_VOICES)?.split(',') ?? []) {
  const at = pair.indexOf('=');
  const name = pair.slice(0, at).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const id = pair.slice(at + 1).trim();
  if (at > 0 && name && /^[A-Za-z0-9]+$/.test(id)) set[`VOICE_${name}`] = id;
}
// Nothing entered: leave a hand written file alone.
if (!Object.values(set).some(Boolean)) process.exit(0);

const dir = join(homedir(), '.claude', 'jsxreel');
const file = join(dir, 'elevenlabs.env');
const vars = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
for (const [name, value] of Object.entries(set)) if (value) vars[name] = value;

mkdirSync(dir, { recursive: true });
writeFileSync(file, Object.entries(vars).map(([name, value]) => `${name}=${value}\n`).join(''), { mode: 0o600 });
chmodSync(file, 0o600);
