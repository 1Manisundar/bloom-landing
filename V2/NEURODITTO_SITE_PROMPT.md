# Build the Neuroditto website (Claude Code prompt)

The new site lives in `D:\DEV\bloom-landing\V2`. Build the Astro project inside `V2` (its own `package.json`, `src\`, `public\`). Do not change or delete anything outside `V2`; the old night-lab site in the parent folder stays as it is. All paths in this prompt (`docs\`, `public\companions\`, `src\`, `shots\`) are inside `V2`. Before you start, commit the current state of the repo so the old site is safe, then commit V2 work on a new branch `site-v2`. When we deploy, Vercel's "Root Directory" must be set to `V2`.

## Read these first (they win over anything else, in this order)
1. `docs/neuroditto-product.md` — what the product is.
2. `docs/neuroditto-brand-kit.md` — the only colors, fonts and sizes allowed.
3. `docs/companions-roster.md` — the 30 companions.
4. `docs/neuroditto-website-brief.md` — web rules, banned items, open conflicts.
5. `docs/neuroditto-style-adapter.md` — the visual direction: what we take from Minimal Serif and Dark Luxury, and what we drop.
6. `docs/prototype/Main.dc.html` — the approved Nov 3 design. Copy its words, section order and layout ideas. It is a reference, not code to paste.
7. `docs/reference/minimal-serif/` and `docs/reference/dark-luxury/` — the two style skills. Use them ONLY through the adapter. Do not install them as active skills.

Order of authority: brand kit > product definition > style adapter > Minimal Serif > Dark Luxury > the prototype > old code and old docs (VISION.md, CLAUDE.md). Tell me about every conflict in your report.

## How to use the installed skills
- **taste-skill:** first, tell it the brand kit and the style adapter are locked (colors, fonts, motion, honesty). Use it to set layout direction at the start, and to critique real browser renders at Gates A and B. If its house style disagrees with the adapter, the adapter wins; list the disagreement.
- **playwright-cli:** all screenshots and scroll-frame strips at every gate.
- **web-design-guidelines:** full review of the code at Gates C and D; fix every accessibility issue it finds.
- **vercel-react-best-practices:** not used (this is Astro, not Next.js).
- Loop at every gate: build → screenshots → taste critique → fix → screenshots again → report.

## Hard rules
- Product = "a fitness tracker for your mind". Never call it a friend, companion, coach, mentor or therapist. Never use "The friend who notices".
- Only the 20 brand kit colors and only DM Sans, Fraunces, Syne. Put every value in `src/styles/tokens.css`; no hex code or font name anywhere else.
- Rich gold #D99A2E is never text on light backgrounds; use bronze #98560B.
- No emoji, sparkle/star "AI" icons, brains, robots, neon, gradients, glitch, Three.js. Icons: Lucide, 2 px stroke. The only glow allowed is the one soft champagne glow in the night chapter (see the adapter).
- Motion: 160–400 ms, `cubic-bezier(0.22, 1, 0.36, 1)`, fade and settle. No bounce, spin, shake. Respect `prefers-reduced-motion`.
- Companions: use only the real SVG files in `public/companions/` (read its README.md first). Never draw or invent one. Use `companions.json` for names, roles, sample lines and alt text. Only one animated companion on screen at a time; the rest use the `-still` files. Good matches: hero = `hoot/actions/hoot-discovering.svg` (gold thread + orb = "pattern found"), Over weeks = Sprout, privacy = Button. Never use Nimbus.
- No invented users, numbers, quotes, logos or milestones. Keep `[CURRENT STAGE]` as a visible placeholder until I give the line.
- Privacy: say only "Your data stays on your phone." Add nothing stronger.
- The demo uses 3 fixed example moments and is labelled "Example moments". Nothing is sent. No free-text box.
- Waitlist says "You're on the list" only after a real successful save.
- Do not remove the "Neuro" brain mascot files from the repo, but do not use it on the site.

## Stack
- Astro (latest stable), TypeScript, plain CSS with tokens. Small islands in vanilla TypeScript only where a section needs JavaScript.
- Cinematic scroll: GSAP ScrollTrigger + Lenis, only for the scenes in the style adapter. With `prefers-reduced-motion`, or a viewport under 700px tall, turn off every pin and show a normal stacked page. Every pinned scene must fit 1366×768.
- Fonts: `@fontsource/dm-sans`, `@fontsource/fraunces`, `@fontsource/syne`, only the weights in the brand kit.
- Keep the old Playwright screenshot script idea: `npm run shots` saves phone (390×844), laptop (1366×768) and desktop (1440×900) screenshots of every section to `shots/<phase>/`.

## Page (one long page + /privacy)
Background is warm ivory for most of the page (Minimal Serif restraint). Tints go on cards and small panels, not full-width bands. Day → night → day.
1. Hero — left-aligned, editorial: "A fitness tracker for your mind." + moment demo + waitlist button. Ivory. Frame 0 is complete; nothing waits to animate in.
2. How it works — share a moment → see how you reacted → over weeks, see the pattern. Ivory, hairline rules, 1fr/2fr grid.
3. What it notices — flip cards: Jump, Hesitate, Sure and wrong (cards on mist). Ivory section.
4. Over weeks — PINNED cinematic scene: pebbles drop week 1→6, gold thread draws, background deepens ivory → deep emerald. Ends on the night line.
5. Why we build it — night chapter (deep emerald): colour-contrast Fraunces headline, gold thread under "think for yourself", count-up of the real PNAS numbers, one soft champagne glow, 3% grain. Bastani et al., PNAS 2025, linked.
6. Meet the companions — background eases back to ivory; "The tracker sees. The companion speaks." Shelf of 6–8 on lavender cards; tap shows role + one sample line.
7. Privacy — moment card drops into a phone shape. Oat (the one oat section).
8. Founders + FAQ — Jyothi (COO), Krishna (CEO); FAQ answers from the prototype; founder card on blush.
9. Waitlist — one email field; states: idle, sending, joined, error, not open yet. Ivory with a forest primary button.
Header: How it works, Patterns, Companions, Privacy, "Join the waitlist". Footer: Privacy, Instagram, LinkedIn.
/privacy: what the waitlist collects (email only), the service that stores it (placeholder until I choose), how to leave.

## Components (build once, reuse)
Button, Card, SectionLabel, PatternCard, MomentDemo, PebblePath, GoldThread, CompanionShelf, Companion, WaitlistForm, FAQ.

## Phases — STOP at each gate and wait for my "go"
- Phase 1 Foundation: Astro setup, tokens, fonts, header, footer, all 9 sections as static content. → Gate A: send screenshots; they must match the prototype.
- Phase 2 Interactions: MomentDemo, the pinned "Over weeks" scene + night chapter, PatternCard flips, CompanionShelf, privacy strip. → Gate B: screenshots + a scroll-frame strip (every 10% of each pinned scene) at 1440×900, 1366×768 and 390×844, plus the same with reduced motion on. Also show the two optional ideas from the adapter (hero word cycle, colour-contrast headlines on light) so I can choose.
- Phase 3 Content and data: WaitlistForm with the endpoint from `PUBLIC_WAITLIST_URL` (if unset, show "The list isn't open yet. Nothing was sent."), /privacy, FAQ, founders, SEO title/description, Open Graph image 1200×630, sitemap, robots, favicon. → Gate C: walk the honesty checklist in the brief, item by item.
- Phase 4 Launch: Lighthouse mobile (LCP < 2.5 s, CLS < 0.1, accessibility ≥ 95), keyboard-only test, reduced-motion test, then a Vercel preview deploy. → Gate D: send the numbers and the preview link. Do not connect the domain until I say so.

## Each gate report (short)
- What you built, what you could not do, and why.
- Every conflict you found between files.
- Every placeholder still on the page.
- Screenshot paths.
Do not commit secrets. Commit at the end of each phase with a clear message.
