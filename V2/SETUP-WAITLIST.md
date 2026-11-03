# Waitlist setup (Supabase + Vercel)

The waitlist form posts to one server route, `/api/waitlist`, which saves the address in a Supabase table. Every page of the site stays prerendered; only this route runs on the server.

What is stored: the email address and the time it was added. Nothing else: no name, no IP address, no browser details.

Until you finish step 5, the form says "The list isn't open yet. Nothing was sent." and sends nothing.

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Pick the region you want the data kept in. Write it down: it goes on the privacy page as `[REGION]` (step 7).
3. Wait until the project finishes setting up.

## 2. Create the table

1. In the project, open **SQL Editor** and choose **New query**.
2. Paste this and press **Run**:

```sql
-- One row per address. The email is the key, so an address can only be on the list once.
create table public.waitlist (
  email      text        primary key check (char_length(email) between 3 and 254),
  created_at timestamptz not null default now()
);

-- Lock the table. With row level security on and no policies, the public key can neither
-- read nor write it. Only the site's server route, using the secret key, can add rows.
alter table public.waitlist enable row level security;
revoke all on table public.waitlist from anon, authenticated;
```

3. Open **Table Editor**. You should see `waitlist` with two columns, `email` and `created_at`, and a lock icon showing row level security is on.

## 3. Copy the two values the server needs

1. **Project URL**: open **Project Settings**, then **Data API**. Copy the URL. It looks like `https://abcdefghijkl.supabase.co`.
2. **Secret key**: open **Project Settings**, then **API Keys**.
   - Under **Secret keys**, create one (name it `website-waitlist`) and copy it. It starts with `sb_secret_`.
   - If your project only shows legacy keys, copy the `service_role` key instead.
   - Never use the `anon` or `publishable` key here, and never put the secret key in a variable that starts with `PUBLIC_`.

## 4. Who can see the list

The privacy page says only the two founders can see the list. To keep that true:

1. Open **Organization settings**, then **Team**.
2. Make sure the only members are Jyothi and Krishna. Remove anyone else.

## 5. Add the keys to Vercel

In the Vercel project (its **Root Directory** must be `V2`), open **Settings**, then **Environment Variables**, and add these three. Tick **Production** and **Preview**, and mark the two Supabase values **Sensitive**.

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | the Project URL from step 3 |
| `SUPABASE_SECRET_KEY` | the secret key from step 3 |
| `PUBLIC_WAITLIST_URL` | `/api/waitlist` |

Then open **Deployments** and **Redeploy** the latest deployment. This is needed because `PUBLIC_WAITLIST_URL` is read when the site is built.

## 6. Check it works

1. Open the deployed site, go to the waitlist at the bottom and enter your own address.
2. The page should say "You're on the list. We'll be in touch."
3. In Supabase, **Table Editor**, then `waitlist`: your address is there with the time.
4. Enter the same address again. It still says you're on the list, and the table still has one row for it.

If the page says "That didn't go through", open Vercel, then **Logs**, and look at the `/api/waitlist` request:
- `503`: the server cannot see `SUPABASE_URL` or `SUPABASE_SECRET_KEY`. Check the names and redeploy.
- `502`: Supabase refused the save. Check the key is the secret (or service_role) key, and that the table is named `waitlist`.

## 7. Fill in the privacy page

In `V2/src/pages/privacy.astro`, replace:
- `[REGION]` with the region from step 1 (for example "Frankfurt, Germany").
- `[CONTACT EMAIL]` with the address people should write to be removed.

## Running it on your own computer

1. In `V2`, create a file named `.env` (it is already in `.gitignore`, so it is never committed):

```
SUPABASE_URL=https://abcdefghijkl.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
PUBLIC_WAITLIST_URL=/api/waitlist
```

2. Run `npm run dev` and open http://localhost:4321.

## Day-to-day

- **Remove someone** who asks: in **SQL Editor** run
  `delete from public.waitlist where email = 'their@address.com';`
  Addresses are stored in lower case.
- **Export the list**: **Table Editor**, `waitlist`, then **Export** to CSV.
- **If a key leaks**: in **API Keys**, delete that secret key, create a new one, update `SUPABASE_SECRET_KEY` in Vercel and redeploy.

## How the route protects the list

- Only accepts `POST` from this site's own pages.
- A hidden field that people never see: if a bot fills it in, nothing is saved.
- At most 5 attempts per visitor address every 10 minutes. This count lives in the server's memory only and is never stored. It resets when the function restarts, so treat it as a speed bump, not a wall.
- Addresses are trimmed, lower-cased and checked before saving. A repeat address is ignored, not duplicated.
- No CAPTCHA.
