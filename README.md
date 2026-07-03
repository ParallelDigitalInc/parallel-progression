# Parallel Progression — Tripod page (4a) + actionable-progress explorations

Option **4a** from the **Progression Explorations** Claude Design project, extended
with three layout explorations that answer the "lots of data, no sense of progress
or what to do next" feedback. Progress is framed as **gap to the desired role**.
Switch layouts with the pill at bottom left:

- **A · Tripod** — 4a with a gap strip ("Toward {desired role}" + nine-segment bar),
  rating dots on legs/head, and a "Focus next" queue that jumps into the comparison cards.
- **B · Spider** — the spider web drawn on the face of the tripod's head card (per
  Shreya's sketch): dashed ring = desired-role bar, head competencies as a slot rail on
  the card's edge, legs carry rating rings. Web dots and rail click through to the panel.
- **C · Plan** — the comparison table as the page: all nine competencies ordered by
  gap (core three first), numbered focus items, per-row Rate/Edit actions.

## Run

```
node serve.js        # http://localhost:4181
```

(or open via the Claude Code launch config `progression`.)

## Supabase setup (Google login + stored self-evals)

Without configuration the app runs in **demo mode**: the Google button fakes a
local session (as shreya@parallelhq.com) and data stays in localStorage. To make
it real:

1. **Create a project** at supabase.com → New project.
2. **Schema**: Dashboard → SQL Editor → paste and run [`schema.sql`](schema.sql).
   (Superadmin emails live in the `is_admin()` function there — keep in sync with
   `SUPERADMINS` in `app.js`.)
3. **Google provider**: in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   create an OAuth 2.0 Client ID (Web application):
   - Authorized JavaScript origins: `http://localhost:4181`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   Then Supabase Dashboard → Authentication → Providers → Google → enable, paste
   Client ID + Secret.
4. **Redirect URLs**: Supabase → Authentication → URL Configuration →
   Site URL `http://localhost:4181`, and add it to Redirect URLs.
5. **Keys**: Supabase → Project Settings → API → copy Project URL and anon public
   key into [`config.js`](config.js).

**Roster** (auto-set each person's role on login): run [`roster.sql`](roster.sql)
in the SQL Editor. It creates a `roster` table (email → role) and seeds the team.
On login the app looks up the signed-in email and sets their current role (and
track) automatically — no manual role-picking. Muzammil (Visual Designer) is
intentionally excluded (no Visual track yet). Anyone with a parallelhq.com account
can still sign in; the roster just personalises role for those listed. Update roles
by re-running the upsert or editing the row.

Login flow: Landing → Continue with Google → onboarding (first run) →
self-assessment → tripod page. Ratings upsert to `self_evaluations` per answer
(resumable); role/desired-role changes update `users`. shreya@parallelhq.com
gets an **Admin** button showing every user's ratings in a table (RLS lets
admins read all rows; everyone else reads only their own).

## What's here

- **Tripod view** — interactive tapered hue legs (hover = halo, click = focuses and
  scroll-reveals that competency's card), head card with the five head competencies,
  base label, "What does this tripod mean?" explainer modal, current-vs-desired role
  pickers, flat card list with always-visible bold summaries and bullets on expand.
- **Table view** — Comparison (current vs desired) and Full ladder (all 7 evaluated
  roles, sticky competency column, current/desired columns highlighted).
- **Self-assessment** — modal stepper over the nine tripod competencies,
  Building / Established / Leading, hover "Leading" to preview next-role behaviours.
  Ratings persist in `localStorage` (`parallel-progression-ratings-v1`) and surface
  as tags on the competency cards.

## Files

- `index.html`, `styles.css`, `app.js` — the app (no build step, no dependencies)
- `data/rubric_data.json` — rubric content, source of truth (from the handoff)
- `assets/parallel-logo.svg`
- `serve.js` — tiny static server on port 4181

## Not in scope (other explorations / later steps)

- Landing (5a/5b) and post-login home (5c/5d)
- Supabase (Google OAuth, roles from roster, stored self-evals with RLS)
- Results view after "Done" and gap-to-desired summary
- Lead+ track tripod (legs: Product Sense · Influence · Systems Thinking)
