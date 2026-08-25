# GUB Campus Connect — Student Portal & Campus Services

A student portal for **Green University of Bangladesh** built for the **Integrated System Design Lab** course.
It integrates three campus services behind a student account system, with four **real-time** features layered on top:

| Module | What it does |
|---|---|
| 👤 **Accounts** | Sign up, verify by one-time passcode, then land on a personal dashboard; log in each visit to apply to clubs or register for events |
| 🚌 **Transportation** | 8 real GUB shuttle routes with stop-by-stop maps, the daily trip schedule (filterable by route), and official transport notices |
| 🎭 **Clubs** | All 16 registered GUB clubs, their activities, and membership applications during recruitment |
| 🎪 **Events** | Campus event listings with live seat counters, live countdown timers, and online registration |

**Real-time features:**
1. **OTP-verified sign-up → dashboard** — a 6-digit code gates account creation; verifying it logs you in and lands you on `dashboard.html` (your applications + registrations in one place).
2. **Cross-tab live sync** — open any page in two tabs; a change in one (new event, a registration, a delete) appears in the other within about a second, with no reload.
3. **Live countdown timers** — every event card counts down to its start time, re-computed every second.
4. **Real-time notification banners** — publishing a notice, club activity, club, or event pops a "New: ..." banner on every *other* open tab.

**Tech:** HTML5 · CSS3 · vanilla JavaScript (ES5-compatible) · browser `localStorage` as the data store (accounts) · `sessionStorage` for the active login · `BroadcastChannel` for cross-tab live sync — all still 100% static, no backend, no build step.

**Where the content comes from:** route waypoints, pickup points, club names and campus venue names are sourced from Green University of Bangladesh's own published materials (green.edu.bd, its transport notices, and its club directory). Member counts, recruitment status, and specific activity/event dates are illustrative placeholders for this CRUD prototype, not scraped facts — GUB's exact day-to-day timetable lives in a Google Drive PDF that isn't machine-readable, so exact bus times beyond one documented route are reasonable estimates, not confirmed figures. Double-check anything date- or time-sensitive against green.edu.bd before relying on it.

---

## Project structure

```
gub-campus-connect/
├── index.html          # Home dashboard (live stats + previews)
├── transport.html      # Routes, schedule, notices
├── clubs.html          # Clubs, activities, applications
├── events.html         # Events + registrations
├── dashboard.html       # Personal account dashboard (post-login/OTP)
├── css/
│   └── style.css       # Design system & all styles
├── js/
│   ├── data.js         # Seed records + localStorage helpers + cross-tab BroadcastChannel sync
│   ├── main.js         # Shared UI: manage mode, toasts (incl. live banner), modals, formatting
│   ├── email-config.js # OPTIONAL: paste EmailJS keys here to send real OTP emails
│   ├── auth.js         # Sign up → OTP verify → dashboard, log in / log out, requireLogin() gate
│   ├── dashboard.js     # Renders the logged-in account's applications & registrations
│   ├── home.js         # Home dashboard logic
│   ├── transport.js    # Transport CRUD
│   ├── clubs.js        # Clubs CRUD
│   └── events.js       # Events CRUD + live countdown timers
├── vercel.json         # Vercel static config
└── README.md
```

## Run locally

No installation needed — just open `index.html` in any modern browser.
For a proper local server (recommended):

```bash
# from the project folder — pick either one
npx serve .
# or
python -m http.server 8080
```

Then visit `http://localhost:8080` (or the URL `serve` prints).

## Using the demo

1. **Sign up** (top-right of any page) with a name, email, 9-digit student ID, an 11-digit BD mobile number, and a password.
2. **Verify with the OTP code.** Since this prototype has no email server, the 6-digit code is shown right in the "Verify your email" modal, clearly labelled as demo mode, with a live 5-minute countdown and a Resend option. Enter it correctly and your account is created and you're logged straight in — or just log in with the built-in demo account: **demo@student.green.edu.bd / demo1234**.
3. You're taken to **My Dashboard**, showing your account details and (as you use the site) your club applications and event registrations, with Withdraw/Cancel actions right there.
4. Browsing routes, the schedule, notices, club listings and event listings never requires an account. Clicking **Apply to join** or **Register** does — if you're not logged in, it opens the login form first (with a link to sign up if you don't have an account yet) and continues automatically once you're in, all the way through OTP if that's the path you took.
5. Once logged in, the Apply/Register forms pre-fill your name, student ID and email from your account and lock those fields, so you can't submit as someone else.
6. Logging in starts a **session** (via `sessionStorage`), not a permanent login — closing the tab or browser ends it, so you'll log in again next visit, while your account itself is remembered permanently (via `localStorage`).
7. All data — accounts, routes, clubs, events, applications, registrations — is saved to your browser's `localStorage`, so it **survives page refreshes**. Use **Reset demo data** in the footer to restore the original seed records (including the demo account) at any time.

### Testing the real-time features

- **OTP flow:** sign up, deliberately enter a wrong 6-digit code (rejected, attempts counter), let the countdown reach 0 (code marked expired), tap **Resend code** (new code, timer resets), then enter the correct one (account created, redirected to `dashboard.html`).
- **Cross-tab sync:** open `events.html` in two browser tabs side by side. Register for an event in Tab A; watch the seat bar in Tab B update within about a second, with no refresh. Same test works on `transport.html` (add/delete a trip) and `clubs.html` (add/delete an activity).
- **Live countdown:** open `events.html` and watch any event's "Starts in ..." line — leave it open and the numbers change on their own (by the minute when it's days away, by the second once under an hour).
- **Notification banner:** with two tabs open, use Manage mode in Tab A to publish a new notice, club, activity, or event; Tab B shows a distinct dark "live" toast with a pulsing dot — different from the normal green/red confirmation toasts, and only ever appears on tabs that *didn't* make the change.

### Sending a real OTP email (built in — just add 3 values)

Real email delivery is already wired in; it just needs credentials from a free [EmailJS](https://www.emailjs.com) account (200 emails/month free — it sends straight from client-side JS, no backend needed):

1. Sign up at emailjs.com, then go to **Email Services → Add New Service**, connect your Gmail (or other) account, and copy the **Service ID**.
2. Go to **Email Templates → Create New Template**. In the template:
   - Set the **To Email** field (under the template's Settings/To field) to `{{to_email}}`
   - Subject: e.g. `Your GUB Campus Connect verification code`
   - Body: e.g. `Hi {{to_name}}, your one-time code is {{code}}. It expires in 5 minutes.`
   - Save and copy the **Template ID**.
3. Go to **Account → General** and copy your **Public Key**.
4. Open `js/email-config.js` and paste the three values into `publicKey`, `serviceId`, `templateId`.
5. Redeploy. Sign-ups now email the code for real, the on-screen code box stays hidden, and the modal says "check your inbox."

If the values are left empty, the app stays in demo mode (code shown on screen). If sending ever **fails** at runtime — wrong values, quota used up, network trouble — the app automatically falls back to showing the code on screen with an explanatory message, so nobody ever gets stuck mid-sign-up. Note: an EmailJS public key is designed to ship in client-side code, but that means anyone can read it in your page source and could send emails against your quota — acceptable for a lab project, but say so in your report; a production system would send OTP from a server.

### Letting a club collect applications through a Google Form

Any club can use its own **Google Form** instead of the portal's built-in application form:

1. Create the form at [forms.google.com](https://forms.google.com) with whatever the club wants to ask (Name, Student ID, Department, Email, why you want to join…). Responses collect automatically in the linked Google Sheet.
2. Click **Send → link icon (🔗)**, **uncheck "Shorten URL"**, and copy the long `https://docs.google.com/forms/d/e/…/viewform` link.
3. Give the club that link, either way:
   - **Manage mode:** the "Register a club" form has an optional **Google Form link** field — paste it there when adding the club.
   - **Existing/seed clubs:** add a `formUrl: "https://docs.google.com/forms/…/viewform"` property to that club in `js/data.js`, then press **Reset demo data** in the footer so the updated seed loads.
4. That club's button changes from "Apply to join" to **"Apply via Google Form"**. Clicking it (still login-gated, same as everything else) opens the form embedded in a modal, with an "Open in a new tab" fallback.

One thing to be clear about in your report: Google-Form applications go to **the club's Google Sheet**, not to this portal's applications table — the two application paths store data in different places, which is a realistic integration pattern worth a sentence in the System Implementation chapter.

### Manage mode is hidden from visitors by default

The **Manage mode** switch (and every add/delete control it reveals) is invisible on a fresh visit — anyone you send the plain link to only ever sees the read-only student view. To turn it on for yourself:

- Open the site with `?admin=1` added to the URL once, e.g. `https://your-site.vercel.app/index.html?admin=1`
- Manage mode is now unlocked **in that browser** (saved via `localStorage`) and the switch appears on every page from then on, no matter which page you land on first.
- The `?admin=1` is stripped from the address bar immediately, so copying the URL from the bar afterwards never leaks it into a link you share.
- To hide it again on that same browser (e.g. before you screen-record the public view), visit any page with `?admin=0` once.

This is a convenience gate, not real authentication — anyone who reads the JavaScript source or opens DevTools could still find their way to it. It's meant to stop a normal link recipient from ever *seeing* the option, not to withstand a determined attacker. A production version would replace this with a real login for admins.

**Accounts are the same story:** signing up stores the password in plain text in `localStorage`, right alongside everything else. That's normal for a lab prototype and totally fine for made-up demo data, but it is not real security — never sign up with a password you actually use elsewhere.

## Deploy to Vercel

### Option A — GitHub import (recommended)

1. Create a new GitHub repository and push this folder:
   ```bash
   git init
   git add .
   git commit -m "GUB Campus Connect - initial version"
   git branch -M main
   git remote add origin https://github.com/<your-username>/gub-campus-connect.git
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com), sign in with GitHub, and click **Add New → Project**.
3. **Import** the `gub-campus-connect` repository.
4. Framework Preset: **Other** · Build Command: *(leave empty)* · Output Directory: *(leave empty)*.
5. Click **Deploy**. Vercel gives you a live URL like `https://gub-campus-connect.vercel.app`.

Every future `git push` to `main` redeploys automatically.

### Option B — Vercel CLI

```bash
npm install -g vercel
cd gub-campus-connect
vercel          # first deploy (accept the defaults)
vercel --prod   # promote to the production URL
```

## Notes for the lab report

- Deleting a **route** also deletes its **schedule trips**; deleting a **club** removes its **activities** and **applications**; deleting an **event** removes its **registrations** — this mirrors `ON DELETE CASCADE` referential integrity from the ER design.
- Duplicate protection: one **account** per email (sign-up), and the same student ID cannot register twice for one event or apply twice to one club (mirrors `UNIQUE` constraints).
- Accounts, applications and registrations are linked: once logged in, the Apply/Register forms are pre-filled and locked from the account record rather than freely typed, which is worth calling out in the ER analysis as the `USER_ACCOUNT` entity feeding both `CLUB_APPLICATION` and `EVENT_REGISTRATION`.
- The OTP step is a good fit for a **sequence diagram** if your report wants one: Browser → generates code → (simulated) delivery → Browser waits for input → verify → create `USER_ACCOUNT` → start session.
- Cross-tab live sync (`BroadcastChannel`) is worth its own short paragraph in System Implementation: it's what makes the seat counters, tables and banners update without a page reload, and it's the piece that would generalize to real push/WebSocket updates in a server-backed version.
- `localStorage` is a per-browser store used to keep the lab deployment serverless; the ER design in the documentation maps 1:1 to a MySQL/PostgreSQL schema for a future backend — the existing ER diagram and analysis predate the accounts/OTP feature and the real-data refresh, so they'll need a follow-up pass to add `USER_ACCOUNT` and update the entity list before final submission. The Testing chapter will also want new test cases for OTP (wrong code, expiry, resend, correct code) and for the live features (two-tab sync, banner, countdown).
