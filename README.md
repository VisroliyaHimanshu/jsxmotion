# Talkiewright

**A Claude Code skill that makes talking pictures: narrated videos where every frame lands on the spoken word.**

The first films with synchronised sound were called *talkies*. A *wright* is a maker, as in playwright. Talkiewright teaches [Claude Code](https://claude.com/claude-code) to make talking pictures for your products: app walkthroughs, announcements built from a storyboard image, and short social promos. One skill covers every project you have.

- [What it does](#what-it-does)
- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Install](#install)
- [Set up a video project](#set-up-a-video-project)
- [Make a video](#make-a-video)
- [Script format](#script-format)
- [Tools](#tools)
- [Troubleshooting](#troubleshooting)
- [Privacy](#privacy)
- [License](#license)

## What it does

| Kind | You give Claude | You get |
|---|---|---|
| **App guide** | "Make a how to video for the leave flow" | The app's real screens rebuilt from its source code, with a finger tapping each button as the voice names it |
| **Storyboard announcement** | One storyboard image | Every panel redrawn and animated in the storyboard's own look, a voiced script, captions, and a click through demo for any "what you need to do" step |
| **Promo, reel or skit** | An idea for a 30 second ad | Characters in dialogue, music and sound effects, a hook on the first frame, and text kept clear of the Reels and TikTok buttons |

Every video comes out as an mp4, rendered locally, with a report of its length, anything Claude assumed, and what to check by ear.

## How it works

```mermaid
flowchart LR
  A[Your request<br/>or storyboard] --> B[Claude asks<br/>a few questions]
  B --> C[Script with<br/>word marks]
  C -->|you approve| D[ElevenLabs<br/>one take per voice]
  D --> E[Tighten pacing]
  E --> F[Remotion scenes<br/>timed to the words]
  F --> G[Frame by frame QA]
  G --> H[mp4]
```

- **Real motion.** Scenes are React components animated in [Remotion](https://www.remotion.dev). Screens are rebuilt from your app's code, so they match it exactly. No screen recordings, no slideshows.
- **One voice, one take.** Narration comes from [ElevenLabs](https://elevenlabs.io) in a single request per voice, so a voice never changes between lines. The take is then cut per line by its word timings.
- **Timed to the word.** Each script line carries `marks`, phrases whose spoken time drives the animation. Record a new take and the whole video retimes itself.
- **Tight pacing.** Natural speech feels slow on screen. `tighten.py` shortens long pauses and speeds the take up without spending new credits, and moves every mark with it.
- **Checked before done.** Claude checks on screen instructions against the vendor's current docs, gets your approval on the script before spending credits, and renders the exact frame of every tap or click to confirm it hits its target.

## Requirements

| Tool | Why | Install (macOS) |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | Runs the skill | see claude.com/claude-code |
| Node.js 22 or newer | Remotion and the voice script | `brew install node` |
| ffmpeg | Cuts and measures audio | `brew install ffmpeg` |
| Python 3 | `tighten.py` | preinstalled, or `brew install python` |
| Google Chrome | Renders the video frames | google.com/chrome |
| ElevenLabs account | The voices | elevenlabs.io (an API key and a voice id) |

Remotion has its own licence: free for individuals, a paid licence for some companies. Check [remotion.pro/license](https://www.remotion.pro/license) for your case.

## Install

```bash
git clone https://github.com/VisroliyaHimanshu/Talkiewright.git ~/.claude/skills/talkiewright
```

That's it. Claude Code loads skills from `~/.claude/skills/` on startup, so open a new session and Talkiewright is available. Claude picks it automatically when you ask for a video, or you can call it directly with `/talkiewright`.

Keeping the repo somewhere else? Clone it there and link it:

```bash
git clone https://github.com/VisroliyaHimanshu/Talkiewright.git ~/Code/Talkiewright
ln -s ~/Code/Talkiewright ~/.claude/skills/talkiewright
```

Update later with `git -C ~/.claude/skills/talkiewright pull`.

## Set up a video project

Each product keeps its videos in its own Remotion project, usually inside the product's repo. Claude can set this up for you when you ask for the first video. To do it yourself:

```bash
cd your-app
npx create-video@latest videos        # a blank Remotion project
cd videos
mkdir -p scripts qa
cp ~/.claude/skills/talkiewright/scripts/tts.mjs scripts/
cp ~/.claude/skills/talkiewright/scripts/stills.mjs qa/
```

Add your ElevenLabs keys to `videos/.env` and make sure `.env` is in `.gitignore`:

```bash
ELEVENLABS_API_KEY=your_key
VOICE_ID=the_voice_you_picked
```

Then tell Talkiewright about the project. Create `~/.claude/skills/talkiewright/projects.local.md`:

```markdown
| Project | Folder | Read first | Voice | Conventions |
|---|---|---|---|---|
| My App guides | `~/Code/my-app/videos` | README.md | `node scripts/tts.mjs <video>` | Friendly tone, brand colours from src/theme, end on the support email |
```

Git ignores this file, so your paths, client names and conventions never leave your machine. Add a row per project; one skill serves them all.

## Make a video

Ask in plain words. Some examples:

| You say | What happens |
|---|---|
| "Make a how to video for uploading a document in the app" | Claude reads the screens in that flow, asks about format, length and ending, then writes the script |
| "Here is a storyboard image, turn it into a video" | Claude transcribes every panel into a flow table, flags problems in the copy, then asks before building |
| "Make a 30 second promo for the game, idea: everyone has a friend who..." | Claude drafts a skit with a cast of voices, music and sound effects |
| "The video is too long, speed it up" | Claude tightens the existing take, no new credits |
| "Change line 3 to say..." | Claude rerecords the take and the video retimes itself |

What to expect along the way:

1. **Questions first.** Up to four, with a recommended answer: format (vertical 1080×1920 by default), target length, how it ends, and anything only you can decide.
2. **Script approval.** You see every line in a table before any ElevenLabs credits are spent.
3. **Voice.** One take, cut per line, checked by transcription, then tightened.
4. **Build and QA.** Scenes are built and timed to the words; every tap and transition is checked frame by frame.
5. **Report.** The mp4 path, its exact length against your target, what Claude assumed (sample names, any UI label it could not verify), and what to listen for.

Claude never commits to git unless you ask.

## Script format

A video's narration lives in `scripts/<video>.json`:

```json
{
  "prefix": "doc",
  "lines": [
    {
      "text": "Tap Submit and wait for the upload. Your passport is now on record.",
      "marks": { "submit": "Submit", "done": "Your passport" }
    },
    {
      "text": "Our support line is 800 1234.",
      "say": "Our support line is eight hundred, twelve thirty four."
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `prefix` | Short name for the audio files: `public/audio/<prefix>-line<i>.mp3` |
| `text` | What appears in captions |
| `say` | Optional. What the voice reads instead, for numbers, URLs and acronyms |
| `marks` | Optional. Name to phrase. The phrase must appear exactly (case sensitive) in the spoken line; its time is written to `voice.json` so the animation can fire on it |

In the video code, `m(line, "submit")` gives the second the voice says "Submit".

## Tools

All three live in `scripts/`. Run them from the video project's folder.

**`tts.mjs`** records one narrator in a single ElevenLabs request, normalises loudness, cuts it per line and writes `src/videos/<video>/voice.json` (clip lengths and mark times).

```bash
node scripts/tts.mjs <video>
```

Keys come from the project's `.env`, or from the file named in `ELEVENLABS_ENV`. Optional `ELEVEN_MODEL` (default `eleven_multilingual_v2`). It spends credits, so run it once per approved script.

**`tighten.py`** shortens pauses inside each line, trims the tail and speeds the take up, without new credits. Marks are remapped, so the video retimes on its own. Keep the untouched take in `.voice-orig/` first:

```bash
mkdir -p .voice-orig && cp public/audio/<prefix>-line*.mp3 src/videos/<video>/voice.json .voice-orig/
python3 -I ~/.claude/skills/talkiewright/scripts/tighten.py "$PWD" <video> <prefix>
```

| Flag | Default | Use |
|---|---|---|
| `--tempo` | `1.10` | Speed factor; pitch is kept |
| `--pause` | `0.28` | Longest pause kept inside a line, in seconds |
| `--keep LINE=SEC` | | A longer pause for one line, for example a click demo: `--keep 8=0.45` |

Running it again always starts from `.voice-orig/`, so you can try different settings safely.

**`stills.mjs`** renders chosen frames to PNG for checking, using one bundle:

```bash
node qa/stills.mjs <CompositionId> 120 360 540
```

It uses Google Chrome at its macOS path; on another system, change `browserExecutable` at the top of the file.

## Troubleshooting

| Problem | Fix |
|---|---|
| `ELEVENLABS_API_KEY or VOICE_ID missing` | Add both to the video project's `.env`, or point `ELEVENLABS_ENV` at your env file |
| `HTTP 401` (or another code) from ElevenLabs | The message printed after the code says which: a wrong key, or the plan is out of credits |
| `line 3: mark "submit" phrase not found` | The phrase must match the spoken line exactly, including capitals. Check `say` if the line has one |
| The voice changes between lines | Lines were recorded separately. Record the whole script in one take |
| The render can't find a browser | Add `--browser-executable "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"` |
| Port already in use | Add `--port=3917` (or any free port) to `remotion studio` and `remotion render` |
| A tap lands before the screen appears | Give that scene a longer lead in, or move the tap later in the timeline |

## Privacy

- `projects.local.md` is ignored by git; keep your project list there.
- Never commit `.env`. Keys are loaded at runtime and never printed.
- Claude flags personal data in images you supply (names, phone numbers, emails) and asks before it goes into a video.

## License

[MIT](LICENSE) © 2026 Himanshu Visroliya
