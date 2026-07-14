// Proxies a validated submission to a Google Apps Script Web App, which appends
// a row to the bound Google Sheet. This avoids needing a Google Cloud service
// account — the Apps Script is created from inside the Sheet itself.
//
// Set APPS_SCRIPT_URL in the environment to your deployed web app URL
// (ends in /exec). See README.md for how to create it.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const url = process.env.APPS_SCRIPT_URL;
  if (!url) {
    return res.status(500).json({ error: "server_not_configured" });
  }

  try {
    const parsed =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    const name = (parsed.name || "").toString().trim();
    const bets = Array.isArray(parsed.bets) ? parsed.bets : [];

    if (!name) return res.status(400).json({ error: "name_required" });
    if (bets.length === 0) return res.status(400).json({ error: "no_bets" });

    // Forward server-to-server (no CORS involved here).
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bets }),
      redirect: "follow",
    });

    const text = await upstream.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_) {
      /* Apps Script returned non-JSON — treat as failure below */
    }

    if (!upstream.ok || !json || json.error) {
      console.error("apps script rejected submission:", upstream.status, text);
      return res.status(502).json({ error: "record_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("submit error:", err);
    return res.status(500).json({ error: "record_failed" });
  }
};
