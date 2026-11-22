// When each scene of the Linux film starts, in seconds. linux.html (picture) and linux-score.mjs (sound) both read
// this file, so retiming a scene moves its music with it. Pacing: about 0.33 s a word plus 1.2 s a line.
const LINUX = {
  duration: 70,
  scenes: { A: 0, B: 10, C: 15, D: 24, E: 33, F: 42, G: 51, H: 59, K: 64 },
  // Moments the picture and the sound share
  typing: [
    // [start, text, seconds per character]
    [17.2, 'computer', 0.1],
    [34.6, 'claude', 0.09],
    [36.4, 'make a kitchen timer app', 0.06]
  ],
  enters: [18.1, 35.2, 38.0]
};
if (typeof module !== 'undefined') module.exports = LINUX;
