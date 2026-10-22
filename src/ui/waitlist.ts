// The waitlist form. It only ever says you are on the list when the request really succeeded.
//
// TODO(waitlist): there is no endpoint yet. Set VITE_WAITLIST_URL (see .env.example) to a URL that accepts
// a JSON POST of { email }, for example a Formspree form. Until then the form says the list is not open.

const ENDPOINT = (import.meta.env.VITE_WAITLIST_URL ?? "").trim();
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Kind = "info" | "error" | "ok";

export function setupWaitlist(): void {
  const form = document.getElementById("waitlist") as HTMLFormElement | null;
  const input = document.getElementById("waitlist-email") as HTMLInputElement | null;
  const button = document.getElementById("waitlist-submit") as HTMLButtonElement | null;
  const status = document.getElementById("waitlist-status");
  if (!form || !input || !button || !status) return;

  const say = (text: string, kind: Kind) => {
    status.textContent = text;
    status.dataset.kind = kind;
  };
  const invalid = (text: string) => {
    input.setAttribute("aria-invalid", "true");
    say(text, "error");
    input.focus();
  };

  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    if (status.dataset.kind === "error") say("", "info");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = input.value.trim();
    if (!email) return invalid("Add your email first.");
    if (!LOOKS_LIKE_EMAIL.test(email)) return invalid("That doesn’t look like an email address.");
    input.removeAttribute("aria-invalid");

    if (!ENDPOINT) {
      say("The list isn’t open yet. Nothing was sent, and your email wasn’t saved.", "info");
      return;
    }

    button.disabled = true;
    say("Sending…", "info");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Waitlist answered ${res.status}`);
      say("You’re on the list.", "ok");
      form.reset();
    } catch {
      say("That didn’t go through, so you’re not on the list yet. Try again in a moment.", "error");
    } finally {
      button.disabled = false;
    }
  });
}
