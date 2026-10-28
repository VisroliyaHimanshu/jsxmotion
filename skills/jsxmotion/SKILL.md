---
name: jsxmotion
description: Use when asked to make, change, shorten, retime or re-voice a video with voiceover for any app or project, such as an app guide, tutorial, demo or walkthrough, an announcement or explainer built from a storyboard image, or a promo, ad, reel or skit (Remotion, ElevenLabs).
---

# JSXMotion

## Overview
A video here is React scenes animated in Remotion, voiced by ElevenLabs, with every beat timed to a spoken word. App and vendor UI is always rebuilt, never shown as screenshots, screen recordings or a slideshow of the storyboard. A supplied image that is itself the content (a signature, a logo, a product photo) may appear as an image. Each product keeps its own video project and its own look; this skill holds the process and the tools in `scripts/` in this skill's base directory (shown when the skill loads).

## Projects
Read `~/.claude/jsxmotion/projects.md` first if it exists (the user's private list, kept outside the skill so updates never touch it: folder, notes to read, voice command, conventions). Then read that project's own notes. A project not listed: ask the user where it lives, then add a row there.

New project: set it up yourself, the user should not have to: a Remotion project inside the product's repo, with `scripts/tts.mjs` and `scripts/cast.mjs` copied from this skill and `stills.mjs` in `qa/`, and `.env`, `voice-previews/` and `out/` in its `.gitignore`. An existing project keeps its own tools and voice command (its keys may load from elsewhere); when they lack something the video needs (casting, several voices, sfx, music), offer the skill's copies and ask before replacing a file. Never another product's visuals.

## Workflow
1. **Kind:** app guide, storyboard announcement or promo skit. Read its section in `kinds.md`.
2. **Ask** with AskUserQuestion (Recommended first, at most 4): format, length target, ending, and only what the material and project notes can't answer.
3. **Check the material before writing:** storyboard copy (wrong technical claims, dashes, text too long to voice); every on screen instruction (menu paths, labels) against the vendor's current docs or the app's code; personal data in supplied assets. Use what the user supplied, flag it, ask. Never swap it out silently. Secrets (a live QR code, a token, a password) never appear on screen; draw a dummy.
4. **Script** `scripts/<video>.json`: one line per scene, `marks` for every beat (exact, case sensitive phrase, unique in its line), `say` for spoken forms (numbers, URLs). Budget about 2.6 words/s plus 0.5 s per scene. Several characters: `voices` (role to voice) and `who` on every line, eleven_v3 audio tags in the text (`[whispers]`, `[laughs]`). Show the whole script as a table; spend credits only after approval.
5. **Cast** when the video needs voices the user hasn't given: `cast` roles in the script (gender, ages, 3 to 6 search terms, optional accent), `node scripts/cast.mjs <video>` (free, saves previews to `voice-previews/<video>/`), then give the user the preview paths per role with AskUserQuestion and put the picked ids in `voices` (or `voice` for one narrator). A voice the user already has: `VOICE_ID`, or `VOICE_<NAME>` from the plugin's "More voices" setting.
6. **Voice:** `node scripts/tts.mjs <video>`: one take for the whole script (one narrator, or one dialogue take for every voice), cut per line by alignment; the uncut take is kept as `<prefix>-take.mp3`. Transcribe the clips (ElevenLabs speech to text, `POST /v1/speech-to-text`, model `scribe_v1`, or the project's own tool) to confirm each holds its own words; it costs a few cents a take. Then tighten: `python3 -I <skill dir>/scripts/tighten.py "$PWD" <video> <prefix>` (original kept in `.voice-orig/`, see `--help`). Skits keep their comic pauses instead. Music and sound effects: `sfx` and `music` in the script, then `node scripts/tts.mjs <video> sfx` and `music` (files on disk are skipped, `--force` redoes them). Keys: the environment, then the project's `.env`, then `~/.claude/jsxmotion/elevenlabs.env` (the plugin writes it at session start from its settings). Keys missing: point the user to the plugin's settings (`/plugin`, Installed, JSXMotion, Configure options, then a new session) or one of those files. In a cloud session the key comes from a network secret (`ELEVENLABS_API_KEY=proxy`, see the README's browser section). Never ask the user to paste a key into the chat.
7. **Build:** `data.ts`, `timeline.ts`, scenes, CSS in its own file with a new class prefix. Scene length = max(MIN, LEAD + clip + TAIL), LEAD about 0.15, TAIL about 0.2; MIN covers the scene's last event + 0.6 s; a click demo gets a longer LEAD so the UI is visible before the first click. Register in `Root.tsx`, add `voice:`/`render:` scripts, and note the video in the project's notes (README or plan).
8. **QA** (below), then **report**: absolute mp4 path, length against target, assumptions to confirm (sample data, reconstructed UI labels, any approved line you changed, old and new side by side), what to check by ear. Commit only when asked.

## QA
- `npx tsc --noEmit`; `node qa/stills.mjs <Comp> <frames…>` (rerun if the first call after an edit crashes).
- Every tap or click on its press frame, stacked in one contact sheet: the finger or cursor sits on the target.
- 4 to 5 frames across each transition.
- ffprobe length; loudness per project (guides: mean about -21 dB; social: about -14 LUFS, peak at most -0.8 dB); silencedetect for gaps over about 1.3 s that aren't deliberate comic beats.
- Changed a shared file: render an older video's frame, PSNR must be `inf`.
- Delete the QA PNGs.

## Common mistakes
| Mistake | Fix |
|---|---|
| Natural ElevenLabs pacing | Users find it slow. Tighten before the first render. |
| Recording before checking UI labels | Check vendor docs or app code first; a retake costs credits. |
| One TTS request per line | The voice changes between lines. One take per voice. |
| Hard coded beat times | Marks; a new take retimes everything. |
| Trusting alignment blindly | eleven_v3 dialogue drifted about 0.75 s. Transcribe the clips. |
| Another project's look | Each product's own kit; a storyboard keeps its own look. |
| Caller `style` spread onto a wrapper that sets `transform` | The caller's transform wins and the scale is lost. Put caller style on an outer div. |
| zsh: `$LIST` doesn't word split, `====` is an error | Inline lists; build ffmpeg filters in Python. |
| Port 3000 busy | A free `--port`. |
| No Chrome on the machine | Any Chromium browser works (Chromium, Edge, Brave via `--browser-executable`); with none, drop the flag and Remotion downloads its own headless Chrome. `stills.mjs` picks one itself. Firefox and Safari can't render. |
| Hand typed URLs in the report | Local paths only. |
