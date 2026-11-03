---
name: minimal-serif-design
description: Design and build websites and web apps in the Minimal Serif style — typography-led editorial interfaces with refined serif headings, generous whitespace, muted palettes, and understated micro-animations. Inspired by Stripe Press, luxury fashion brands, and high-end literary publications. Use this skill whenever the user asks to design or build anything in a "Minimal Serif", "editorial", "literary", "typographic", or "refined serif" style — even casual phrasings like "make it look like a luxury editorial site", "serif-forward design", "clean serif layout", "give it a Stripe Press vibe", "typographic minimal", or "I want something elegant and magazine-like". Always use this skill before writing any code — do NOT attempt minimal serif design from memory alone.
---

# Minimal Serif Design Skill

Typography-led, editorial-quality web design. The serif IS the design. Whitespace is structural. Color is restraint. Every detail is intentional — no decoration for its own sake.

**Reference aesthetic**: Stripe Press, Céline, Loro Piana, literary magazines, high-end cultural institutions.

---

## Step 1: Ask the User These Questions

Ask all in one message. Tell them defaults are already chosen if they skip.

**1. Color Palette**
- **Ivory** *(default)* — `#faf8f4` bg, `#1a1a18` text — warm, paper-like. Classic.
- **Stone** — `#f3f1ec` bg, `#18171a` text — cooler, more architectural
- **Ink** — `#0e0d0b` bg, `#ede8e1` text — dark mode, cinematic and literary
- **Monochrome** — `#ffffff` bg, `#000000` text — stark, Swiss-editorial
- **Custom** — user provides hex values

**2. Serif Display Font** (headings, hero, pull quotes)
- **Cormorant Garamond** *(default)* — Renaissance elegance, high contrast, expressive
- **Playfair Display** — High-contrast transitional, bold and striking
- **Instrument Serif** — Contemporary, quiet confidence, softer contrast
- **Fraunces** — Variable, optical sizes, warmer and more expressive
- **EB Garamond** — Scholarly, classical authority

**3. Body & UI Font**
- **Lora + Cormorant** *(default when all-serif)* — warm editorial, full serif system
- **Inter** *(default for mixed)* — clean, invisible, gets out of serif's way
- **DM Sans** — slightly friendlier than Inter, good for SaaS
- **Hanken Grotesk** — humanist, pairs naturally with Renaissance serifs

**4. Accent**
- **None / Ink** *(default)* — no color accent; typographic hierarchy does all the work
- **Deep Ochre** — `#c4862a` — antique warmth, like aged paper and gold leaf
- **Forest** — `#2d5a3d` — restrained, literary
- **Crimson** — `#8b1a1a` — classical, authoritative
- **Slate** — `#4a5568` — modern, cool

**5. Animation Level**
- **Refined** *(default)* — Scroll fade-ups, link underline slide, button arrow micro-pull
- **Minimal** — Hover underlines only, no scroll animations
- **None** — Static

---

## Step 2: Defaults

| Decision | Default |
|---|---|
| Palette | Ivory (`#faf8f4` / `#1a1a18`) |
| Display font | Cormorant Garamond |
| Body/UI font | Inter |
| Accent | None (ink-only hierarchy) |
| Animation | Refined |

---

## Step 3: CSS Token System

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap');

:root {
  /* Palette — Ivory (default) */
  --bg:           #faf8f4;
  --bg-offset:    #f2ede5;   /* subtle section tint */
  --ink:          #1a1a18;
  --ink-mid:      #4a4845;   /* secondary text */
  --ink-soft:     #8a8683;   /* captions, metadata */
  --rule:         #d8d3cc;   /* hairline dividers */
  --accent:       var(--ink); /* default: no color — override if user picks one */

  /* Typography */
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-ui:      'Inter', system-ui, sans-serif;

  /* Type scale — fluid */
  --t-display: clamp(3.5rem, 8vw, 8rem);
  --t-h1:      clamp(2.5rem, 5vw, 5rem);
  --t-h2:      clamp(1.75rem, 3.5vw, 3rem);
  --t-h3:      clamp(1.25rem, 2vw, 1.75rem);
  --t-body:    clamp(1rem, 1.1vw, 1.125rem);
  --t-small:   0.8125rem;
  --t-label:   0.6875rem;

  /* Spacing scale */
  --sp-1: 0.5rem;
  --sp-2: 1rem;
  --sp-3: 1.5rem;
  --sp-4: 2.5rem;
  --sp-5: 4rem;
  --sp-6: 6rem;
  --sp-7: 10rem;

  /* Grid */
  --col-max: 1180px;
  --col-text: 680px;   /* ideal prose column */
  --col-narrow: 480px;

  /* Transitions — always slow and deliberate */
  --t-fast:   0.18s ease;
  --t-mid:    0.35s ease;
  --t-slow:   0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Ink/Dark override */
.theme-ink {
  --bg: #0e0d0b;
  --bg-offset: #161410;
  --ink: #ede8e1;
  --ink-mid: #a09890;
  --ink-soft: #6a6360;
  --rule: #2a2826;
}
```

---

## Step 4: Typography Rules (Core to the Aesthetic)

Minimal Serif is a typography-led style. Type IS the layout.

```css
/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; }
body { background: var(--bg); color: var(--ink); font-family: var(--font-ui); }

/* Display — hero statements, brand name */
.t-display {
  font-family: var(--font-display);
  font-size: var(--t-display);
  font-weight: 300;         /* Light weight — Cormorant shines thin */
  font-style: italic;       /* Italics are not decoration — they are the style */
  line-height: 0.95;
  letter-spacing: -0.02em;
  color: var(--ink);
}

/* Headings */
h1, .t-h1 {
  font-family: var(--font-display);
  font-size: var(--t-h1);
  font-weight: 400;
  line-height: 1.05;
  letter-spacing: -0.015em;
}

h2, .t-h2 {
  font-family: var(--font-display);
  font-size: var(--t-h2);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

h3, .t-h3 {
  font-family: var(--font-display);
  font-size: var(--t-h3);
  font-weight: 500;
  font-style: italic;
  line-height: 1.3;
}

/* Body */
p {
  font-family: var(--font-ui);
  font-size: var(--t-body);
  line-height: 1.75;
  color: var(--ink-mid);
  max-width: var(--col-text);
}

/* Labels — tracked uppercase, always UI font */
.label {
  font-family: var(--font-ui);
  font-size: var(--t-label);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
}

/* Pull quote */
blockquote {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 3vw, 2.25rem);
  font-weight: 300;
  font-style: italic;
  line-height: 1.4;
  color: var(--ink);
  border-left: 1px solid var(--rule);
  padding-left: var(--sp-4);
  margin: var(--sp-5) 0;
}

/* Hairline rule — use instead of visual dividers */
.rule {
  border: none;
  border-top: 1px solid var(--rule);
  margin: var(--sp-5) 0;
}
```

---

## Step 5: Layout Patterns

### Page Container
```css
.container {
  width: 100%;
  max-width: var(--col-max);
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 5vw, 4rem);
}

.section { padding: var(--sp-6) 0; }
.section-xl { padding: var(--sp-7) 0; }
```

### Navigation — Minimal, typographic
```css
nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) clamp(1.5rem, 5vw, 4rem);
  border-bottom: 1px solid var(--rule);
  position: sticky; top: 0;
  background: var(--bg);
  z-index: 100;
  backdrop-filter: blur(8px);
  background: color-mix(in srgb, var(--bg) 92%, transparent);
}

.nav-brand {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  text-decoration: none;
  color: var(--ink);
}

.nav-links { display: flex; gap: var(--sp-4); list-style: none; }

.nav-link {
  font-family: var(--font-ui);
  font-size: var(--t-small);
  font-weight: 400;
  letter-spacing: 0.04em;
  color: var(--ink-mid);
  text-decoration: none;
  position: relative;
  padding-bottom: 2px;
  transition: color var(--t-fast);
}
/* Underline micro-animation */
.nav-link::after {
  content: '';
  position: absolute;
  left: 0; bottom: 0;
  width: 100%; height: 1px;
  background: var(--ink);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--t-mid);
}
.nav-link:hover { color: var(--ink); }
.nav-link:hover::after { transform: scaleX(1); }
```

### Button — No gradients, no rounded pills
```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-family: var(--font-ui);
  font-size: var(--t-small);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  border-radius: 0;               /* No rounded corners */
  padding: 0.75rem 1.75rem;
  cursor: pointer;
  text-decoration: none;
  transition: background var(--t-fast), color var(--t-fast);
  overflow: hidden;
  position: relative;
}

.btn:hover { background: var(--ink); color: var(--bg); }

/* Arrow micro-interaction */
.btn .arrow {
  display: inline-block;
  transition: transform var(--t-fast);
}
.btn:hover .arrow { transform: translateX(4px); }

/* Ghost variant */
.btn-ghost {
  border-color: var(--rule);
  color: var(--ink-mid);
}
.btn-ghost:hover { border-color: var(--ink); color: var(--ink); background: transparent; }

/* Text link — underline style */
.link-text {
  font-family: var(--font-ui);
  font-size: var(--t-small);
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-thickness: 1px;
  text-decoration-color: var(--rule);
  transition: text-decoration-color var(--t-fast);
}
.link-text:hover { text-decoration-color: var(--ink); }
```

### Card — Open, borderless. Whitespace IS the card.
```css
.card {
  padding: var(--sp-4) 0;
  border-top: 1px solid var(--rule);
  display: grid;
  gap: var(--sp-2);
}

/* Hover: subtle ink reveal, not a box shadow */
.card-link {
  display: block;
  text-decoration: none;
  transition: opacity var(--t-fast);
}
.card-link:hover { opacity: 0.7; }
```

### Editorial Grid (2-column asymmetric)
```css
.grid-editorial {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: var(--sp-5);
  align-items: start;
}

@media (max-width: 768px) {
  .grid-editorial { grid-template-columns: 1fr; }
  .grid-editorial > *:first-child { order: 2; }
}
```

---

## Step 6: Micro-Animations

### Scroll Reveal — Very restrained
```css
.reveal {
  opacity: 0;
  transform: translateY(14px);
  transition: opacity var(--t-slow), transform var(--t-slow);
}
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Stagger for lists */
.reveal:nth-child(2) { transition-delay: 0.08s; }
.reveal:nth-child(3) { transition-delay: 0.16s; }
.reveal:nth-child(4) { transition-delay: 0.24s; }
```

```js
const io = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
```

### Horizontal Rule Extend — Signature editorial detail
```css
.rule-extend {
  border: none;
  height: 1px;
  background: var(--rule);
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.rule-extend.visible { transform: scaleX(1); }
```

### Number / Stat Reveal
```js
function animateCount(el) {
  const target = parseInt(el.dataset.count);
  const duration = 1200;
  const start = performance.now();
  const tick = now => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(p * target).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  .reveal { opacity: 1; transform: none; }
  .rule-extend { transform: scaleX(1); }
}
```

---

## Step 7: Anti-Patterns (Non-Negotiable)

| Never do this | Do this instead |
|---|---|
| Gradient buttons or backgrounds | Flat ink fill on hover only |
| Rounded corners > 4px | Sharp edges (`border-radius: 0` or `2px` max) |
| Cards with drop shadows | Open cards with top border rule, whitespace as container |
| Colorful section backgrounds alternating | All sections share the same `--bg`; offset sections use `--bg-offset` at most |
| Bold/heavy serif weights for body | Light weight (300) display + regular (400) body |
| Emoji anywhere | SVG icons only, stroke-based, 1.5px weight |
| Icon inside colored circle container | Icon sits inline in the flow |
| Centered hero text on decorative bg | Left-aligned or offset-grid hero, pure bg |
| Feature cards with gradient icon backgrounds | Typography + hairline rules + whitespace |
| Large accent-colored CTA button | Small-tracked-uppercase bordered button |
| Pure #fff background | `--bg` is warm/off-white (`#faf8f4`) — never pure white unless Monochrome palette |

---

## Step 8: Icon Rules

- **SVG only** — inline `<svg>` elements, no icon fonts, no emoji
- **Style**: Thin stroke, 1.5px weight, no fill, `stroke="currentColor"`
- **Size**: 18–20px UI, 14–16px inline, 32–40px for decorative/feature use
- **Color**: `var(--ink-soft)` default, `var(--ink)` on hover/active
- Recommended sources: Lucide, Phosphor (regular weight), or hand-crafted paths

```html
<!-- Correct usage -->
<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M5 12h14M12 5l7 7-7 7"/>
</svg>
```

---

## Step 9: Output Standards

- **Complete, runnable single-file HTML** — all CSS, JS, and SVG inline; no external dependencies except Google Fonts
- **Responsive** — mobile-first, `clamp()` for all type, CSS Grid/Flex layouts that work at 375px → 1440px
- **No borders on cards** — open layouts with whitespace and hairline rules only
- **Serif for display/headings only** — body text is always the UI font (cleaner on screen at small sizes)
- **Italics are intentional** — use serif italics as emphasis, for subheads, pull quotes — not bold
- **CSS variables throughout** — nothing hardcoded outside `:root`
- **Every section breathes** — minimum `var(--sp-5)` vertical padding per section
- **No hero gradient overlays** — if imagery is used, it sits adjacent to type, not behind it with a tint
- **Hierarchy through size + weight + spacing** — not through color
- **Accent used with extreme restraint** — at most one CTA and one highlight per page; default is ink-only
