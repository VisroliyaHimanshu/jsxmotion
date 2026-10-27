# Video kinds

## App guide (tutorial, how to, walkthrough)
- Vertical 1080×1920, about 1 min. A phone shows the app's real screens rebuilt from the app's code: tokens, fonts, icons, exact copy, Flutter/RN curves and durations (`motion.ts` maps them). Never invent UI or copy.
- Read the code of every screen in the flow: widgets, picker and sheet behaviour, initial values, route transitions, toasts.
- Server driven lists (document types, leave types) come from the live API, read only, logged in the way the app does; keep its order and port the app's icon and tint rules. Sample records are invented in one `data.ts` and listed in the report.
- Taps press on the word that names them. "Cover both" entry paths: ring the shortcut with a tag, tap the always available path. ElevenLabs pauses after "Tap" before a capitalised label; say "tap the X card".
- Guide shape that worked: intro = app icon (light variant, `sips -Z 512`) + "HOW TO" + title; captions mirror the voice; outro = logo, route recap pill, support contact card at the `it` mark, "Thank you" at `thanks`. Closing line: "<why it matters>. For any issues, please contact <support team>. Thank you."
- Build shared pieces once per project (finger with glides, rings measured from `data-*` targets, route slides, list flicks, captions) and extend shared screens with optional props only.

## Storyboard announcement or explainer (the user shares an image)
- Default vertical 1080×1920, loudness like guides (mean about -21 dB). First reply, before building: transcribe the panels into a flow table (time, scene, on screen, motion) and list the issues found, then ask.
- The storyboard's timestamps don't set the timing; the voice does. Its full text read aloud runs about twice its timestamps, so voice a tightened version and keep the full copy on screen as captions.
- Keep the storyboard's palette and composition. Redraw its pictures as animated vectors (skyline, devices, product windows, icons); fetch an official brand icon once, else draw it (Microsoft products: `https://res-1.cdn.office.net/files/fabric-cdn-prod_20230815.002/assets/brand-icons/product/svg/<product>_48x1.svg`, e.g. `outlook`).
- A "what you need to do" panel gets a short click through demo of the real UI, checked against the vendor's current help pages; the outro recaps that path. Name the labels you could not verify in the report.
- Supplied assets (signature, screenshot): crop to the part needed, keep the sample identity in every scene consistent with the asset, and flag personal data (phone, email) before it goes to an audience.

## Promo, ad, reel or skit (social)
- 30 to 40 s vertical. A hook on frame 0 (it is the cover). Teach the product to a stranger within about 5 s; captions explain, never just label; one reveal at a time; every beat long enough to read.
- Characters in dialogue: one multi voice take (eleven_v3 text to dialogue, audio tags), a fresh cast per video from a full Voice Library sweep, previews given to the user as local mp3s.
- Music and SFX (ElevenLabs) sit under the dialogue; render through the limiter pass to about -14 LUFS.
- Keep essential text out of the platform UI: top 260 px, bottom 350 px, right 120 px.
- No fake reviews or star ratings, no brands or celebrities, adult voices only, the product's own look.
