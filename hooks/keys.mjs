// Hands the ElevenLabs key and voices entered in the plugin's settings to scripts/tts.mjs and cast.mjs.
// Commands Claude runs never see plugin options, so they go to ~/.claude/jsxmotion/elevenlabs.env, readable by the user only,
// which the tools read after the project's own .env. Other lines in that file are kept, so a voice removed from the settings
// stays there (unused) until deleted by hand. Prints nothing: a SessionStart hook's stdout would land in Claude's context.
// Runs at session start, and again right before the voice tools run, so a key saved in the middle of a session works
// without opening a new one. Before any other Bash command it exits at once.
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

if (!process.stdin.isTTY) {
  let event;
  try { event = JSON.parse(readFileSync(0, 'utf8')); } catch { /* no hook input: run as before */ }
  if (event?.hook_event_name === 'PreToolUse' && !/\b(tts|cast)\.mjs\b/.test(event.tool_input?.command ?? '')) process.exit(0);
}

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

const dir = join(homedir(), '.claude', 'jsxmotion');
const file = join(dir, 'elevenlabs.env');
const vars = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
for (const [name, value] of Object.entries(set)) if (value) vars[name] = value;

mkdirSync(dir, { recursive: true });
writeFileSync(file, Object.entries(vars).map(([name, value]) => `${name}=${value}\n`).join(''), { mode: 0o600 });
chmodSync(file, 0o600);
