// Words come from the approved product page (docs/reference/product-page.html, Nov 9 2026).
// Why we build it, Founders, FAQ and the waitlist keep the words they had before (update prompt, items 8–10).
// Every screen uses the example person "Alex" and example data.

export const NAV = [
  { hash: "#story", label: "How it works" },
  // DEMO OFF until the film exists (see src/pages/index.astro).
  // { hash: "#demo", label: "Demo" },
  { hash: "#privacy", label: "Privacy" },
  { hash: "#why", label: "Why" },
] as const;

export const HERO = {
  kicker: "Neuroditto",
  lines: ["A fitness tracker", "for your"],
  key: "mind.",
  support: "It tracks your thinking patterns and blind spots across every part of your life.",
};

/** The four story chapters; `bg` is the page colour (a brand token name) for each one. */
export const CHAPTERS = [
  { n: "01", title: "Just talk.", body: "Tell your companion about your day in a few words. Say it out loud or type it. That’s all it asks.", bg: "ivory" },
  { n: "02", title: "Every moment, kept.", body: "Each moment becomes a pebble, coloured by how it felt. A year of them says more than any diary.", bg: "oat" },
  { n: "03", title: "Your life, on one map.", body: "Work, body, people, play. See which parts of your life quietly pull on each other.", bg: "mist" },
  { n: "04", title: "See it before it repeats.", body: "When money feels tight, you say yes to more work, and your mornings pay for it. Now you can see it. And choose.", bg: "lavender" },
] as const;

/** Chapter 02: how each moment felt, darkest to brightest (token names). */
export const FELT = [
  { label: "Hard", token: "ink" },
  { label: "Heavy", token: "eucalyptus" },
  { label: "Mixed", token: "dark-text-2" },
  { label: "Good", token: "jade" },
  { label: "Wonderful", token: "gold" },
] as const;
/** Example year: one column per month, each number is an index into FELT. */
export const YEAR = [[3, 2], [1, 3, 3], [2, 4], [3, 3, 4], [4, 2, 3, 3], [1, 2], [3, 4, 4], [2, 3], [4, 4, 3, 2], [0, 1, 2], [3, 4], [4, 3, 4, 4]];
export const MONTH_TICKS = ["Dec", "Mar", "Jun", "Sep", "Nov"];

/** Chapter 03: life areas (name, weight) and the links between them (from, to, width). */
export const AREAS: Array<[string, number]> = [["Work", 9], ["Body", 6], ["Partner", 4], ["Family", 5], ["Friends", 3], ["Money", 2], ["Home", 3], ["Play", 1]];
export const AREA_LINKS: Array<[number, number, number]> = [[0, 1, 3.5], [0, 2, 2.5], [5, 0, 2], [3, 6, 1.5], [1, 7, 1.5]];

/** Chapter 04: the if–then chain. */
export const CHAIN = [
  { k: "If", text: "Money feels tight" },
  { k: "You think", text: "“I should take every chance to get ahead.”", thought: true },
  { k: "Then you", text: "Say yes to more work, straight away" },
  { k: "And", text: "Your mornings and evenings get moved" },
] as const;
/** true = it happened, false = it didn't. */
export const STRIP = [true, true, true, false, true];

/** Demo films. Empty `src` shows the placeholder. More than one film shows tabs under the frame. */
export const FILMS = [
  { src: "", poster: "", captions: "", label: "One evening, one moment, the pattern it caught" },
];

/** PLACEHOLDER: waiting for founder confirmation (update prompt, Honesty). Do not make these stronger. */
export const PRIVACY_LINES = [
  { title: "Kept here.", body: "What it remembers about you is stored on this phone." },
  { title: "Words only, only to talk.", body: "When you talk, your words leave so it can answer. Nothing else does." },
  { title: "Gone in one tap.", body: "Delete everything, any time, from Settings." },
];

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
  linkedin: "https://www.linkedin.com/company/neuroditto-ai/",
};
