# Neuroditto website brief (source map + web rules)

Made Nov 3, 2026 from Jyothi's Project docs. Use this before planning or building the website.

## Source of truth (in this order)
1. `neuroditto-product.md` — what the product is (Nov 3, 2026). Wins over older wording.
2. `neuroditto-brand-kit.md` — the 20 colors, 3 fonts, sizes, contrast pairs, dark mode (locked Oct 24, 2026).
3. `companions-roster.md` — the 30 companions and the "Soft Pebble" art style.
4. Current design: "Neuroditto Website Prototype" Design artifact (Nov 3, 2026) — already follows 1 to 3.

Not needed for the website: weekly packs, style-log, learn-explore-teach SKILL. The reel-editor skill is older; take only the visual rules below from it.

## Message
- Hero line: "A fitness tracker for your mind." Support: it tracks thinking patterns and blind spots across every part of life.
- How it works: share a moment in a few words → see how you reacted → over weeks, see the pattern.
- Pattern words (use as written): jump, hesitate, sure and wrong.
- Roles: the tracker sees; the companion speaks.
- Answer to "an AI to fix AI dependence?": AI isn't the problem; how it's built is. Most AI tools think for you. Neuroditto helps you think for yourself. Proof: Bastani et al., PNAS 2025 (about 1,000 students; answer-giving AI → 17% worse once removed; hint-giving AI did not).
- Privacy claim: "data stays on your phone". Nothing stronger (no "encrypted", "100% private") unless Jyothi or Krishna confirm.
- Founders: Jyothi (COO) and Krishna (CEO), building in public.
- Stage: ask before writing it. Never invent users, numbers or milestones.
- Never call the product a friend, companion, mentor, coach or therapist. Do not use "The friend who notices" (retired Nov 1, 2026).
- CTA: soft. Waitlist / follow along. No "sign up now" until launch.

## Visual rules
- Default combination: warm ivory #FBF8F2 → deep ink #14342B text → forest #176849 buttons with ivory labels → sage #E7F0E8 cards → small gold accents. Mix ~65% neutrals, 20% tints, 10% greens, 5% gold.
- Rich gold #D99A2E is decoration only on light backgrounds; use bronze #98560B for gold-toned text; light gold #F7D16C on deep emerald.
- Fonts: DM Sans (default), Fraunces 500/600 (hero, reflective headlines), Syne 600–800 (a few words: labels, numbers, "Building in public").
- Web sizes: hero Fraunces Semibold 56–72 px desktop, 40–48 px mobile; body DM Sans 17/27 px.
- Signature graphic: pebbles (moments) joined by a thin gold thread ending in a gold dot (from the logo).
- Icons: Lucide, rounded, 2 px stroke. Cards 20 px radius, panels 28 px, soft green-tinted shadows.
- Motion "settles like a stone": 160–400 ms, cubic-bezier(0.22, 1, 0.36, 1); fade and settle. No bounce, spin, flash, shake.
- Banned: emoji, stickers, robots, brains, neon, blue-purple gradients, glitch, star/sparkle "AI" icons.
- Selected states: forest outline plus a check or label (never color or the soft border alone).

## Companions on the website
- 30 characters: 14 humans, 10 animals, 6 objects (see roster). Style "Soft Pebble": soft rounded 2D, no outlines, light from upper left, same eyes and proportions, muted colors, each carries a small gold spark.
- Use only the real art files; never redraw or invent one. They are exported from the Companion Studio rig into `public/companions/` (900 SVGs: still, animated actions, expressions, views + companions.json). Source pages: Companions https://claude.ai/artifact/F6D58PnQt7EcjzXNVzcogK, Companion Studio https://claude.ai/artifact/S5jDWFcEKEww8oxJCDZRTE, App Prototype https://claude.ai/artifact/QfTxmhQ6qJqrurXjbqhfXK.
- Human companions are adults; no romantic framing.
- Jyothi's notes from posts: she does not want Nimbus; Mochi uses open eyes.

## Open conflicts to decide
- The "Neuro" brain mascot (React kit, Oct 2026) breaks the "no brains" rule and is not a roster companion. Retire it from the website or get Jyothi's OK.
- `D:\DEV\bloom-landing` (dark "night lab", Three.js, other fonts) does not follow the brand kit. Rebuild from the Design prototype.
