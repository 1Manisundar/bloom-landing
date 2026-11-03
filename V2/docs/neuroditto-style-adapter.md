# Neuroditto style adapter: brand kit + Minimal Serif + Dark Luxury

Made Nov 3, 2026. Read this AFTER the brand kit and BEFORE the two skill files in `docs/reference/`.

**Rule of order:** brand kit > product definition > this adapter > Minimal Serif > Dark Luxury. The skills give layout, rhythm and motion ideas. They never give colors, fonts or claims.

## The direction in one line

A calm, typography-led editorial page on warm ivory (Minimal Serif), with ONE cinematic "night" chapter in deep emerald and light gold (Dark Luxury, re-coloured). Day → night → day.

## Light sections: take from Minimal Serif

| Take | How it maps to the brand |
| --- | --- |
| Typography carries the page; large serif display | Fraunces 600 for display, 500 for h2/h3 (kit weights only) |
| Extreme whitespace | Section padding `clamp(4rem, 8vw, 10rem)`; never less than 6rem on desktop |
| Prose column max 680px; container max 1180px | Same |
| Asymmetric editorial grid (1fr / 2fr), left-aligned hero | Same |
| Hairline rules instead of boxes | `1px solid #D9E4DC` (soft border) as dividers and card tops |
| Flat: no drop shadows, no glow on light sections | Same |
| One background for most sections | Warm ivory #FBF8F2 almost everywhere. Use tints (sage, mist, lavender, blush) on cards and small panels, not as full-width alternating bands. Oat #F2EFE7 for one section at most |
| Underline slide on nav links, rule-extend on scroll, arrow pull on button hover | Same, with the brand easing |
| Labels: small, tracked, uppercase | Syne 600, 12–13px, letter-spacing 0.08em, bronze #98560B on light |
| Thin-stroke SVG icons inline, no icon containers | Lucide, but 2px stroke (brand rule) |
| Reduced-motion block | Same, required |

## Light sections: drop from Minimal Serif

| Drop | Why |
| --- | --- |
| Cormorant Garamond, Inter | Not in the brand kit |
| Light (300) italic display as the signature | Kit allows Fraunces 500/600 only, and Neuroditto text is "always straight". Use size and colour for drama, not italics |
| `border-radius: 0` everywhere | Companions are "Soft Pebble" (round, soft). Keep soft corners: cards 20px, panels 28px, buttons 12px. Keep everything else flat and open |
| Ink-only buttons, uppercase button labels | Kit: primary button = forest #176849 fill + ivory label, DM Sans 600, sentence case. Secondary = forest 1px outline |
| "No illustrations, no shapes" | Companions and pebbles + gold thread ARE the brand identity. Use them sparingly, placed beside type, never behind text |
| 0.6s `cubic-bezier(0.16,1,0.3,1)` | Brand motion: 160–400ms, `cubic-bezier(0.22, 1, 0.36, 1)` for UI. Scroll-linked scenes follow the scroll, not a duration |

## Night chapter: take from Dark Luxury (re-coloured)

Use for section 4 "Over weeks" (the pinned pebble scene ends here) and section 7 "Why we build it". Nowhere else.

| Dark Luxury idea | Neuroditto version |
| --- | --- |
| Warm near-black background | Deep emerald #002B20 (section bg) and #10261F (dark-mode bg) |
| Card #161412 with inset top highlight, no border | Card #1A362C + `inset 0 1px 0 rgba(247,245,238,0.08)` |
| Headline contrast by COLOUR, not weight | Fraunces 600 for all words. Supporting words #C1D1C4, key words #F7F5EE, one key phrase light gold #F7D16C. (Their #5a544a "near-invisible" grey fails contrast, so we do not use it) |
| Accent is surgical: labels, lines, numbers | Light gold #F7D16C for the gold thread, the label, one number. Never a big fill |
| Grain texture | Allowed in the night chapter only, 3% opacity, overlay |
| One ambient orb | ONE soft glow (champagne #FFF4B8 → transparent, low opacity) where the gold thread ends. No pulsing |
| Large numbers with count-up | Only real numbers with a source: "17%" and "about 1,000 students" (Bastani et al., PNAS 2025) |
| Scroll reveal with 90ms sibling stagger | Same stagger, brand easing |
| Navbar transparent → blur on scroll | Same; on the night chapter the nav switches to dark tokens |

## Night chapter: drop from Dark Luxury

| Drop | Why |
| --- | --- |
| Inter, JetBrains Mono, `[Label]` monospace labels | Not in the kit; labels stay Syne (light gold on dark) |
| Always-pulsing glowing buttons | Reads as neon/SaaS; breaks "calm" |
| Invented metadata lines (`3F1C9 // CONTEXT DEPTH …`) | Fake data. Breaks the honesty rule |
| Logo marquee, testimonials, pricing, "ALL SYSTEMS OPERATIONAL" | We have no logos, users or prices to show. Never fake them |
| Circuit boards, neural nodes, particle imagery | Banned (brains, neon, techy clichés) |
| Headline word-cycling as default | Optional, see below |

## Optional ideas worth testing (decide at Gate B)

1. **Hero word cycle with the pattern words:** "See where you *jump*." → *hesitate* → *are sure and wrong*. Stops after one full cycle, and never under reduced motion.
2. **Colour-contrast headline on light sections too:** supporting words eucalyptus #52675D, key words deep ink #14342B (5.73:1 passes).

## Cinematic scroll scenes

Tools: GSAP ScrollTrigger + Lenis (smooth scroll). Everything degrades to a normal stacked page when `prefers-reduced-motion` is on, or the viewport is shorter than 700px.

1. **Hero (no pin):** the moment demo. The first frame is complete; nothing waits to animate in.
2. **"Over weeks" (pinned, about 3 screen heights of scroll):** pebbles drop in week 1 → week 6, the gold thread draws through them, and the background slowly deepens from ivory to deep emerald. At the end, one line: "One moment is a moment. Six weeks is a pattern." in light gold.
3. **"Why we build it" (night):** big Fraunces line with colour contrast; the gold thread underlines "think for yourself"; count-up of the PNAS numbers.
4. **Return to day:** the background eases back to ivory as companions slide in; then privacy, founders, waitlist.

Laptop check: the old night-lab page could not pin a tall chapter at 1366×768. Every pinned scene must fit 1366×768 or switch to stacked mode.
