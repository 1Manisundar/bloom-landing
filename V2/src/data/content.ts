// Words are copied from the approved prototype (docs/prototype/Main.dc.html, Nov 3 2026),
// corrected where the brief or the product definition say otherwise (see the Gate A report).

/** The three fixed example moments for the hero demo. Nothing is typed by the visitor; nothing is sent. */
export const MOMENTS = [
  {
    text: "Snapped at my sister over something small.",
    tag: "Jump",
    line: "You answered before she finished. Want to look at when that happens?",
  },
  {
    text: "Rewrote the same email four times. Still not sent.",
    tag: "Hesitate",
    line: "You knew what to say. You waited anyway.",
  },
  {
    text: "Was sure the call was at 3. It was at 2.",
    tag: "Sure and wrong",
    line: "You felt certain, so you didn’t check.",
  },
] as const;

export const STEPS = [
  { title: "Share a moment", body: "A few words about something that happened today. No long journaling." },
  { title: "See how you reacted", body: "Right away, the app shows you how you met that moment." },
  { title: "See the pattern", body: "Over weeks, the moments add up. You start to see what you repeat." },
] as const;

export const PATTERNS = [
  {
    word: "Jump",
    body: "You react before you’ve heard the whole thing.",
    example: "You answered fast in three of your five work moments.",
    companion: "biscuit",
    pose: "talking",
  },
  {
    word: "Hesitate",
    body: "You wait, even when you already know what to do.",
    example: "You rewrote that message four times before you sent it.",
    companion: "tomo",
    pose: "thinking",
  },
  {
    word: "Sure and wrong",
    body: "You feel certain, so you don’t check. And you miss.",
    example: "You were certain about the time. It was an hour off.",
    companion: "mochi",
    pose: "thinking",
  },
] as const;

/** Example data from the prototype: times you jumped, per week. */
export const WEEKS = [4, 4, 3, 3, 2, 1] as const;

export const STUDY = {
  cite: "Bastani et al., PNAS, 2025",
  title: "Generative AI without guardrails can harm learning: Evidence from high school mathematics",
  url: "https://doi.org/10.1073/pnas.2422633122",
};

export const FAQ = [
  {
    q: "An AI to fix AI dependence?",
    a: "AI isn’t the problem; how it’s built is. Most AI tools think for you. Neuroditto shows you how you think, and you decide what to change.",
  },
  {
    q: "Is it a therapist or a coach?",
    a: "No. It’s a tracker. It notices and shows. It doesn’t diagnose, and it doesn’t tell you what to do.",
  },
  {
    q: "How much do I have to write?",
    a: "A few words per moment. The pattern comes from many small moments over weeks.",
  },
  { q: "Where does my data go?", a: "It stays on your phone." },
  {
    q: "When can I use it?",
    a: "[CURRENT STAGE]. Join the waitlist and we’ll tell you first.",
  },
] as const;

export const FOUNDERS = [
  { name: "Jyothi", role: "Co-founder, COO" },
  { name: "Krishna", role: "Co-founder, CEO" },
] as const;

export const LINKS = {
  instagram: "https://www.instagram.com/neuroditto.ai/",
  linkedin: "#linkedin-placeholder", // PLACEHOLDER: no LinkedIn URL given yet
};

export const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#patterns", label: "Patterns" },
  { href: "/#companions", label: "Companions" },
  { href: "/#privacy", label: "Privacy" },
] as const;
