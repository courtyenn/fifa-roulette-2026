# FIFA World Cup Roulette Betting Form

A roulette-style betting board where players drag chips onto bet zones and submit.
Each submission is appended as a row to a Google Sheet, so many players can fill
it out at once. Hosted on Vercel: the form is a static page and the recording is
done by a serverless function (`/api/submit`).

```
public/index.html   the form (served as the site root)
public/*.jpg,*.png  board images
api/submit.js        serverless function → appends a row to the Google Sheet
```

## How a submission flows

1. Player places chips and clicks **Submit**.
2. The browser POSTs `{ name, bets }` as JSON to `/api/submit`.
3. The function authenticates as a Google **service account** and appends one row
   to the sheet, then the board resets for the next player.

Sheet columns: `Timestamp | Name | Total Chips | Bets Summary | Raw JSON`.

---

## One-time setup

### 1. Create the Google Sheet
- Create a new Google Sheet.
- In the first tab (named **Sheet1**), optionally add a header row:
  `Timestamp | Name | Total Chips | Bets Summary | Raw JSON`.
- Copy its ID from the URL: `docs.google.com/spreadsheets/d/`**`<SHEET_ID>`**`/edit`.

### 2. Create a Google service account
1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → Library →** enable the **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
4. Once created, open it → **Keys → Add key → Create new key → JSON.** A JSON
   file downloads. You need two values from it: `client_email` and `private_key`.

### 3. Share the sheet with the service account
- In the Sheet, click **Share** and add the service account's `client_email`
  (e.g. `roulette-writer@my-project.iam.gserviceaccount.com`) as an **Editor**.
  Without this the function gets a 403.

### 4. Configure environment variables
Set these three in **Vercel → Project → Settings → Environment Variables**
(and in `.env.local` for local testing — see `.env.example`):

| Variable | Value |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the `client_email` from the JSON |
| `GOOGLE_PRIVATE_KEY` | the `private_key` from the JSON, in double quotes, with `\n` kept literal |
| `GOOGLE_SHEET_ID` | the sheet ID from step 1 |

> Tip: the private key in the JSON already contains `\n` escape sequences. Paste
> it verbatim (including the `-----BEGIN/END PRIVATE KEY-----` lines) wrapped in
> double quotes. The function calls `.replace(/\\n/g, "\n")` to restore newlines.

---

## Deploy to Vercel

```bash
npm install            # installs googleapis
npm i -g vercel        # if you don't have the CLI
vercel                 # first run links/creates the project
vercel --prod          # deploy to production
```

You can also connect the Git repo at <https://vercel.com/new> and let Vercel
deploy on push. Either way, add the three environment variables before the first
real submission. No `vercel.json` is needed — Vercel serves `public/` as the site
and treats `api/*.js` as serverless functions automatically.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the three values
vercel dev                   # serves the form + /api/submit at localhost:3000
```

## Troubleshooting

- **`server_not_configured` (500):** one of the three env vars is missing.
- **403 from Google / `record_failed`:** the sheet isn't shared with the service
  account email, or the Sheets API isn't enabled on the project.
- **Rows not appended but 200 OK:** confirm the first tab is named `Sheet1`, or
  change the `range` in `api/submit.js` to match your tab name.
