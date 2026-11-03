// POST /api/waitlist: the one server route. Everything else on the site is prerendered.
//
// Stores the email address (and, through the table default, the sign-up time) in Supabase. Nothing else
// is stored: no IP address, no user agent, no name.
//   200 { ok: true }            saved, or already on the list (the address is on the list either way)
//   400 { error: "invalid" }    not a usable email address, or the hidden spam field was filled
//   403 { error: "origin" }     request did not come from this site
//   429 { error: "slow-down" }  too many attempts from one address in a short time
//   503 { error: "closed" }     Supabase keys are not set on the server
//   502 { error: "storage" }    Supabase did not confirm the save
// The page shows "You're on the list" only for a 200.
//
// Keys are read from server-side environment variables only (never PUBLIC_*, never committed):
//   SUPABASE_URL           e.g. https://abcd1234.supabase.co
//   SUPABASE_SECRET_KEY    the project's secret key (sb_secret_…) or legacy service_role key
// See SETUP-WAITLIST.md.
import type { APIRoute } from "astro";

export const prerender = false;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Simple rate limit: at most 5 attempts per client address per 10 minutes, per server instance.
// Kept in memory only (never stored), so it resets when the function cold-starts.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, number[]>();
function limited(key: string, now = Date.now()) {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 5000) {
    for (const [k, times] of attempts) if (times.every((t) => now - t >= WINDOW_MS)) attempts.delete(k);
  }
  return recent.length > MAX_ATTEMPTS;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Same-site requests only.
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return json(403, { error: "origin" });

  let ip = "unknown";
  try { ip = clientAddress || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; } catch {}
  if (limited(ip)) return json(429, { error: "slow-down" });

  let body: { email?: unknown; company?: unknown };
  try { body = await request.json(); } catch { return json(400, { error: "invalid" }); }

  // Hidden field people never see. If it has anything in it, nothing is stored.
  if (typeof body.company === "string" && body.company.trim() !== "") return json(400, { error: "invalid" });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) return json(400, { error: "invalid" });

  const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = import.meta.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return json(503, { error: "closed" });

  try {
    // Insert; a repeat address is ignored by the unique key (ON CONFLICT DO NOTHING).
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/waitlist?on_conflict=email`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return json(502, { error: "storage" });
    return json(200, { ok: true });
  } catch {
    return json(502, { error: "storage" });
  }
};

// Anything other than POST.
export const ALL: APIRoute = () => json(405, { error: "method" });
