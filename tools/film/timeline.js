// When each scene of the commercial starts, in seconds. film.html (picture) and score.mjs (sound) both read this
// file, so retiming a scene moves its music and effects with it.
// Pacing: every line stays up for about 0.33 s a word (the BBC's subtitle pace) plus 1.2 s; see docs/FILM_SCRIPT.md.
const TIMELINE = {
  duration: 175,
  scenes: { A: 0, B: 5.5, C: 10, D: 17.5, E: 22.5, F: 33, G: 37.5, H: 42.5, I: 51, J: 66, K: 72, L: 76, M: 90.5, N: 104.5, O: 109.5, P: 149.5, Q: 161 },
  // Seconds after scene O starts when each question about yourself arrives
  montage: [0, 6.6, 13.1, 19.1, 23.9, 30.2]
};
if (typeof module !== 'undefined') module.exports = TIMELINE;
