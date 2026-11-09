# About-me film: script and reasoning

A 1:27 film for the About page, told in on-screen words over quiet music (no narration). It shows the same idea as
the Vox Amelior commercial from the other side: **who** built it and **why** he was the one to notice.

- Composition: `tools/film/story.html` (16:9 and `?format=portrait` 4:5), scene times in `tools/film/story-timeline.js`
- Sound: `tools/film/story-score.mjs`
- Render: `render-chunks.sh tools/film/story.html pruitt-story 2610 story.wav` (and the portrait page as `pruitt-story-portrait`)

## Facts it rests on (checked against the resume)

| Line | Source |
| --- | --- |
| Seven years building networks | SubCom 2016–2020, Wyyerd Fiber 2022–2024, BTI Solutions 2024–2025 |
| Under the ocean | SubCom, integration technician on subsea cable projects |
| Into our homes | Wyyerd Fiber, fiber optic technician (fiber internet) |
| Through the air | BTI Solutions, network engineer validating Samsung 5G/LTE sites |
| Worked my way up | integration technician → fiber optic technician → network engineer |
| Ecstatic when the first GPT models arrived; tried and reviewed every major model since | Pruitt's own account ("every model" softened to "every major model") |
| M.S. Software Engineering, AI focus | Western Governors University |
| 3 open-source Android apps, 500+ automated tests | Same numbers as the home page |
| Works in airplane mode | Vox Amelior goes online only for model downloads and webhooks you set up |

The chat answer, the review notes and the word chips are illustrations, not quotes.

## Structure

A short hero's journey in five chapters: the ordinary world (the roads), the call (a computer writes back), the
insight only this hero has (he built the road the words leave on), the return with the answer (an AI that stays home),
and what comes next.

| Time | Chapter · scene | Words (top left) | Picture (on the road) |
| --- | --- | --- | --- |
| 0:00 | 01 The roads · A | For seven years, I built *the roads our words travel.* | The road draws itself; three stations arrive: Under the ocean (SubCom), Into our homes (Wyyerd Fiber), Through the air (BTI Solutions) |
| 0:13 | 01 The roads · B | I worked *my way up.* | Three job cards on steps rising from the road; the last, **Network engineer**, in the accent colour |
| 0:20 | 02 The spark · C | Then a computer *wrote back.* → I was ecstatic. *I still am.* | A chat card: a question about fiber, answered; a burst of rays |
| 0:33 | 02 The spark · E | Since then, I’ve tried and reviewed *every major model.* | Eight review notes in reading order; the last: “Runs on a phone!” |
| 0:40 | 03 The question · F | But a network engineer always asks one question: *Where does it go?* → Every word we gave them *left the house.* → I knew the road they took. *I’d helped build it.* | You at one end, their servers at the other, his three stations between; our words ride the road away; the stations light up |
| 0:57 | 04 The build · H | So I built an AI *that stays home.* | The phone stands on the road and the same words fall into it; Vox Amelior · Works in airplane mode |
| 1:05 | 04 The build · I | Not just a fan. *A builder.* | M.S. · 3 · 500+ standing on the road |
| 1:11 | 05 What’s next · J | For seven years, I built the roads our words travel. → Now I build AI that lets them *stay home.* | A house on the road; the light runs into it from both ends |
| 1:19 | 05 What’s next · K | Let’s build *what’s next.* | Photo, Pruitt Colon, AI engineer · open to full-time roles, whyhirepruitt.dev |

## Visual grammar

One layout for the whole film, so the eye always knows where to look (revision 2; the first cut changed layout
from scene to scene):

- **Words, top left.** The chapter label (01 · The roads …) sits above the line. One beat at a time; a new beat
  replaces the old one in the same place. The bookend works because the opening line returns to exactly where it
  first stood.
- **Pictures stand on one road.** A single line runs across every scene at the same height. Stations, cards, the
  chat, the phone, the proof and the photo all stand on it. Between scenes the pictures move on to the left and the
  next ones arrive from the right, as if travelling along it. The light on the road runs while the story moves,
  gives way to our words in chapter 03, stays off while the words stay home, and runs home from both ends in 05.
- **Words first, then the picture they name.** Each station, card or note arrives after the line that introduces
  it, in reading order (left to right, then down).
- **A route map along the bottom.** Five stops, one per chapter; the current stop is lit, and a marker travels to the
  next stop in the last second of each chapter.

Pacing follows the commercial: about 0.33 s a word plus 1.2 s a line, so it reads on a phone without full screen.

## Devices, and why each is there

- **Extended metaphor (roads).** Networks are roads words travel on. It turns a resume line into a picture, and it
  pays off twice: the words leave on those roads, and the end lets them stay home.
- **Tricolon.** “Under the ocean. Into our homes. Through the air.” Three jobs, three kinds of road, one rhythm.
  The proof (M.S. · 3 · 500+) is a second tricolon.
- **Climax (gradatio).** The three titles climb a staircase, each one higher, the last in the accent colour.
- **Volta.** “Then a computer wrote back.” The turn of the story, timed to the reply appearing on screen.
- **Callback inside the volta.** His first question is about fiber, the thing he knew best.
- **Pathos with a twist.** “I was ecstatic. I still am.” The second line turns a memory into a present-tense trait.
- **Comic relief and foreshadowing (Chekhov’s gun).** The review notes are funny (“Cited a paper that doesn’t
  exist.”) and the last one, “Runs on a phone!”, sets up the app.
- **Hypophora.** “Where does it go?” asks the question, and the next scene answers it.
- **Dramatic irony and ethos.** “I knew the road they took. I’d helped build it.” The insight only someone with his
  background has; the stations light up as he says it.
- **Antithesis.** Left the house / stays home; a fan / a builder.
- **Correctio.** “Not just a fan. A builder.” Corrects the impression the ecstatic beat might leave.
- **Bookend (epanalepsis at film scale).** The opening line returns word for word, then turns: “Now I build AI that
  lets them stay home.” “Lets” is deliberate: Even Suite uses Claude in the cloud when you ask, so the promise is
  the choice, not that nothing ever leaves.
- **Call to action with “us”.** “Let’s build what’s next.” Ends on the viewer, not on him.

## Draft → review → rewrite

| Draft | Problem | Final |
| --- | --- | --- |
| I noticed what a network engineer would. | Abstract, and it tells instead of shows | But a network engineer always asks one question: Where does it go? |
| Now I build AI that doesn’t need them. | Not true of Even Suite (Claude runs in the cloud) | Now I build AI that lets them stay home. |
| I’ve tried and reviewed every model since. | An absolute nobody can check | …every major model. |
| Then two more ways in: glasses and ears. | Slows the ending, and implies all three stay offline | Folded into the proof: 3 open-source Android apps |
| So I studied it: a master’s in AI. | Implies an order of events the resume doesn’t state | The degree sits in the proof, with no “then” |
