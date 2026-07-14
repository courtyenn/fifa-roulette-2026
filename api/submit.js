const { google } = require("googleapis");

// Human-readable names for each bet group used on the board.
const GROUP_LABELS = {
  ftts: "First Team to Score",
  special: "Match Ends In",
  matrix: "Time of First Goal",
  goals: "Total Official Goals",
  winner: "2026 FIFA World Cup Champion",
};

function formatBets(bets) {
  return bets
    .map((b) => {
      const label = GROUP_LABELS[b.group] || b.group;
      return `${label}: ${b.value} (x${b.chips})`;
    })
    .join("; ");
}

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Vercel stores the multi-line private key with literal "\n"; restore real newlines.
  const key = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!email || !key || !process.env.GOOGLE_SHEET_ID) {
    throw new Error("missing_google_env");
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    // Vercel parses JSON bodies automatically, but guard for string bodies too.
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const name = (body.name || "").toString().trim();
    const bets = Array.isArray(body.bets) ? body.bets : [];

    if (!name) return res.status(400).json({ error: "name_required" });
    if (bets.length === 0)
      return res.status(400).json({ error: "no_bets" });

    const totalChips = bets.reduce(
      (sum, b) => sum + (Number(b.chips) || 0),
      0,
    );

    const timestamp = new Date().toISOString();

    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "Sheet1!A:E",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            timestamp,
            name,
            totalChips,
            formatBets(bets),
            JSON.stringify(bets),
          ],
        ],
      },
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("submit error:", err);
    if (err && err.message === "missing_google_env") {
      return res.status(500).json({ error: "server_not_configured" });
    }
    return res.status(500).json({ error: "record_failed" });
  }
};
