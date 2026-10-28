"""Tighten a recorded take without new ElevenLabs credits: shorten pauses inside each line, trim the tail,
speed it up. Marks are remapped, so the video retimes on its own.

Run from the video project root, after copying the untouched take into .voice-orig/:
  mkdir -p .voice-orig && cp public/audio/<prefix>-line*.mp3 src/videos/<video>/voice.json .voice-orig/
  python3 -I <jsxreel skill dir>/scripts/tighten.py "$PWD" <video> <prefix> [--tempo 1.1] [--keep 8=0.45]
"""
import argparse, json, re, subprocess

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('root'); ap.add_argument('video'); ap.add_argument('prefix')
ap.add_argument('--tempo', type=float, default=1.10, help='speed factor, pitch kept (default 1.10)')
ap.add_argument('--pause', type=float, default=0.28, help='longest pause kept inside a line, seconds')
ap.add_argument('--keep', action='append', default=[], metavar='LINE=SEC', help='a longer pause for one line, e.g. a click demo')
a = ap.parse_args()
keep = {int(k): float(v) for k, v in (x.split('=') for x in a.keep)}
TAIL_KEEP = 0.12

orig = json.load(open(f'{a.root}/.voice-orig/voice.json'))
out = {**orig, 'clips': [], 'marks': [], **({'words': list(orig['words'])} if 'words' in orig else {})}
for i, _ in enumerate(orig['clips']):
    src = f'{a.root}/.voice-orig/{a.prefix}-line{i}.mp3'
    log = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', 'silencedetect=n=-40dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
    dur = float(re.findall(r'time=(\d+):(\d+):([\d.]+)', log)[-1][2])
    rem = []
    for s, e in zip(starts, ends + [dur] * (len(starts) - len(ends))):
        if s < 0.1: continue                                            # leading breath
        if e >= dur - 0.02: rem.append((s + TAIL_KEEP, dur)); continue  # trailing silence
        k = keep.get(i, a.pause)
        if e - s > k: rem.append((s + k / 2, e - k / 2))
    segs, pos = [], 0.0
    for s, e in rem:
        if s > pos: segs.append((pos, s))
        pos = e
    if pos < dur: segs.append((pos, dur))
    fc = ''.join(f'[0:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS[p{n}];' for n, (s, e) in enumerate(segs))
    fc += ''.join(f'[p{n}]' for n in range(len(segs))) + f'concat=n={len(segs)}:v=0:a=1,atempo={a.tempo}[o]'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, '-filter_complex', fc, '-map', '[o]', '-b:a', '192k',
                    f'{a.root}/public/audio/{a.prefix}-line{i}.mp3'], check=True)
    removed = lambda t: sum(min(e, t) - s for s, e in rem if s < t)
    out['clips'].append(round((dur - removed(dur)) / a.tempo, 3))
    out['marks'].append({k: round((v - removed(v)) / a.tempo, 3) for k, v in orig['marks'][i].items()})
    if 'words' in orig:  # dialogue takes: word by word caption times move with the audio too
        out['words'][i] = [{**w, 't': round((w['t'] - removed(w['t'])) / a.tempo, 3)} for w in orig['words'][i]]
    print(f'line {i}: {dur:.2f}s -> {out["clips"][-1]:.2f}s')
path = f'{a.root}/src/videos/{a.video}/voice.json'
json.dump(out, open(path, 'w'), indent=2)
open(path, 'a').write('\n')
print('total', round(sum(out['clips']), 2))
