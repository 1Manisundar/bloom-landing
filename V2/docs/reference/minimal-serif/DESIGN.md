# Minimal Serif — Design Guidelines

## Visual Style
- **Aesthetic**: Typography-led editorial — off-white backgrounds, high-contrast serif headings, extreme whitespace, no decorative elements
- **Mood**: Refined, literary, confident restraint — like a luxury brand's annual report or a high-end cultural magazine
- **Inspiration**: Stripe Press, Céline, Loro Piana, NY Review of Books, literary imprints

---

## Color Palettes

Use one palette per project. Do not mix.

### Ivory *(default)*
- **Background**: `#faf8f4` — warm off-white, never pure white
- **Background offset**: `#f2ede5` — used for subtle section tints only
- **Text primary**: `#1a1a18` — near-black, warm undertone
- **Text secondary**: `#4a4845` — body copy, supporting text
- **Text muted**: `#8a8683` — captions, labels, metadata
- **Rule / Border**: `#d8d3cc` — hairline dividers only
- **Accent**: none by default — ink hierarchy does all the work

### Stone
- **Background**: `#f3f1ec` — cooler, more architectural
- **Text primary**: `#18171a`
- **Rule**: `#ccc8c0`

### Ink *(dark mode)*
- **Background**: `#0e0d0b`
- **Background offset**: `#161410`
- **Text primary**: `#ede8e1`
- **Text secondary**: `#a09890`
- **Text muted**: `#6a6360`
- **Rule**: `#2a2826`

### Monochrome
- **Background**: `#ffffff`
- **Text primary**: `#000000`
- **Rule**: `#e0e0e0`

### Optional Accent Colors *(use with extreme restraint — one CTA max)*
- **Deep Ochre**: `#c4862a` — antique warmth
- **Forest**: `#2d5a3d` — restrained, literary
- **Crimson**: `#8b1a1a` — classical, authoritative
- **Slate**: `#4a5568` — modern, cool

---

## Typography

### Fonts
- **Display / Headings**: Cormorant Garamond (preferred) — light (300) and italic are the signature weights. Alternatives: Playfair Display, Instrument Serif, Fraunces, EB Garamond
- **Body / UI**: Inter (preferred) — regular (400) only. Alternatives: DM Sans, Hanken Grotesk
- **Never**: bold sans-serif headings, rounded fonts, decorative scripts, system fallbacks as primary

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Inter:wght@300;400;500&display=swap');
```

### Type Scale
| Role | Font | Weight | Size | Style |
|---|---|---|---|---|
| Display / Hero | Cormorant Garamond | 300 | `clamp(3.5rem, 8vw, 8rem)` | italic |
| H1 | Cormorant Garamond | 400 | `clamp(2.5rem, 5vw, 5rem)` | normal |
| H2 | Cormorant Garamond | 400 | `clamp(1.75rem, 3.5vw, 3rem)` | normal |
| H3 | Cormorant Garamond | 500 | `clamp(1.25rem, 2vw, 1.75rem)` | italic |
| Body | Inter | 400 | `clamp(1rem, 1.1vw, 1.125rem)` | normal |
| Small / UI | Inter | 400–500 | `0.8125rem` | normal |
| Label | Inter | 500 | `0.6875rem` | uppercase, tracked |

### Typography Rules
- Italics are a **design tool**, not emphasis — use for subheads, pull quotes, secondary display lines
- Line height: `0.95` for large display, `1.05–1.15` for headings, `1.75` for body
- Letter spacing: `-0.02em` display, `-0.015em` H1, `+0.12em` labels (uppercase)
- Max line length: `680px` / ~65–70 characters for body prose
- Pull quotes: `font-size: clamp(1.5rem, 3vw, 2.25rem)`, weight 300, italic, left-bordered with hairline rule

---

## Spacing & Layout
- **Feel**: Extremely airy — whitespace is structural, not decorative. When in doubt, add more space.
- **Section padding**: `clamp(4rem, 8vw, 10rem)` top/bottom per section
- **Container max-width**: `1180px`, centered, `clamp(1.5rem, 5vw, 4rem)` horizontal padding
- **Text column**: max `680px` for prose; never full-bleed body text
- **Grid**: 12-column or asymmetric editorial (1fr / 2fr). Avoid symmetric 2-equal-column layouts.
- **Vertical rhythm unit**: `0.5rem` base, spacing in multiples: `0.5 / 1 / 1.5 / 2.5 / 4 / 6 / 10rem`

---

## Borders & Radius
- **Border radius**: `0` — no rounded corners. Maximum `2px` if softening is essential.
- **Borders on cards**: none — open layouts only. Cards are defined by whitespace and top hairline rules.
- **Hairline dividers**: `1px solid var(--rule)` — the only structural border. Never thicker.
- **Button borders**: `1px solid var(--ink)` — square corners only

---

## Shadows & Elevation
- **None** — this design style is completely flat. No drop shadows, no elevation, no glow effects.
- Depth is achieved through **type size contrast** and **whitespace**, not shadows.

---

## Buttons
- **Primary**: transparent background, `1px solid var(--ink)` border, `border-radius: 0`, small tracked uppercase Inter label, fills solid on hover (background becomes `var(--ink)`, text becomes `var(--bg)`)
- **Secondary / Ghost**: `1px solid var(--rule)`, `color: var(--ink-mid)`, border darkens to `var(--ink)` on hover, no fill
- **Text link**: underline style — `text-decoration-color: var(--rule)` at rest, transitions to `var(--ink)` on hover
- **Size**: `padding: 0.75rem 1.75rem`, `font-size: 0.6875rem`, `letter-spacing: 0.06em`, `text-transform: uppercase`
- **Arrow micro-interaction**: inline SVG arrow icon shifts `translateX(4px)` on hover

---

## Icons
- **SVG only** — inline `<svg>`, never icon fonts, never emoji
- **Style**: thin stroke, `stroke-width: 1.5`, no fill, `stroke="currentColor"`
- **Size**: 18–20px UI, 14–16px inline text, 32–40px for decorative use
- **Color**: `var(--ink-soft)` default, `var(--ink)` on hover/active
- **Never box icons** — no colored circles, no card containers. Icons sit directly in the flow.
- **Sources**: Lucide, Phosphor (regular weight), or hand-crafted paths

```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M5 12h14M12 5l7 7-7 7"/>
</svg>
```

---

## Components

### Navigation
- Sticky, `background: var(--bg)` with `backdrop-filter: blur(8px)`, `border-bottom: 1px solid var(--rule)`
- Brand name: Cormorant Garamond, `font-size: 1.25rem`, weight 400
- Nav links: Inter, `0.8125rem`, tracked, `color: var(--ink-mid)` — underline slide-in on hover (`scaleX` from left)
- No hamburger menus with animation — simple collapse to stacked

### Cards
- **No card borders, no shadows** — cards are open containers defined by a `border-top: 1px solid var(--rule)` and whitespace
- Hover: `opacity: 0.7` on the link wrapper — no lift, no shadow, no background change
- Internal padding: `var(--sp-4)` top/bottom, no sides (bleeds to container edge)

### Inputs
- `border: 1px solid var(--rule)`, `border-radius: 0`, no shadow
- Focus: `border-color: var(--ink)` — no glow ring, no color fill
- Label: tracked uppercase Inter above the field, `color: var(--ink-soft)`

### Pull Quote / Blockquote
- Left border: `3px solid var(--rule)` (or `1px` for minimal variant)
- `padding-left: 2.5rem`, no background tint
- Font: Cormorant Garamond, light italic, `clamp(1.5rem, 3vw, 2.25rem)`

---

## Micro-Animations

All animations are slow and deliberate. Nothing bouncy or elastic.

| Animation | Implementation | Duration |
|---|---|---|
| Scroll fade-up | `opacity 0 → 1`, `translateY(14px) → 0` | `0.6s cubic-bezier(0.16, 1, 0.3, 1)` |
| Staggered list | `transition-delay` in 80ms increments | — |
| Horizontal rule extend | `scaleX(0) → 1`, `transform-origin: left` | `0.8s cubic-bezier(0.16, 1, 0.3, 1)` |
| Link underline slide | `scaleX(0) → 1` on `::after` pseudo | `0.35s ease` |
| Button hover fill | `background` transition | `0.18s ease` |
| Button arrow pull | `translateX(0) → translateX(4px)` | `0.18s ease` |
| Stat counter | JS `requestAnimationFrame` | `1200ms` |

Always include:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  .reveal { opacity: 1; transform: none; }
}
```

---

## Imagery
- Photography: when used, muted or desaturated. Never lifestyle stock photography. Images sit **adjacent** to type — never behind it with an overlay tint.
- No hero gradients, no color overlays on images
- No illustrations, no abstract shapes as decoration
- Art direction: gallery-style, full-bleed horizontal strips, or small inset images beside text columns

---

## What NOT to Do

| ❌ Never | ✅ Instead |
|---|---|
| Pure white `#fff` background | Use `#faf8f4` or off-white — always warm |
| Rounded corners > 2px | `border-radius: 0` — sharp is the brand |
| Drop shadows on cards | Open card with top hairline rule + whitespace |
| Gradient buttons | Flat fill on hover only |
| Bold sans-serif headings | Light-weight Cormorant Garamond |
| Emoji anywhere | Thin-stroke SVG icons only |
| Icons in colored circles | Icons inline in the flow, no containers |
| Alternating colored section backgrounds | Same `--bg` throughout; `--bg-offset` once max |
| Centered hero text on decorative background | Left-aligned or offset-grid hero, pure `--bg` |
| Feature cards with gradient icon backgrounds | Typography + hairline rules + whitespace only |
| Multiple accent colors | One accent maximum — or none at all |
| Heavy/bold italic headings | Light (300) italic for the most impactful display use |

---

## Replication Notes for AI Coding Tools

1. **Typography carries the design** — invest in the font pairing and type scale before touching layout
2. **Whitespace is non-negotiable** — section padding must be at minimum `6rem`; compress nothing
3. **No rounded corners** — `border-radius: 0` everywhere except where explicitly stated
4. **Serif italics are not emphasis** — they are the primary display style for hero/subhead text
5. **Flat layout only** — no shadows, no elevation, no depth effects
6. **Hairline rules are the only decorative element** — `1px solid var(--rule)` dividers and card tops
7. **Labels are always small-tracked-uppercase Inter** — never Cormorant for labels or UI text
8. **One color maximum** — if an accent is used, it appears on exactly one CTA per page
9. **Keep the color count to 5 tokens** — `--bg`, `--ink`, `--ink-mid`, `--ink-soft`, `--rule`. That's the whole palette.
10. **Animations are slow and ease-out** — `0.6s` minimum for scroll reveals; never spring/bounce easings
