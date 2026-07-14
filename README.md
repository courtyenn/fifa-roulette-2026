# FIFA World Cup Roulette Betting Form

A roulette-style betting board where players drag chips onto bet zones and submit.
Each submission is appended as a row to a Google Sheet, so many players can fill
it out at once. Hosted on Vercel: the form is a static page and a serverless
function (`/api/submit`) forwards submissions to a **Google Apps Script web app**
that writes to the Sheet.

**No Google Cloud Console or service account is required** — the Apps Script is
created from inside the Sheet itself, so you only need edit access to the Sheet.

```
public/index.html    the form (served as the site root)
public/*.jpg,*.png   board images
api/submit.js        serverless function → validates + forwards to Apps Script
apps-script/Code.gs  paste this into the Sheet's Apps Script editor
```

## How a submission flows

1. Player places chips and clicks **Submit**.
2. The browser POSTs `{ name, bets }` to `/api/submit` on Vercel.
3. The function validates it and forwards it (server-to-server, no CORS) to your
   Apps Script URL.
4. The Apps Script appends one row to the Sheet, then the board resets for the
   next player.

Sheet columns: `Timestamp | Name | Total Chips | Bets Summary | Raw JSON`.

---

## One-time setup

### 1. Create the Google Sheet
- Create a new Google Sheet you can edit.
- First tab should be named **Sheet1** (or the script falls back to the first
  tab). Optionally add a header row:
  `Timestamp | Name | Total Chips | Bets Summary | Raw JSON`.

### 2. Add the Apps Script web app
1. In the Sheet: **Extensions → Apps Script**.
2. Delete the starter code, paste the contents of [`apps-script/Code.gs`](apps-script/Code.gs), **Save**.
3. **Deploy → New deployment → Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Approve the authorization prompt on first deploy.
5. Copy the **Web app URL** (ends in `/exec`). That's your `APPS_SCRIPT_URL`.

> If you later change `Code.gs`, use **Deploy → Manage deployments → Edit → new
> version**, or the `/exec` URL keeps running the old code.

### 3. Configure the environment variable
Set this in **Vercel → Project → Settings → Environment Variables** (and in
`.env.local` for local testing — see `.env.example`):

| Variable | Value |
| --- | --- |
| `APPS_SCRIPT_URL` | the `/exec` web app URL from step 2 |

---

## Deploy to Vercel

```bash
npm i -g vercel     # if you don't have the CLI
vercel              # first run links/creates the project
vercel --prod       # deploy to production
```

Or connect the Git repo at <https://vercel.com/new>. Add `APPS_SCRIPT_URL` before
the first real submission. No build step and no `vercel.json` needed — Vercel
serves `public/` as the site and treats `api/*.js` as a serverless function.

## Run locally

```bash
cp .env.example .env.local   # paste your APPS_SCRIPT_URL
vercel dev                   # serves the form + /api/submit at localhost:3000
```

## Troubleshooting

- **`server_not_configured` (500):** `APPS_SCRIPT_URL` isn't set.
- **`record_failed` (502):** the Apps Script rejected the request — re-check the
  `/exec` URL, that the deployment's access is **Anyone**, and that you deployed
  a new version after editing `Code.gs`.
- **Rows not appended:** confirm the target tab is named `Sheet1` (or edit the
  fallback in `Code.gs`).

## Don't want Vercel at all?

You can skip the server entirely and POST directly from the browser to the Apps
Script URL — but Apps Script doesn't return CORS headers, so you'd have to use
`fetch(url, { method: "POST", mode: "no-cors", ... })`, which makes the response
unreadable (no success/error confirmation, and the board can't reliably reset).
The Vercel proxy exists to avoid exactly that.
