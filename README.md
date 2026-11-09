# whyhirepruitt

Source for **[whyhirepruitt.dev](https://whyhirepruitt.dev)**, the portfolio of Pruitt Colon, AI engineer.

The site shows three Android apps that put AI on real devices, each with a public signed build:

- **[Vox Amelior](https://github.com/prunewhip/Vox_Amelior/tree/631d215e7253021196b20e1a8189be653c669883/vox_mobile)**: an always-on assistant that transcribes, recognizes voices and answers questions on the phone.
- **[Narrator Studio](https://github.com/prunewhip/Vox_Amelior/tree/narrator-studio/narrator_studio)**: text and PDFs to chaptered podcasts, with four on-device voice engines.
- **[Even Suite](https://github.com/prunewhip/Vox_Amelior/tree/even-suite/even_suite)**: hands-free Claude on Even Realities G1 smart glasses, plus screen mirroring.

The site tells one story: the first steps toward a human–AI interface, an AI that hears you, shows you and speaks to
you. The home page opens on the real devices turning on a turntable (`js/3d/showcase.js`): the phone runs all three apps
and the G1 glasses stream a live reply from Claude. "The idea" shows the project as a 3D symbol (`js/3d/symbol.js`).
Vox Amelior, the main app, has its 2:55 concept commercial and a phone that opens, as you scroll, into the five layers
of AI that run inside it, each labelled with its model. "Other apps" gives Even Suite and Narrator Studio a turning
device each (glasses streaming Claude's reply; words flowing into the phone and sound rippling out). Numbered
sections, a scroll cue, "Next" links and an on-page rail lead the way. "How it's built" has a
48-second product tour and each app's pipeline. The look is "Field notes": near-white paper, green-black ink, one spruce accent, flat.

## Structure

| Path | What it is |
| --- | --- |
| `index.html`, `about.html`, `architecture.html`, `contact.html` | Main pages (static HTML, no build step) |
| `css/design-system.css` | Tokens, base styles and shared components |
| `css/pages/*.css`, `css/components/*.css`, `js/*.js` | Page and component styles and behaviour (`player.*` is the shared video player) |
| `js/3d/` | Three.js scenes: shared stage, procedural phone and glasses, voice field, hero, work stage |
| `assets/vendor/three/` | Three.js r170 (MIT), vendored so the site has no CDN dependency |
| `assets/fonts/` | Self-hosted Geist and Geist Mono (OFL, see `OFL-LICENSES.txt`). Instrument Serif is kept but unused. |
| `assets/app/hd/` | Real app screenshots from each app's CI |
| `assets/audio/` | Narrator Studio's sample podcast, rendered in CI with the real voices |
| `assets/video/` | Concept commercial (`vox-film.*`, plus the 4:5 phone cut `vox-film-portrait.*`) and product tour (`vox-tour.*`): MP4, posters, chapters |
| `tools/film/` | Commercial source (`film.html`) and its baked 3D stills (`bake.html`, `bake.mjs`) |
| `docs/FILM_SCRIPT.md` | The commercial's script and why it has a phone cut |
| `tools/promo-video/` | Product tour source and the shared video renderer (`render.mjs`) |
| `tools/brand/` | Source and renderer for the favicons and social image |
| `tools/3d/` | Test pages for the 3D scenes |
| `demo/` | Earlier web dashboard concept (static mock data, no longer linked) |

The 3D loads after the page is interactive, only on browsers with WebGL 2, and pauses when it's off screen.
Without WebGL, or with reduced motion, the same content shows as screenshots.

## Local preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Regenerating the video and brand assets

```bash
npm i playwright@1.49 && npx playwright install chromium   # ffmpeg must also be on PATH
node tools/promo-video/bake-3d.mjs                          # only after changing js/3d/: re-bakes the 3D stills
node tools/promo-video/render.mjs --preview 5,30,poster     # still frames → tools/promo-video/preview/
node tools/promo-video/render.mjs                           # product tour → assets/video/vox-tour.*
node tools/film/bake.mjs                                    # only after changing js/3d/: the film's 3D stills
node tools/promo-video/render.mjs --page tools/film/film.html --name vox-film   # the commercial (16:9)
node tools/promo-video/render.mjs --page "tools/film/film.html?format=portrait" --name vox-film-portrait   # its phone cut (4:5)
node tools/brand/render-brand.mjs                           # favicons + assets/og-image.jpg
```

`render.mjs --start-frame <n> --end-frame <m>` renders a slice of frames without encoding, so a long render
can be resumed.

## Contact

Pruitt Colon · [PruittColon@gmail.com](mailto:PruittColon@gmail.com) ·
[LinkedIn](https://www.linkedin.com/in/pruitt-colon-b3a73128a) · [GitHub](https://github.com/prunewhip)
