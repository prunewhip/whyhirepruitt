# whyhirepruitt.dev: 2026 redesign plan

Branch: `redesign-2026` (local only, not pushed and not committed until you review it)

## 1. What I found in the current site

| Area | Issue |
| --- | --- |
| Facts | The same numbers differ between pages: ML engines are 36 (home stats), 29 (home cards), 22 (about, resume, repo README) and 37 (architecture). Microservices are 12 (home, architecture) and 13 (about, README). |
| Contact | Email is `pruittcolon@gmail.com` (home, about, resume) on some pages and `pruittcolon@outlook.com` (contact) on another. LinkedIn is `/in/pruittcolon` (home, architecture) on some pages and `/in/pruitt-colon-b3a73128a` (about, contact) on others. |
| Footer | It is empty on About and Contact. Architecture says "Senior Software Engineer © 2024" and uses "GH"/"LI" text icons. |
| Broken UI | The "View Demo" hero button uses classes (`vox-btn`) that this stylesheet doesn't define, so it renders as plain text. On mobile the hero has a ~120 px empty gap from a `min-height` typewriter hack. Collapsed About cards still show their first line. Architecture connector lines don't meet their boxes. |
| Icons | Emoji icons render as empty boxes on systems without an emoji font. |
| Fonts | `JetBrains Mono` is referenced but never loaded on Home, so it falls back to Courier. |
| Performance | The portrait is a 5 MB PNG (2048²) shown at 320 px. There are no image dimensions, so the layout shifts. |
| Accessibility | No skip link. The menu button has no `aria-expanded`. Accordions are `div onclick`, so they can't be used by keyboard. Content is hidden (`opacity:0`) if JS fails. There is no reduced-motion handling. |
| SEO and sharing | No favicon, Open Graph or Twitter card, canonical URL, structured data, `robots.txt`, `sitemap.xml` or `404.html`. |
| Code | `console.log` debugging is left in the keyword explorer. It uses inline `onclick` with string interpolation. Two CSS variables are undefined (`--accent-hover`, `--surface-elevated`). Inline styles are mixed with stylesheets. |

## 2. Goals and guardrails

1. **High-end, consistent visual design** across Home, About, Architecture and Contact.
2. **A sales-pitch video section** on Home that shows what Vox Amelior does.
3. **Preserve everything that already works:** all content, URLs, the keyword-explorer code previews, the contact form (Web3Forms key unchanged), the resume files and the `demo/` app.
4. **Zero build step.** The site stays plain HTML/CSS/JS on GitHub Pages.
5. **Verified** at 360, 390, 768, 1440 and 1920 px wide, in light and dark mode, with no horizontal scroll and no console errors.

Out of scope (flagged, not touched): `demo/*` (bugs listed in §7), `predictions.html`, `projects.html` (orphaned, not linked), the resume HTML/PDF, and unused large files (`vendor/mermaid.min.js` 3.3 MB, `assets/hero.png` etc.). Nothing is deleted.

## 3. Design system v3 (`css/design-system.css`)

- **Type:** *Instrument Serif* for display headlines (with an italic accent), *Geist* (variable) for UI and body text, and *Geist Mono* for technical labels and code. Fonts are self-hosted WOFF2 (~100 KB total, OFL licensed, latin subset), with the two critical fonts preloaded and `font-display: swap`. There are no Google Fonts requests.
- **Color tokens:** warm paper background (`#F6F4EF`), ink text (`#16150F`) and one cobalt accent (`#3046D2`). A matching dark palette switches automatically with `prefers-color-scheme`. Every text/background pair is AA or better.
- **Fluid scale:** `clamp()` type and spacing, so mobile is designed rather than squeezed. There is one `--gutter` token (16 px on phones).
- **Components:** nav (with skip link, `aria-expanded`, Esc to close, scroll-locked mobile sheet), buttons (primary, secondary, ghost, all with 44 px minimum tap targets), cards, chips, section headers, stat strip, footer (one consistent footer on every page), focus rings and reduced-motion.
- **Motion:** subtle reveal-on-scroll that only runs when JS is present (`.js` class). Everything is visible without JS, and motion is disabled under `prefers-reduced-motion`.

## 4. Page-by-page

### Home (`index.html`)
1. **Hero:** "Open to full-time AI engineering roles" eyebrow; H1 "I build private AI that runs on hardware you already own." A one-sentence intro, CTAs (*Watch the 90-second tour* and *Explore the architecture*), and a proof strip (332K+ lines · 22 ML engines · 13 services · 7 languages). The typewriter is removed because it caused layout shift and repeated itself to screen readers.
2. **Video: "See Vox Amelior work."** A dark "theater" band with the video in a device frame, a custom poster and play button, then native controls. A chapter list (Capture → Understand → Analyze → Act → One GPU) seeks the video and highlights as it plays. There's a transcript disclosure for accessibility and a link to the live demo.
3. **60-second summary:** four capability cards with real SVG icons.
4. **Verify my skills:** the keyword explorer, restyled. The buttons get `aria-expanded`/`aria-controls`, event delegation replaces inline JS, and debug logs are removed.
5. **Featured work:** the flagship card plus three supporting cards.
6. **CTA band and footer.**

### About (`about.html`)
A sticky portrait sidebar on desktop (stacked on mobile) using an optimized portrait (AVIF/WebP/JPEG, ~60 KB instead of 5 MB). The story accordions become native `<details>`. The experience section becomes a timeline. Competencies, the stack, the standout quote and the resume download are restyled.

### Architecture (`architecture.html`)
A restyled hero with key numbers. The diagram is rebuilt so connector lines attach to node edges, redraw on resize/font load and get out of the way on mobile, where it becomes a vertical layered list. Service cards, the engine catalog and Kubernetes cards are restyled.

### Contact (`contact.html`)
A two-column layout with contact methods and the form. The form status uses `aria-live`, the submit button has a loading state, and there's a `mailto` fallback.

### New supporting files
`404.html`, `robots.txt`, `sitemap.xml`, `assets/favicon.svg` + PNG icons, `assets/og-image.jpg` (1200×630). Every page gets canonical, Open Graph, Twitter and `theme-color` tags. Home gets JSON-LD `Person` data.

## 5. The sales-pitch video

**Format:** 1920×1080, 30 fps, about 88 s and silent (it's designed to be watched muted, with on-screen copy). It ships as MP4/H.264 (Safari/iOS) and WebM/VP9, with a poster image and a WebVTT chapters track. It uses `preload="none"`, so it costs nothing until someone presses play.

**Approach:** the live `demo/` screens currently show empty states, "IMPACT: undefined", red ERROR badges and WebGL failures, and a raw recording would undersell the work. The video is instead a motion-designed product tour, built from the demo's own data (`demo/assets/js/mock_data.js`: the support call transcript, emotions, Titan churn results, CRM feed) and real system facts (Gemma 3 4B Q4, Parakeet ASR, 6 GB VRAM). It is rendered frame by frame from an HTML composition with headless Chromium and ffmpeg, so it is deterministic and reproducible (`tools/promo-video/`).

| Time | Scene | On-screen message |
| --- | --- | --- |
| 0:00 | Hook | "Every customer call holds the answer. Most AI tools ship it to someone else's cloud." |
| 0:06 | Problem | Data leaves the building · per-seat API fees · compliance risk |
| 0:12 | Reveal | **Vox Amelior**: enterprise AI that runs entirely on hardware you own |
| 0:18 | 01 Capture | Live transcript streams in with speaker labels and emotion tags |
| 0:32 | 02 Understand | Ask a question, and the answer streams back with transcript citations (RAG) |
| 0:46 | 03 Analyze | 22 engines light up, then churn model 94.2%, 4 segments, 12 anomalies and a forecast |
| 1:00 | 04 Act | The CRM feed surfaces the next best action |
| 1:10 | One GPU | 6 GB VRAM meter with semaphore hand-off; 13 services · AES-256 · $0 API fees |
| 1:20 | CTA | "Designed and built end-to-end by Pruitt Colon" |

## 6. Verification checklist

Results from the verification run (2026-10-22). The scripts are kept outside the repo, in `/root/site-tools/verify.mjs` and `lh.mjs`.

- [x] 60 renders: 5 pages × 6 widths (360/390/768/1024/1440/1920) × light/dark. Screenshots at 390 and 1440 px were reviewed by eye.
- [x] No horizontal scroll on any page at any width.
- [x] No console errors and no failed requests. All 34 internal links and assets resolve. All 61 keyword-explorer GitHub links resolve on `main` (6 stale paths fixed).
- [x] `html-validate` passes on all five pages. `role="list"` is kept on purpose (Safari/VoiceOver drops list semantics when `list-style: none`), so the rules that flag it are off.
- [x] Lighthouse (local server, run before GitHub Pages gzip): Accessibility, Best Practices and SEO are **100** on every page for both mobile and desktop. Performance on mobile/desktop is 94/100 (home), 98/100 (about), 99/100 (architecture) and 99/100 (contact). CLS is 0 and TBT 0 ms everywhere. The only items left are hosting-level (compression and cache headers, which GitHub Pages handles) and unminified CSS/JS, which I kept readable on purpose since there's no build step.
- [x] Keyboard: menu (Esc closes and returns focus; the page behind is `inert`), accordions (Enter), keyword panels (`aria-expanded`), chapter buttons and form validation.
- [x] Video: H.264 High and VP9, 1920×1080, 30 fps, 88.0 s, BT.709 limited range, `faststart`. 6.1 MB MP4 and 4.2 MB WebM, with a 70 KB WebP poster. Chapter seek was verified (jumps to 0:32 and plays, with the active chapter highlighted), and decoded frames were reviewed.
- [x] Reduced motion and JavaScript disabled: all content visible, and the navigation is still reachable on mobile.
- [x] Mobile menu: opens with `aria-expanded`, locks scroll, and Esc closes it and unlocks scroll.
- [x] Contact form: blocks empty submits. It posts the Web3Forms key and fields and shows a success state; this was tested with the network mocked, so no real email was sent.
- [x] One heading level per step, one `<h1>` per page, and every image has `alt`.

## 7. Follow-ups for you (not done here)

- **Demo app bugs** seen while capturing: `Cannot read properties of null (reading 'prepend')` on every page; `perf.js` missing the `GPU_TIER` export; `THREE is not defined` (memories, databases); a 404 on `offline-banner.js` in `enterprise/`; "IMPACT: undefined" in the Salesforce cockpit; and the transcripts page shows "No Transcripts Available" plus an error toast. Once fixed, a real screen recording could be added to the video.
- **Phone number** is public on About and the resume. Keep or remove? (Kept as is.)
- **Canonical facts:** I standardized on the resume and repo README (22 ML engines, 13 services, `PruittColon@gmail.com`, LinkedIn `/in/pruitt-colon-b3a73128a`). Tell me if any should differ.
- The README linked to `pruittcolon.github.io/whyhirepruitt` and the old `Nemo_Server` repo. Both are updated in this branch.
- `tests/test_header_consistency.py` targeted markup the site never had (`.vox-nav`) and a hardcoded `/home/pruittcolon/Desktop` path. I rewrote it for the new header. It couldn't run here because there's no Python Playwright in Termux, but the same assertions pass in the Node verification run.

## 8. Revision 2: voice-first (2026-10-23)

You asked for the voice app to lead and the ML engines to drop out of the story, since the ML part is a concept piece.

- **Home:**
  - The hero shows a real phone screen.
  - The headline is "I build voice AI that never leaves your phone."
  - The stats are 7 on-device models, 400+ tests, 332K+ lines and 0 bytes uploaded.
  - New sections: an interactive **"Inside the app"** showcase (six real screenshots with keyboard-accessible tabs), a **"How it works"** single-work-queue pipeline, and **"Two editions"** (Android first, server second).
- **Video:** re-made around the Android app (Listen → Recognize → Remember → Ask → Private). It runs 1:16 and uses real app screenshots in phone frames, with spotlights and callouts. Source: `tools/promo-video/compose.html`; screenshots: `tools/promo-video/shots/`.
- **Screenshots:** they come from the CI emulator tour artifact (run 38111847437, commit 631d215). I used neutral screens and avoided the test conversation about bills and rent.
- **Code explorer:** a new **Voice app** category with seven real Dart excerpts from `vox_mobile/lib`, linked at the pinned commit. The **ML engines** category is no longer shown; its data stays in `keyword-data.js`.
- **Architecture:** leads with the Android pipeline (6 stages and the models at each step). The server diagram follows. The engine catalog is removed and the ML wording trimmed.
- **About:** the summary, signature project, competencies and stack are rewritten around voice. There are no ML-engine claims.
- **Navigation:** "Demo" now goes to the video. The old `demo/` dashboard is linked as "Web dashboard (concept)".

## 9. Revision 3: "Signal" look, two editions (2026-10-23)

You asked for a glossier, high-tech look (but not "AI slop"), no cursive, and two products: personal/mobile and business/desktop.

- **Design system v4 ("Signal"):**
  - Dark graphite background with glass surfaces and one signal-orange accent.
  - Geist only: bold headlines with a brushed-metal fill. Accent words are solid orange, and there's no italic anywhere.
  - Instrument Serif is no longer loaded. The font files are still in `assets/fonts` in case you want them back.
- **Two editions everywhere:**
  - **Vox Personal** (Android, solo): the real app, with real screenshots.
  - **Vox for Teams** (desktop and self-hosted server, multi-user): the business version of the original system, presented with a sample meeting.
- **Home:**
  - The hero has a Personal/Business switch that swaps the phone for the desktop app, plus a live voice waveform.
  - An "Editions" spec comparison.
  - An interactive demo with two tabs. Personal is the real-screenshot phone tour. Business is a working desktop app with a live meeting that streams in with action items, cited answers in Ask, a People list and switchable Automations. It's all sample data and runs in the browser.
- **Video (1:26, six chapters):** Listen, Recognize and Ask for Personal; Meetings and Team memory for Business; then Private. The business screens are captures of the site's own Vox for Teams demo.
- **Brand:** the favicon is now a Geist Mono "PC" with an orange bar, and the share image is re-made in the new style.
- **Honesty note:** the Teams screens are a designed demo with sample people (Maya, Jordan, Priya, Sam). The site labels it "Sample meeting · runs in your browser". The server it represents (Gemma 3 4B, Parakeet, TitaNet, GPU semaphore, 13 services) is the real system on the Architecture page.
- **Selling points, not code size:** the "lines of code" stat is removed everywhere. The hero, editions and video now lead with buyer-facing points: 0 bytes to the cloud, $0 per-seat AI fees, 100% works offline, one GPU for a whole team, notes and action items written automatically, and cited answers.

## 10. Revision 4: readability, motion and job range (2026-10-23)

- **Readability:** the background moved from near-black to a soft slate (#101318) and body text is brighter (#c5cbd3). Grid textures no longer sit behind any text.
- **Motion** (all of it is off for visitors who ask their device to reduce motion):
  - The headline rises in line by line.
  - A full-width voice waveform runs above the stats.
  - The phone floats and tilts toward the mouse.
  - Section titles wipe in as you scroll.
  - Numbers decode into place.
  - Cards light up under the cursor.
  - A signal steps through the pipeline.
  - The showcase tabs show a progress line.
- **Wider job range**, based on 2026 hiring guidance (case-study framing, evals, honest tradeoffs, forward-deployed roles):
  - "Where I fit": six job families, each with proof.
  - A track-record strip from past roles.
  - "Measured, not guessed": problem → decision → result, eval numbers from the code and CI, and stated limits.
- **Fixes:**
  - The list reset now has zero specificity, so component spacing applies; this also fixes the About contact list.
  - The 3D tilt layer only exists while a mouse is over the hero.
  - The team-app stylesheet loads without blocking first paint.
- **Checks:** 60 renders, 30 interaction checks, 0 failures. `html-validate` passes. Lighthouse with gzip (as GitHub Pages serves it): home 96 on phone and 99 on desktop, other pages 100. Accessibility, best practices and SEO are 100 everywhere.

## 11. Revision 5: full redesign, three apps, 3D (2026-10-23)

You asked for a review of anything that was "too much" (for example "6 GB server memory"), a full redesign around what the apps actually do, high-resolution Three.js visuals, and a pitch.

### What was cut, and why

| Was on the site | Problem | Now |
| --- | --- | --- |
| "6 GB GPU", "1 GPU runs a whole team" | A hardware spec, not an outcome. It also invites "on what load?" | Removed |
| Vox for Teams (Maya, Jordan, Priya, Sam) | A designed product that doesn't exist, shown like a real one | Removed from the site and the repo (a backup copy is kept outside the repo) |
| "$0 per-seat AI fees", "100% works offline", "0 bytes to the cloud" | Absolutes a reviewer can poke holes in: models download first, and Even Suite uses Claude | Removed. Privacy is stated only where it's true (Vox, Narrator) |
| 13 services, Kubernetes, Istio, mTLS, zero-trust, HPA, OpenTelemetry, Prometheus, AWS | Buzzword stuffing for a single-machine prototype | Prototype diagram with four real services, no ports |
| Ports, "842 lines", "12 keys", 332K lines of code | Trivia nobody hires on | Removed |
| ~40-chip keyword explorer (MFA, PII, Fiserv…) | Reads as keyword padding | Curated: the voice app's real topics plus five server topics |
| "7 models" as the hero stat, jargon in the hero | Meaningless without context | Hero says what ships and where: phones and smart glasses |
| Number decode, repeated pitch, a ~14,000 px home page | Gimmicks and repetition | One story: hero → three case studies → tour → how I work → roles |
| Duplicate demo/tour/showcase sections, link to the buggy `demo/` dashboard | Three ways to see the same screens; a broken concept | One tour video; `demo/` is no longer linked |
| Public phone number on About | Personal data on a public page | Removed (email and LinkedIn stay) |
| Narrator Studio and Even Suite missing | The strongest proof of range wasn't on the site | Now two of the three case studies |

### What's new

- **Home:** "I ship AI to real devices." A Three.js hero (a glossy phone showing real app screens, G1-style glasses with a HUD, and a voice field). A sticky 3D stage follows the three case studies. Narrator's real sample podcast plays with chapters. Every number is backed by a test or a CI run.
- **Video (1:24):** baked 3D intro → Vox (listen, recognize, ask) → Narrator (podcast, voices, 2.6% WER) → Even Suite (Claude on the glasses, screen mirroring) → "Measured on the hardware" → outro.
- **How it's built:** a pipeline per app, the earlier server as a clearly labelled prototype, and the curated code explorer.
- **About:** rewritten around the three apps, with "What I work with" instead of a stack wall.
- **Share image:** the 3D hero with the new headline.

### The pitch

**One line:** I ship AI to real devices: speech, voices and language models running on Android phones and smart glasses, measured on the hardware.

**Three proofs:**

1. **Ships.** Three apps with public signed builds, each built and tested in CI on an emulator with the real models.
2. **Range.** Speech recognition, speaker recognition, semantic search, an on-device LLM, four TTS engines (one converted to ONNX and ported to Dart by hand), voice cloning with consent, and a Bluetooth display protocol traced from timing logs (0 → 55/55 pictures shown).
3. **Measures, then decides.** Whisper checks every build (2.6% WER). Ported models are matched to the reference (cosine 1.00000). When automatic scores preferred a robotic voice, the choice was made by listening.

**Why the background helps:** ten years of field engineering (BTI/Samsung, SubCom, Wyyerd), Lean Six Sigma, and $100K+ in measured savings. That means someone who works with customers, documents everything and debugs hardware on site.

**Roles to target:** on-device or applied AI engineer, mobile engineer for AI features, AI solutions or forward-deployed engineer, and ML tooling or evaluation. Good-fit companies: on-device AI, voice AI, smart glasses and wearables, transcription and meeting tools, and automotive voice.

## 12. Revision 6: Daylight and the concept film (2026-10-24)

You asked for a lighter look and a high-end 3D film that sells the idea: "data on you, for you, for your future", live fact-checks and real-time advice, human and compelling.

- **Design system v5, "Daylight":** warm paper (#f7f6f2), graphite ink (#15171b), white cards with soft warm shadows. Accent text uses #bd3d0b, which passes WCAG AA for small text on every background; the brighter orange is kept for glows and fills. Code blocks stay dark. Every hard-coded dark color is now a token.
- **3D on light:** the voice field draws graphite lines that warm to orange. The glasses HUD uses normal blending (additive light vanishes on a light page).
- **Concept film, 1:18 (`tools/film/`):** script in `docs/FILM_SCRIPT.md`. The Three.js stills are baked once, then moved in real CSS 3D: memory cards flying through depth of field, an orbit of insights around the phone, HUD messages printing live on the glasses, a timeline toward a goal. The end card says what already ships and what's next.
- **Home:** the film sits right after the hero ("Watch the film"). The product tour stays below the case studies as the proof. Both players share one script, and only one plays at a time.
- **Product tour:** re-themed to Daylight and re-rendered, with its 3D layers re-baked.
- **Share image:** Daylight version.
- **Rendering note:** sustained WebGL rendering in this phone's sandbox kept ending the session, so 3D is baked as single stills and videos render in resumable 300-frame chunks (`render.mjs --start-frame/--end-frame`).

## 13. Revision 7: shorter, lighter, plainer claims (2026-10-24)

You said it was overselling, too long and still too dark, asked for different colors that don't look like AI slop, and asked me to check the background against the resume.

- **Facts fixed against the resume:**
  - SubCom, Integration Technician, 2016–2020.
  - Wyyerd Fiber, Fiber Optic Technician, 2022–2024.
  - BTI Solutions, Network Engineer, 2024–2025.

  That's about 7 years in telecom and fiber. "10 years in field engineering" is gone from every page.
- **Cut as overselling:**
  - "2 kinds of hardware".
  - The 55/55 screen-sharing pictures and the display-protocol story, everywhere: site, tour video, About, How it's built.
  - "100% match" as a headline number, and "1 work queue".
  - "All shipped", "I ship AI to real devices", "before anyone else has to", "roles I'm built for", "reply within 24 hours", and "production-ready… never faces the same problem twice".
- **Shorter:**
  - Home is now four beats: hero, film, the three apps, "Let's talk".
  - "How I work", "Where I fit" and the background timeline were removed from home (the timeline is on About).
  - The film is 50 s (was 78 s). The tour is 48 s (was 84 s) and lives on "How it's built".
- **New look, "Field notes":**
  - Near-white paper (#fcfcfa), green-black ink (#18201c), one spruce accent (#1e6b57) and hairline borders.
  - No gradients, glows, glass or black surfaces. Code blocks and video frames are light too.
  - Why spruce: it stays clear of the purple-blue gradients and neon-on-black that read as generic AI, it's calm and human, and it passes WCAG AA for small text on every background.
- **3D:** the voice field is grey-green rising to spruce, with a neutral rim light. The phone and glasses stay dark because they're objects.

## 14. Revision 8: the film becomes a commercial (2026-10-24)

- **Ad structure, 48 s:** hook (16,000 words), tension (memories drift away and blur), brand reveal, three benefits shown on the real app and tagged *Runs on your Android phone today*, one glasses beat tagged *Coming next*, the promise ("For your future"), and a call to action ("Free for Android · whyhirepruitt.dev") with fine print. Script: `docs/FILM_SCRIPT.md`.
- **Brand mark:** the app uses Flutter's default icon, so the film introduces a spruce mark, a "V" of sound bars. It could become the app icon.
- **Encoding:** MP4 (H.264) only. The second VP9 encode was dropped; it was the heaviest step and every current browser plays H.264.

## 15. Revision 9: an emotional story, made for phones (2026-10-24)

- **Feedback:**
  - The video's text was too small on a phone unless it was full screen.
  - "Watch the film" needed better wording.
  - The user wanted more emotion and more about what the app could do: remembering everything you said, the procedure at work, the groceries you have.
- **New commercial (1:00), built on one question: "What if you could remember everything you said?"**
  - Three moments are each said once and remembered later: steps a lead explained at work, a grocery list said over breakfast, and a five-year-old's words at bedtime, recalled thirteen years later ("Kept, word for word.").
  - Then what ships today, one *Coming next* glasses beat, and the call to action.
  - The fine print now also says "Let people know when it's listening."
- **Phone cut:**
  - A second render at 1080×1350 (4:5) with its own layout. Type comes out at about 12–40px on a phone instead of about 7px.
  - `js/player.js` swaps the source and poster below 700px and switches back on wider screens.
  - The landscape product tour plays full screen on phones (sideways where Android allows it) and says so under the player.
- **Hero link:** "What it could do for you" (with a play icon) replaces "Watch the film".
- **Fix:** the 3D phone could show an empty screen after its first frame. Fixed in `js/3d/stage.js`; the bug predates the redesign.
- **Follow-up polish:**
  - The payoff line "Kept, word for word." held for under a second and faded in over the old title. The home story now runs a second longer (taken from "Most of them slip away"), and the old title leaves before the new one arrives.
  - Times, sources and tags in the phone cut went from about 10px to 12–14px on a phone; the landscape cut's small labels went up a step for tablets.
  - On phones, the play button and "Play 1:00" sit side by side, so they no longer touch the phone in the poster.

## 16. Revision 10: self-improvement, the name, and an accurate Even Suite pitch (2026-10-24)

- **Feedback:**
  - Sell Even Suite with a rule-of-three pitch: phone, computer or your own glasses, you choose. Say "encrypted" only if it's true.
  - "Empower yourself locally, don't let big tech do it." "Your data, your voice, to better yourself": the voice to better becomes Vox Amelior.
  - Add self-improvement to the commercial, check every claim, and point out logical fallacies in the pitch.
- **Checked against the app code before writing:**
  - Even Suite runs on the phone and the glasses, with a terminal view. Agent Hub only listens on the phone itself (127.0.0.1), so "computer" isn't true yet. Speech is recognized on the phone when it supports that, and listening turns itself off. Claude's answers come from Anthropic, through Claude Code.
  - Neither app encrypts its own data. Vox Amelior only uses Android's encrypted storage for its download token, and Android encrypts app storage on current phones. So the site doesn't claim "encrypted".
  - Vox Amelior uses the network only to download its models and for webhooks you set up. It has built-in reviews, including "Logical fallacies", "Promises & to-dos" and "Kind words", and they run on the phone's own model.
- **Commercial, now 1:14:**
  - New fourth story, "In an argument": your own line ("You always do this. And what about your mess?"), then a Logical fallacies review the next morning, then "Hear yourself. Get better."
  - "On your phone. Not in someone else's cloud." joins what ships today.
  - New closing line: "Your data. Your voice. Your better self." The end card explains the name: vox, voice; amelior, to make better, as in "ameliorate". It replaces "Data on you. For you. For your future."
- **Site copy:**
  - Even Suite: "Claude in your glasses, on your phone or in your terminal." You choose how hands-free it is: say "Claude", hold the TouchBar, or type. The app connects only to your glasses and to Claude Code on your phone.
  - Vox Amelior adds reviews ("promises, kind words or logical fallacies").
- **Sources:** "Most of them slip away" now has one (Brown-Schmidt and Benjamin 2018: under 20% of ideas recalled after a short delay). The etymology is in `docs/FILM_SCRIPT.md`.

## 17. Revision 11: a new commercial, "Your voice, to better your life" (2026-10-24)

Feedback: the name's idea was missed (your voice, to better your life, becomes *vox amelior*); the fallacy review felt shoved in; tell a real story of what it could do; throw many self-improvement questions on screen and end on something whimsical; explain the encryption and safety, but only what's true; better animation; quiet music instead of an AI voice; "up to 16,000" so people who talk less aren't left out; an existential beat about AI and your data as the call to action. Write, review, rewrite.

- **New script, 2:10, in five acts** (attention, need, answer, picture, action): we speak about 16,000 words a day and most slip away → except what we give to AI, which can be stored, read and used for ads ("Our words. Their rules.") → unless the AI lives on your phone: encrypted, sealed, never sent ("Your words. Your phone. Your rules.") → it remembers, a child's words become a reason to be better, you ask about yourself, and three months later things are better → "Your voice, to better your life" turns into "Vox Amelior". The full script, two drafts with their reviews, the rhetoric and a source for every claim are in `docs/FILM_SCRIPT.md`.
- **Security, checked in the code:** data lives in the app's private storage; Android's file-based encryption (256-bit, keyed to the passcode) protects it; `allowBackup="false"` keeps it out of cloud backups; the only network code downloads models (SHA-256 checked) or sends webhooks you set up. The app doesn't encrypt its database itself, so the film says "256-bit, by Android". Encrypting the database (SQLCipher with a Keystore key) would be an app change.
- **"Up to 16,000" would be inaccurate:** 16,000 is the study's average, and some people say far more. The film says "On an average day, we speak about 16,000 words", which is accurate and doesn't single anyone out.
- **Animation:** words rise in one by one; the phone and voice field carry across scenes instead of cutting; bubbles rise into a cloud and later fall into the phone; three rings draw around the phone; answered questions pile up around the frame; "Their" is struck out and rewritten; the name forms letter by letter and the mark draws itself.
- **Sound:** a generated ambient score (`tools/film/score.mjs`): soft pad and felt piano in D major, cooler in Act 2 with a slow heartbeat and a near-silent beat after "Their rules", a quiet pulse in Act 4 that stops for the punchline, bells as the name forms. No voice; normalised to −17 LUFS. `render.mjs --audio` muxes it as AAC.
- **Page copy:** the section heading is now "Your voice, to better your life."; length labels, chapters and the transcript follow the new film.

## 18. Revision 12–13: words online, readable pacing, a true one-page resume (2026-10-24)

- **Commercial (now 2:55):** Act 2 opens on "Except our words online. Those, they keep." over a flood of searches, typed text and watched videos; the third line is "sold to companies we've never heard of"; the call to action is "Take your words offline. Start here."; the end card no longer translates the name. The film is retimed to subtitle reading speed (about 0.33 s a word plus 1.2 s per line), words animate in more softly and hold still, and scene times live in `tools/film/timeline.js`, shared by picture and score. "Which words do I use incorrectly?" now answers with *ingenuous* vs *ingenious*. Details and sources: `docs/FILM_SCRIPT.md`.
- **Resume:** the PDF said "one page" but had two. `Pruitt_Colon_Resume.html` is rewritten in the site's look and fits one Letter page: summary, Vox Amelior as the featured project, Narrator Studio and Even Suite under "Other projects", experience, skills, education. `node tools/resume/build-pdf.mjs` prints it and fails if it isn't exactly one page. The old Vox Server ("NeMo_Server") section is gone, in line with the site.

## 19. Revision 14: one story, a 3D symbol, and an "Other apps" page (2026-10-24)

Feedback: open with the purpose ("the first steps toward a human–AI interface"); make Vox Amelior the main app on the home page; put Even Suite and the podcast app under an "Other apps" menu item; sell Even Suite as choosing the most capable AI when accuracy matters (mobile AI is smaller) with a future link to Vox Amelior on a computer; sell Narrator Studio as choosing what you listen to; keep the commercial; a high-fidelity rotating 3D graphic that symbolizes the whole project, pushed as far as it will go.

- **The narrative:** three ways in, one person in charge. Vox Amelior hears you (your choice: what stays private), Even Suite shows you (your choice: when to call on the best model), Narrator Studio speaks to you (your choice: what fills your ears). Hero: "The first steps toward a human–AI interface." with a lead that ends "On your phone, in your glasses, on your terms."
- **The symbol (`js/3d/symbol.js`):** an iridescent glass shell, clear in the middle and reflective at the rim; inside, a geodesic lattice whose connections carry spruce signals; on the shell, two rings of speech that take turns (ink for the person, spruce for the AI); three orbits whose beads trail light; a field of dust for depth. Bar lengths, signals and trails run in shaders. It turns on its own, leans toward the pointer, turns as the page scrolls, and can be dragged with inertia; phones get a lighter version; reduced motion gets one still frame. A legend explains it. `node tools/brand/bake-symbol.mjs` bakes the still used before the 3D loads and without WebGL. The old phone-and-glasses hero lives on as `js/3d/devices-hero.js` for the tools that bake it.
- **Home:** hero with the symbol, "Three ways in", the Vox Amelior commercial, a Vox Amelior section (remembers, answers, reviews, stays yours), a teaser for the other apps, call to action.
- **Other apps (`apps.html`):** Even Suite ("Private when it can be. Powerful when you need it.", with three tiers: on your phone, in the cloud, and on your computer marked Next and not built yet) and Narrator Studio ("What you hear shapes how you think. So choose it.", with the sample episode), on the sticky 3D device stage.
- **Nav and footer** on every page: Home, Other apps, How it's built, About, Contact.

## 20. Revision 15: real devices in 3D for every app, and a page that leads (2026-10-24)

Feedback: "Resume" without the accent everywhere; the symbol didn't feel high-resolution, so bring back the phone and glasses with real screens, rotating, at the best quality possible, for each app; review the layout so it leads you through the site; keep the video; make it flashy while showing what the AI really does.

- **Rendering:** Khronos PBR Neutral tone mapping (true colours for screens and materials), 1.5× supersampling on standard-density screens, studio environment lighting, soft contact shadows and a turntable ring under each device.
- **`js/3d/showcase.js`:** one module for every device scene. The phone's screen changes while its back is to you, so each turn shows the next app. Devices rise into place when first seen, turn on their own, and can be dragged with inertia.
  - Hero: the phone and the glasses; the glasses stream a reply from Claude, five lines a page (`liveHud` in `devices.js`).
  - Vox Amelior: as you scroll, the phone opens into five labelled layers of on-device AI (speech to text: NVIDIA Parakeet; speaker ID: TitaNet, Sortformer; search by meaning: EmbeddingGemma; answers and reviews: Gemma; private storage: Android encryption), with a signal pulsing through them in order. The matching features in the copy light up.
  - Even Suite: the glasses streaming Claude's reply, with the phone running Even Suite behind.
  - Narrator Studio: words from the sample episode flow into the phone and rings of sound pulse out.
- **The symbol** moved into "The idea", beside the three ways in.
- **Leading the reader** (from usability research: a full-width first screen can look complete, so signal what's below, keep people oriented, and point to the next step): numbered sections (01 The idea, 02 Vox Amelior, 03 Other apps, 04 Contact), a scroll cue in the hero, a "Next" link closing each section, an on-page rail that marks where you are, and an in-page switcher on the other-apps page.
- **Stills** for no WebGL: `node tools/brand/bake-devices.mjs` and `node tools/brand/bake-symbol.mjs`.
- "Résumé" is now "Resume" everywhere.

## 21. Revision 16: questions and answers on every turn, a shorter home page (2026-10-24)

- **Glasses:** the battery pods moved to the ends of the arms, behind the ears, where they sit on the G1, angled along the arm. The glasses turn on their own, in step with the phone.
- **A question, then its answer, one turn each:** content changes while a device's back is turned, and the new text types in as it comes round. In the hero, the phone shows Vox Amelior's Ask screen (asked, then answered from your own conversations) and the glasses show a question to Claude and then its answer, five lines a page; the pairs shuffle. Dragging still turns them. The Even Suite scene does the same on the glasses. Vox Amelior's opening stack alternates a question and its answer on its screen.
- **Narrator Studio:** every turn shows a new episode, with that episode's words flowing into the phone.
- **Drawn screens (`js/3d/screens.js`):** Vox Amelior's Ask screen and Narrator Studio's player are drawn on a canvas in each app's own layout, so they can change; questions, answers and episode titles are examples, and the captions say so.
- **Home page:** shorter and steadier. The symbol section is gone (the devices carry the 3D), "The idea" is a single row of three cards, and the "Next" links are quiet text links at the end of each section.
- **About:** the intro ties the apps to the human–AI interface idea, and the voice engines list all four (Kokoro, Supertonic, Pocket TTS, VibeVoice).

## 22. Revision 17: glasses true to the G1, always turning, no captions (2026-10-25)

Feedback: the devices didn't turn on their own; don't explain the 3D in text below it; the battery belongs at the very end of the arm, behind the ear, not partway along it.

- **Glasses rebuilt from Even Realities' side photo:** round lenses, a squared metal hinge block at each corner, thin flat arms that run straight back, dip near the end and finish in a blocky paddle angled down behind the ear. The paddle is the battery and electronics, with a lighter touch panel on the outside (sources: evenrealities.com/g1; Yanko Design's review, "blocky, paddle-shaped tips that house batteries and electronics"). The glasses tip back slightly so the arms run level.
- **Always turning:** the device scenes no longer stop for reduced motion; they turn at half speed and skip the entrance. Vox Amelior's phone turns on its turntable and settles into a three-quarter view as its layers open. `verify.mjs` checks that the hero moves on its own, with and without reduced motion. The 3D runs over http (for example http://localhost:8000); a page opened as a file shows the stills.
- **No captions** under the 3D scenes.

## 23. Revision 18: a glossy, product-shot finish (2026-10-25)

Feedback: make the graphics high-level glossy, even better.

- **Studio lighting (`js/3d/stage.js`):** the reflections now come from a photo studio built for the purpose: a grey sweep lit by an overhead softbox, two tall strip lights, a rim strip behind and a thin strip behind the camera, blurred only slightly. Glossy surfaces carry long, crisp highlights that glide across them as the devices turn.
- **Glossy floor:** each device stands on polished acrylic: a mirror reflection rendered from a second camera (after three.js's Reflector), strongest where the device meets the floor and fading and softening with the height of what it reflects, measured from the mirror camera's depth. Only the devices are reflected; the floor itself is invisible on the page. Phones render it at lower resolution without multisampling.
- **Phone rebuilt (`js/3d/devices.js`):** a body swept from a cross-section with smooth normals (`roundedSlab`), so its large corners and rounded edges catch one unbroken highlight. Black front glass, a polished graphite frame, frosted spruce glass on the back under a glossy coat, a raised glass camera island with three lenses in polished rings (an iridescent coating on the glass) and a flash. The screen sits under a cover glass that reflects the studio, and its corners follow the body's.
- **Glasses:** each rim is a flat-fronted band with rounded edges swept around the lens, under a glossy lacquer; polished hinges; clear lenses with a reflective coat that leaves the page behind them untouched.
- **Vox Amelior's layers:** glass panes with circuitry etched into each (a chip, traces and vias, different on every layer) that lights up as the signal passes. Each label's line runs level from a dot on its own layer, so the lines no longer cross.
- **Narrator Studio:** the sound rings are polished spruce metal that catch the light as they grow.
- The hero still (`assets/img/hero-devices.webp`) is re-baked.

## 24. Revision 19: deeper gloss (2026-10-25)

Feedback: continue, more gloss.

- **Curved glass:** a flat face reflects the studio as one even tone, so the phone's back read as flat paint. `domeNormals` in `js/3d/devices.js` tilts a face's normals outward toward its edges, as if it bulged very slightly, and each softbox spreads into a soft gradient across it. It is used on the phone's front and back glass, the camera island, the G1 lenses (curved like real lenses, so the lights slide across them as small arcs) and the Vox Amelior layers. The screen's cover glass stays flat: domed, it washed the app out along one edge at an angle.
- **Darker studio walls:** the sweep behind the softboxes is darker, so glossy black stays deep and only the lights show in it. Pale walls made the glasses frame read as grey plastic. A broad scrim overhead adds a bright line along every top edge.
- **Piano-black frames:** the glasses frame is now black under a clear lacquer (no metal in it), with crisper highlights.
- The hero still is re-baked.
- **Follow-up (feedback: "slightly too shiny and the arms are upside down"):** the gloss is a notch softer: less lacquer on the glasses and the phone's back, a softer frame, hinges and overhead light, and lighter reflective coats on the screen and lenses. The glasses arms bent up at the end because of a sign error in their angles; they now run straight back and dip down to the battery paddles behind the ear, as on the real G1.

## 25. Revision 20: the film opens the home page; an about-me film (2026-10-26)

Feedback: the "Meet Vox Amelior" button jumps the page too far and has no point; let people scroll. Put the video
preview on the first screen, because the first screen is everything. Make About about me, with a short personal film:
network infrastructure, working up to network engineer, ecstatic at the first GPT models, every model since, and the
app that came out of it. Use the strongest rhetoric.

- **Home hero:** the commercial now sits beside the headline (on phones, right under it). A silent 16-second loop of
  three moments ("Our words. Their rules." → "Your words. Your phone. Your rules." → the name) plays while it's on
  screen (`assets/video/vox-film-preview*.mp4`, about 270 KB each, cut from the film). Pressing play swaps it for the
  full film with sound, from the start. With reduced motion or data saver the poster stays still. The transcript
  sits under the video.
- **Buttons:** "Meet Vox Amelior", the second film button and the "How it fits together" scroll cue are gone. The
  hero offers Resume and Email me instead. The separate film section is gone (the film is in the hero), so the page
  is shorter: 5,360 px on desktop (was 6,115).
- **3D devices:** the phone and glasses moved from the hero to "01 · The idea", above the three cards. They load only
  as that section nears the screen, so the first screen no longer starts WebGL.
- **About-me film** (`tools/film/story.html`, script and devices in `docs/STORY_SCRIPT.md`): 1:27, both cuts, with
  its own score (`tools/film/story-score.mjs`). It opens the About page under a new intro, followed by "My story" in
  words. The two accordions ("Focus on operational efficiency", "Why AI?") were folded into the story.

## 26. Revision 21: an intro above the film; a clearer about-me film (2026-10-26)

Feedback: put a brief written introduction to what it is before the video; make the animations more logically
structured.

- **Home film intro:** above the film, a label (The main app · concept film · 2:55) and two sentences: what Vox
  Amelior is, and that the film shows what it could do, most of which runs in the app today. On phones it sits
  between the headline and the film.
- **About-me film, revision 2:** one layout for every scene. The chapter label and the words stay top left; every
  picture stands on one road that runs across the whole film; scenes hand over by moving along the road; a route
  map of the five chapters runs along the bottom. Words come before the picture they name. Details in
  `docs/STORY_SCRIPT.md` ("Visual grammar"). The first cut is kept in `/root/site-tools/removed-from-repo/story-v1/`.
