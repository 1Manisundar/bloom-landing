// The two optional ideas from the style adapter, shown only for the Gate B choice.
// Off by default. Turn on with ?idea=cycle and/or ?idea=contrast.
//   cycle:    hero line "See where you jump." → hesitate → are sure and wrong. One cycle, then stops.
//             Never under reduced motion (the line just shows "jump").
//   contrast: colour-contrast headlines on light sections (supporting words eucalyptus, key words ink).

const ideas = new Set(new URLSearchParams(location.search).getAll("idea"));
const root = document.documentElement;

if (ideas.has("contrast")) root.classList.add("idea-contrast");

if (ideas.has("cycle")) {
  const line = document.querySelector<HTMLElement>("[data-idea='cycle']");
  const word = line?.querySelector<HTMLElement>("[data-cycle-word]");
  if (line && word) {
    line.hidden = false;
    const words = ["jump", "hesitate", "are sure and wrong"];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) {
      let i = 0;
      const step = () => {
        i++;
        if (i >= words.length) return; // one full cycle, then stop
        word.classList.add("is-out");
        window.setTimeout(() => {
          word.textContent = words[i];
          word.classList.remove("is-out");
          window.setTimeout(step, 2200);
        }, 260);
      };
      window.setTimeout(step, 2200);
    }
  }
}
