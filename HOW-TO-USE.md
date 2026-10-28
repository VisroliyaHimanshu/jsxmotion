# How to use JSXMotion

From install to your first finished video, step by step. Back to the [README](README.md).

1. [Before you start](#1-before-you-start)
2. [Install the plugin](#2-install-the-plugin)
3. [Add your ElevenLabs key](#3-add-your-elevenlabs-key)
4. [Ask for a video](#4-ask-for-a-video)
5. [Answer a few questions](#5-answer-a-few-questions)
6. [Approve the script](#6-approve-the-script)
7. [Pick a voice](#7-pick-a-voice)
8. [Get your video](#8-get-your-video)
9. [Change it](#9-change-it)

## 1. Before you start

| You need | Notes |
|---|---|
| [Claude Code](https://claude.com/claude-code) 2.1.275 or newer | Older versions work too, with one extra install command |
| An [ElevenLabs](https://elevenlabs.io) account and API key | Create the key in your ElevenLabs account settings. Voices, music and effects use your credits |
| Node.js 22 or newer, and ffmpeg | Claude checks both and offers to install anything missing |

## 2. Install the plugin

Inside Claude Code, run:

```
/plugin install jsxmotion --marketplace VisroliyaHimanshu/jsxmotion
```

The plugin's details open. Choose **Install for you (user scope)** so it works in every project.

On Claude Code older than 2.1.275, run these two instead:

```
/plugin marketplace add VisroliyaHimanshu/jsxmotion
/plugin install jsxmotion@jsxmotion
```

**Get updates automatically:** `/plugin` → **Marketplaces** → **jsxmotion** → **Enable auto-update**.

## 3. Add your ElevenLabs key

Right after install, Claude Code shows **Configure JSXMotion**:

| Row | What to do |
|---|---|
| **ElevenLabs API key** | Paste or type your key. It is hidden and saved in your system keychain |
| ElevenLabs voice ID | Optional. Paste a voice you like, or leave it empty and Claude finds one |
| More voices (for dialogue) | Optional. For skits: `HOST=voice_id, GUEST=voice_id` |

Then choose **Save configuration**. You don't need a new session.

Missed the screen, or want to change something later? `/plugin` → **Installed** → **JSXMotion** → **Configure options**.

## 4. Ask for a video

Open Claude Code **in your app's repository**, so Claude can read the screens it will rebuild. Then ask in plain words:

| To make | Say something like |
|---|---|
| An app guide | "Make a one minute how to video for uploading a document in the app." |
| An announcement | Attach a storyboard image and say "Turn this into an announcement video." |
| A promo or skit | "Make a funny 30 second promo for the app with two characters." |

The first time, Claude sets up a small video project inside your repository (usually a `videos/` folder), keeps your keys and renders out of git, and remembers the project for next time.

## 5. Answer a few questions

Claude asks up to four quick questions as multiple choice, with a recommended option first. Typically:

- **Format:** vertical for phones and social, or landscape for a website or README
- **Length:** for example 30, 45 or 60 seconds
- **Ending:** a support contact, a link, or your logo
- Anything your request and the app's code don't already answer

Claude also checks every on screen instruction (menu names, button labels) against your app's code or the vendor's current docs before writing.

## 6. Approve the script

Claude shows the whole script as a table: each line of narration next to what appears on screen at that moment.

- **Nothing is spent until you approve it.** Ask for any change first: a shorter line, a funnier tone, a different ending.
- Each spoken phrase that triggers an action (a tap, a reveal) is marked, so the animation lands exactly on that word.

## 7. Pick a voice

- **You set a voice ID:** Claude uses it. Nothing to pick.
- **You didn't:** Claude searches the ElevenLabs voice library for voices that fit, and saves free previews in `voice-previews/<video>/`. Listen, then pick one. Casting costs no credits.

Claude then records the whole script in one take (so the voice never changes between lines), checks every clip by transcription, and tightens the pacing. Promos also get music and sound effects.

## 8. Get your video

Claude builds the scenes, checks the frames (every tap on its target, nothing cut off), sets the loudness and renders. You get a short report:

- **Where the mp4 is**, usually `videos/out/<name>.mp4`
- **Its length** against your target
- **What Claude assumed** (sample names, labels it couldn't verify) for you to confirm
- **What to listen for**

Claude never commits to git unless you ask.

## 9. Change it

Just say what to change: "make line 3 shorter", "slower", "a different voice", "end on our website". Visual changes are free. A new voice take costs a few cents; Claude says so before recording again.

**Where things live in your video project:**

| Path | What it is |
|---|---|
| `scripts/<video>.json` | The script: lines, marks, voices, music and effects |
| `src/videos/<video>/` | The scenes, and `voice.json` with the word timings |
| `public/audio`, `public/music`, `public/sfx` | The recorded audio |
| `out/` | Your rendered videos |

Something not working? See [troubleshooting](docs/GUIDE.md#troubleshooting). Other install methods, the browser, keys per project and the script format are in the [guide](docs/GUIDE.md).
