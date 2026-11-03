# Neuroditto companions (exported Nov 3, 2026)

Source: the "Neuroditto Companion Studio" artifact (the shared Soft Pebble rig). These are the real companions; do not redraw them.
Mochi is exported with open eyes (Jyothi's rule, Oct 31, 2026).

## Per companion (`<key>/`)
- `<key>.svg` — front view, still. Use for cards, the shelf, and the share image.
- `actions/<key>-<action>.svg` — animated (CSS inside the SVG; stops under reduced motion).
- `actions/<key>-<action>-still.svg` — the same pose, not animated.
  Actions: idle, listening, thinking, talking, waving, discovering (gold thread + gold orb), reading, writing, sleeping.
- `expressions/<key>-<expr>.svg` — calm, happy, curious, thinking, surprised, proud, empathetic, concerned.
- `views/<key>-3q.svg`, `-side.svg`, `-back.svg` — turnaround.

## Data
- `companions.json` — key, name, type (Human / Animal / Object), role, greeting line, personality, alt text.
- `rig.js` + `characters.json` — the rig itself (`build(character, {action, expression, view})`), if the site needs to build a pose live.

## Notes for the website
- Use an animated SVG through `<img src>` or inline. Each file is 200×240.
- One animated companion on screen at a time; the others use `-still` files.
- Some colours in the art (skin, clothes) are outside the brand kit on purpose: the brand kit says the companions bring extra colour and personality.
- Jyothi does not want Nimbus used.
