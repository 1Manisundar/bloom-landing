// Text arrives a line at a time as its chapter scrolls in. Without JavaScript, or with reduced motion,
// nothing here runs and the text is simply there.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** The blocks that are not split into lines: they rise as one piece. */
const BLOCKS = ".hero > .label, .hero > .cue, .copy > *:not(.reveal)";

export function setupReveals(reduced: boolean): void {
  if (reduced) return;

  gsap.from(".wordmark", { yPercent: 14, opacity: 0, duration: 1.6, ease: "expo.out" });

  document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => {
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "rl",
      // Lines keep their words whole, so a screen reader needs no help reading them.
      aria: "none",
      // Split again when the width changes; the returned tween is carried over to the new lines.
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 120,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        }),
    });
  });

  document.querySelectorAll<HTMLElement>(BLOCKS).forEach((el) => {
    gsap.from(el, {
      y: 18,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
    });
  });
}
