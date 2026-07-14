// Google Apps Script Web App — paste this into the Sheet's Apps Script editor.
//
// Setup:
//   1. Open your Google Sheet → Extensions → Apps Script.
//   2. Delete any starter code, paste this file's contents, Save.
//   3. Deploy → New deployment → type "Web app".
//        - Execute as: Me
//        - Who has access: Anyone
//      Copy the Web app URL (ends in /exec) — that is your APPS_SCRIPT_URL.
//   4. First deploy asks you to authorize; approve it.
//
// It appends one row per submission: Timestamp | Name | Total Chips | Summary | Raw JSON.

var GROUP_LABELS = {
  ftts: "First Team to Score",
  special: "Match Ends In",
  matrix: "Time of First Goal",
  goals: "Total Official Goals",
  winner: "2026 FIFA World Cup Champion",
};

function doPost(e) {
  // Serialize concurrent submissions so appended rows never collide.
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data = JSON.parse(e.postData.contents);
    var name = (data.name || "").toString().trim();
    var bets = Array.isArray(data.bets) ? data.bets : [];

    if (!name || bets.length === 0) {
      return json({ error: "invalid_submission" });
    }

    var totalChips = 0;
    var summary = bets
      .map(function (b) {
        totalChips += Number(b.chips) || 0;
        var label = GROUP_LABELS[b.group] || b.group;
        return label + ": " + b.value + " (x" + b.chips + ")";
      })
      .join("; ");

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];
    sheet.appendRow([
      new Date(),
      name,
      totalChips,
      summary,
      JSON.stringify(bets),
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
