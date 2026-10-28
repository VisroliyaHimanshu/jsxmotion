---
name: jsxmotion
description: Use when asked to make, change, shorten, retime or re-voice a video with voiceover for any app or project, such as an app guide, tutorial, demo or walkthrough, an announcement or explainer built from a storyboard image, or a promo, ad, reel or skit (Remotion, ElevenLabs).
---

# JSXMotion

## Overview
A video here is React scenes animated in Remotion, voiced by ElevenLabs, with every beat timed to a spoken word. App and vendor UI is always rebuilt, never shown as screenshots, screen recordings or a slideshow of the storyboard. A supplied image that is itself the content (a signature, a logo, a product photo) may appear as an image. Each product keeps its own video project and its own look; this skill holds the process and the tools in `scripts/` in this skill's base directory (shown when the skill loads).

## Projects
Read `~/.claude/jsxmotion/projects.md` first if it exists (the user's private list, kept outside the skill so updates never touch it: folder, notes to read, voice command, conventions). Then read that project's own notes. A project not listed: ask the user where it lives, then add a row there.

New project: set it up yourself, the user should not have to. Check `node -v` (22 or newer) and `ffmpeg -version` first; if one is missing, offer the install command (macOS: `brew install node ffmpeg`) and run it on yes. Then a Remotion project inside the product's repo, with `scripts/tts.mjs` and `scripts/cast.mjs` copied from this skill and `stills.mjs` in `qa/`, `.env`, `voice-previews/` and `out/` in its `.gitignore`, and this `remotion.config.ts` (lossless frames keep small text and dark gradients clean; yuv420p plays everywhere, GitHub included):

```ts
import { Config } from '@remotion/cli/config';
Config.setVideoImageFormat('png');
Config.setPixelFormat('yuv420p');
Config.setCrf(16);
Config.setX264Preset('slow');
Config.setOverwriteOutput(true);
```

 An existing project keeps its own tools and voice command (its keys may load from elsewhere); when they lack something the video needs (casting, several voices, sfx, music), offer the skill's copies and ask before replacing a file. Never another product's visuals.

## Workflow
1. **Kind:** app guide, storyboard announcement or promo skit. Read its section in `kinds.md`.
2. **Ask** with AskUserQuestion (Recommended first, at most 4): format, length target, ending, and only what the material and project notes can't answer.
3. **Check the material before writing:** storyboard copy (wrong technical claims, dashes, text too long to voice); every on screen instruction (menu paths, labels) against the vendor's current docs or the app's code; personal data in supplied assets. Use what the user supplied, flag it, ask. Never swap it out silently. Secrets (a live QR code, a token, a password) never appear on screen; draw a dummy.
4. **Script** `scripts/<video>.json`: one line per scene, `marks` for every beat (exact, case sensitive phrase, unique in its line), `say` for spoken forms (numbers, URLs). Budget about 2.6 words/s plus 0.5 s per scene. Several characters: `voices` (role to voice) and `who` on every line, eleven_v3 audio tags in the text (`[whispers]`, `[laughs]`). Show the whole script as a table; spend credits only after approval.
5. **Cast** only for voices the user hasn't given. First `node scripts/tts.mjs keys` (names only, never values): with `VOICE_ID` set, one narrator uses it and nothing is cast unless the user asks for a new voice; set `VOICE_<NAME>`s cover those roles. Otherwise: `cast` roles in the script (gender, ages, 3 to 6 search terms, optional accent), `node scripts/cast.mjs <video>` (free, saves previews to `voice-previews/<video>/`), then give the user the preview paths per role with AskUserQuestion and put the picked ids in `voices` (or `voice` for one narrator). A voice the user already has: `VOICE_ID`, or `VOICE_<NAME>` from the plugin's "More voices" setting.
6. **Voice:** `node scripts/tts.mjs <video>`: one take for the whole script (one narrator, or one dialogue take for every voice), cut per line by alignment; the uncut take is kept as `<prefix>-take.mp3`. Then `node scripts/tts.mjs <video> check` transcribes every clip and compares it with its line (a few cents); listen to any line it marks CHECK. Then tighten: `python3 -I <skill dir>/scripts/tighten.py "$PWD" <video> <prefix>` (original kept in `.voice-orig/`, see `--help`). Skits keep their comic pauses instead. Music and sound effects: `sfx` and `music` in the script, then `node scripts/tts.mjs <video> sfx` and `music` (files on disk are skipped, `--force` redoes them). Keys: the environment, then the project's `.env`, then `~/.claude/jsxmotion/elevenlabs.env` (the plugin writes it from its settings at session start and right before these tools run, so a key saved mid session works at once). Keys missing: point the user to the plugin's settings (`/plugin`, Installed, JSXMotion, Configure options) or one of those files. In a cloud session the key comes from a network secret (`ELEVENLABS_API_KEY=proxy`, see `docs/GUIDE.md`, Use it in the browser). Never ask the user to paste a key into the chat.
7. **Build:** `data.ts`, `timeline.ts`, scenes, CSS in its own file with a new class prefix. Scene length = max(MIN, LEAD + clip + TAIL), LEAD about 0.15, TAIL about 0.2; MIN covers the scene's last event + 0.6 s; a click demo gets a longer LEAD so the UI is visible before the first click. Register in `Root.tsx`, add `voice:`/`render:` scripts, and note the video in the project's notes (README or plan). Then the **look** (below).
8. **QA** (below), then **report**: absolute mp4 path, length against target, assumptions to confirm (sample data, reconstructed UI labels, any approved line you changed, old and new side by side), what to check by ear. Commit only when asked.

## Look
A flat dark frame with small UI reads as a wireframe, however correct it is. Every video, in the product's own palette:
- **Fill the frame.** What the scene is about takes most of it; no big empty panels. Terminal and UI text at least 28 px at 1080p, captions 44 to 52 px bold with the key words in an accent colour, on one line where possible.
- **Depth.** A coloured backdrop (soft drifting light, fine grain so dark gradients don't band, a vignette); windows, phones and cards float on it with deep layered shadows.
- **Camera.** A slow push on every scene, and a push in on what changes (a command typing, a form filling, a tap), pulled back after. Check the first and last frame of each push: nothing important cropped.
- **Motion.** Entrances rise and sharpen out of a short blur; a big moment lands centre stage, then steps aside for what follows.
- **Check at the size people watch it:** a README shows about 880 px wide, a phone feed about 400. Look at stills scaled to that.

## QA
- `npx tsc --noEmit`; `node qa/stills.mjs <Comp> <frames…>` (rerun if the first call after an edit crashes).
- Every tap or click on its press frame, stacked in one contact sheet: the finger or cursor sits on the target.
- 4 to 5 frames across each transition.
- ffprobe length; loudness per project (guides: mean about -21 dB; social and README: about -14 LUFS, peak at most -0.8 dB). Measure with `ffmpeg -i <raw.mp4> -af ebur128=peak=true -f null -`, then `-c:v copy -af "volume=<gain>dB,alimiter=limit=0.89:level=false" -c:a aac -b:a 256k`. silencedetect for gaps over about 1.3 s that aren't deliberate comic beats.
- For a GitHub README: the mp4 under 10 MB (free accounts' upload limit), plus an optional short GIF loop of the best moment (880 px wide, 15 fps, about 5 s).
- Changed a shared file: render an older video's frame, PSNR must be `inf`.
- Delete the QA PNGs (`find qa -name '*.png' -delete`; in zsh `rm qa/*.png` fails when there are none).

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
| Casting when the user already set a voice | `node scripts/tts.mjs keys` first. |
| A wireframe look: flat dark, small UI, empty space | See **Look**: fill the frame, depth, camera, blur in entrances. |
| A zoom crops the text it is meant to show | Pan the focus along with what's typing; check both ends of the push. |
| ElevenLabs sound effects under 0.5 s | `tts.mjs` clamps to 0.5 to 30 s; trim shorter sounds in the video. |
