# Update the Neuroditto website to the approved product page (Claude Code prompt)

Made Nov 9, 2026. This prompt REPLACES the look, the page order and the section list in `NEURODITTO_SITE_PROMPT.md` and in both style adapters (v1 and v2). The stack, the waitlist backend, `/privacy` and the Phase 4 launch checks from the old prompt stay.

## Where you work
- The site is the Astro project in `D:\DEV\bloom-landing\V2`, on branch `site-v2`. Do not change anything outside `V2`.
- Before you start, commit the current state with the message `snapshot before product-page update`.
- Put the approved design file at `V2/docs/reference/product-page.html`. It is a self-contained page: open it in a browser and scroll through it. **It is the target.** Match its words, section order, layout, colours, type sizes and motion. It is a reference, not code to paste: rebuild it as clean Astro components.

## Ask first
- If something is not in this prompt or in the reference page, **stop and ask me**. Do not add, remove or redesign anything on your own.
- At each gate, stop and wait for my "go".

## Order of authority
1. This prompt
2. `docs/reference/product-page.html` (the approved design)
3. `docs/neuroditto-brand-kit.md`, for **colours, fonts and companions only**
4. `docs/neuroditto-product.md`, for the honesty rules
5. Everything else (old prompt, style adapters v1 and v2, `Main.dc.html`, VISION.md, CLAUDE.md)

List every conflict you find in your gate report.

## The rules (all are strict)

### From the brand kit, take only three things
1. **Colours:** the 20 brand kit colours, with no other colours. Gradients, tints and transparencies made from these colours are allowed. Put every value in `src/styles/tokens.css`. No hex code goes anywhere else.
2. **Fonts:** Fraunces (headlines), DM Sans (body and UI), Syne (small uppercase labels). No other fonts.
3. **Companions:** only the real SVG files in `public/companions/`. Never draw or redraw one. Never use Nimbus.

Do not use any other brand-kit item: no logo stones, no gold-thread decoration, no pebble motifs as page decoration. Pebbles and the gold line may appear **only inside the phone screens**, because they are part of the app UI.

### The look: an Apple-style product page
- Show the product big, with one strong line per idea. The screens do the talking.
- Do not put the app's small UI text on the page as marketing (for example "Does this sound like you?", answer chips or button rows). App UI appears only inside the phone frame.
- Light and calm. Most sections are ivory or light brand tints. The only dark sections are Privacy and Why we build it (deep emerald).
- Do not use: WebGL, Three.js, particles, glows on dark backgrounds, neon, "AI" sparkle icons, brains, robots, emoji or marquees. That is the old Night Glow direction, which we dropped.
- Do not use the pattern labels Jump, Hesitate or Sure and wrong anywhere. The app shows patterns as if–then chains. Remove the old pattern cards, the marquee band and the floating companion cast.

### Not a health or fitness app
- Do not show body data on the page: no sleep hours, no steps, no heart rate, and no "Health Connect" as a source. The headline already says "fitness tracker". Body numbers make the site look like a sleep or fitness tracker.

### Honesty
- Never call the product a friend, companion, coach, mentor or therapist. The companion is a character inside the app.
- Every phone screen and every bento tile uses the example person "Alex" and example data. Keep the label "Design preview. Example person, example data." near the story phone, and "Screens use an example person and example data." under the bento.
- No invented users, numbers, quotes, logos or milestones. The PNAS study numbers in Why we build it stay as they are, with the link.
- **Privacy wording needs my confirmation.** Use the three lines from the reference page, but list them in your Gate 1 report as "waiting for founder confirmation". Do not make them stronger.

### Smooth colour, everywhere
- The page background colour follows the scroll. Each section has `data-bg` and `data-fg` (background and text colour). JavaScript blends from one colour to the next while the section moves up. The blend starts when the section top reaches about 88% of the screen height and ends at about 52%. It uses smoothstep, plus a small lag (about 0.14 per frame) for a buttery feel.
- The header background and text colours follow the same values (`--pbg`, `--pfg`). There are **no hard cuts anywhere**: no instant switches of section colour, header colour or element colour.
- Smooth scrolling uses Lenis (lerp about 0.085), on wheel only. Touch scrolling on phones stays native.
- Animate only `transform` and `opacity`, except the page colour variables.

### Phone first
- Most visitors come from Instagram on Android phones. Test at 390×844 and 412×915 first, then at 1366×768 and 1440×900.
- No empty gaps, no overlapping text and no cut-off elements at any size.
- The story phone frame is designed at 320×660 and scales down to fit the space under the text. It must never be cut off.

### Motion
- Large moves use `cubic-bezier(.22,1,.36,1)`. Story animations are tied to scroll progress, not to time.
- With `prefers-reduced-motion`: no pin, no Lenis, and every chapter is shown stacked in its final state.
- If the screen is shorter than 600px, turn off the pin and stack the chapters.

## The page, section by section (match the reference)
1. **Header:** logo, links (How it works, Demo, Privacy, Why), and the "Join the waitlist" button. On phone: logo, button and menu.
2. **Hero** (ivory): small "NEURODITTO" label, the headline "A fitness tracker for your *mind.*" with each line rising from a mask, the support line, and two buttons (Join the waitlist, See how it works). Nothing else.
3. **Story** (`#story`, pinned, about 460vh desktop and 420vh phone). One phone stays on screen, and its screen changes four times. The text beside it (above it on phone) changes with it. The page colour moves through ivory, oat, mist and lavender, one colour per chapter.
   - **01 Just talk.** Mira's home screen: date label, "Good morning, Alex", her bubble with two source chips, Mira waving (`mira/actions/mira-waving.svg`), and the Give / Talk / Type dock.
   - **02 Every moment, kept.** "Your year, in moments": 12 month columns. Pebbles drop in month by month, coloured by how each moment felt (Hard, Heavy, Mixed, Good, Wonderful), with a legend and one moment card.
   - **03 Your life, on one map.** Eight areas pop in around "You", then gold lines draw between them. The card reads "Work and Partner come up together when launch weeks run late. · 3 times · Your moments · Calendar".
   - **04 See it before it repeats.** An if–then chain builds step by step along a gold line (If / You think / Then you / And), then the strip "4 times it happened · 1 time it didn't" fills.
4. **Demo** (`#demo`, ivory): "Watch it *notice.*", the line "One evening. One moment. The pattern it caught.", then **the demo film slot** (see below).
5. **Bento** (`#inside`, ivory): "Small app. *Whole picture.*" with five tiles:
   - Today: one small step, every morning
   - Clear one thought: dashed thought, then a gold step card, with "About 4 minutes, one question at a time."
   - Goals that grow: seed, sprout, leaves, bloom
   - Everything shows where it came from: chips You said, Calendar · read only, Your moments, Not quite?
   - 30 ways to talk it through: six companion faces
6. **Privacy** (`#privacy`, deep emerald): lock icon, "Your mind stays *on your phone.*", and the three short lines.
7. **Companions row:** the two rows of companion faces, scrolling slowly.
8. **Why we build it** (deep emerald): keep the current content and the PNAS link.
9. **Founders + FAQ:** keep the current content. Restyle it to match this page (ivory, big Fraunces headings, white rounded cards). Show me at Gate 1.
10. **Waitlist** (`#join`): keep the current form, its states and the Supabase endpoint.
11. **Footer.**

## The demo film slot (build it now; I add the film later)
- Make a `DemoFilm.astro` component. Its props are `src` (MP4), `poster` (image), `captions` (optional `.vtt` file) and `label`.
- The frame is 16:9, max width 1100px, corner radius 32px (22px on phone), with a deep emerald background.
- While `src` is empty, show the placeholder from the reference: a gold play circle, "Demo film goes here" and "16:9 · about 18 seconds · MP4 + poster image".
- When `src` is set: a `<video>` with `muted`, `playsinline`, `loop`, `preload="none"` and the poster. It plays only while the frame is on screen (IntersectionObserver) and pauses when it leaves. It has a visible play/pause button and a sound toggle. With reduced motion: no autoplay; the person presses play.
- The films will be short, cinematic clips of a phone in a real scene, about 18 seconds each, 16:9 (the samples are 848×480). Make the component able to hold more than one film later (for example, tabs under the frame), but build and show **one** now.
- Keep the caption "Example person and example data." under the frame.

## Remove from the current V2 site
Remove the old hero demo with the floating companions, the marquee band, the Jump / Hesitate / Sure and wrong cards, the "Over weeks" pebble scene, the stacking "How it works" cards, any sleep or steps visuals, and any mesh-gradient drift. Keep the files of the old components in git history only. Do not leave dead code.

## Performance budget (phone)
LCP under 2.5 s, CLS under 0.1, total JavaScript under about 150 KB gzipped. Pause the story's frame loop when the story is off screen. Load companion art below the first screen lazily (but not inside the story phone).

## Gates
- **Gate 1, build:** all sections built and matching the reference page. Send screenshots at 390×844, 412×915, 1366×768 and 1440×900:
  - the hero
  - each story chapter at about 5%, 37%, 62% and 95% of the story
  - the demo slot, bento, privacy, founders + FAQ and the waitlist
  - two frames during one colour change (to show there is no hard cut)
  - the same set with reduced motion on

  Put a screenshot of the reference page at the same size beside each one.
- **Gate 2, polish:** fix everything from my review. Run the web-design-guidelines review and fix every accessibility issue.
- **Gate 3, launch (the old Phase 4):** Lighthouse mobile, a keyboard-only test, a reduced-motion test and a Vercel preview (Root Directory = `V2`, noindex on the preview). Confirm that RLS is on for the waitlist table.

## Each gate report (short)
- What you built, what you could not do, and why
- Every conflict between files
- Every placeholder still on the page, including the demo film, the privacy lines to confirm, `[CURRENT STAGE]` and the founder photos
- Screenshot paths

Commit at the end of each gate with a clear message. Do not commit secrets.
