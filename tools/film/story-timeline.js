// When each scene of the about-me film starts, in seconds. story.html (picture) and story-score.mjs (sound) both read
// this file, so retiming a scene moves its music with it.
// Pacing: every line stays up for about 0.33 s a word (the BBC's subtitle pace) plus 1.2 s; see docs/STORY_SCRIPT.md.
const STORY = {
  duration: 87,
  // Five chapters, shown as stops on the route map along the bottom of the frame
  chapters: [['The roads', 0], ['The spark', 20], ['The question', 40], ['The build', 57], ['What’s next', 71.5]],
  scenes: { A: 0, B: 13, C: 20, E: 33, F: 40, H: 57, I: 65, J: 71.5, K: 79 }
};
if (typeof module !== 'undefined') module.exports = STORY;
