// The one place the visitor answers the mirror: Drift, Signal or Not sure yet. The answer is shown in words
// here and handed to the 3D world through body[data-answer], which lights the guessed pattern up or down.

const REPLIES: Record<string, string> = {
  signal: "Noted as a signal. The lunch-and-learn will test it. If the guess was wrong, the mirror’s record drops, not yours.",
  drift: "Noted as drift. It will weigh this pattern less. If that turns out wrong, the mirror’s record drops, not yours.",
  unsure: "Noted: not sure yet. It will keep watching before it says more.",
};

export function setupVerdicts(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".verdict"));
  const status = document.getElementById("verdict-status");
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const chosen = button.getAttribute("aria-pressed") === "true" ? "" : button.dataset.verdict ?? "";
      for (const other of buttons) other.setAttribute("aria-pressed", String(other.dataset.verdict === chosen && chosen !== ""));
      if (chosen) document.body.dataset.answer = chosen;
      else delete document.body.dataset.answer;
      if (status) {
        status.textContent = REPLIES[chosen] ?? "Try it: your answer tests the mirror, not you.";
        status.dataset.kind = chosen ? "answered" : "";
      }
      window.dispatchEvent(new CustomEvent("nd:verdict"));
    });
  }
}
