/**
 * Gemini licensing inquiries: Google Sheet backend.
 * Lives inside a Google Sheet (Extensions > Apps Script). See SETUP.md.
 *
 * GET  -> {"held":["2027-01-06T10:30", ...]}   slots the site should show as taken
 * POST -> saves an inquiry as a new row; refuses a meeting slot that is already held
 *
 * A slot is blocked while its row's "Meeting status" is Held or Confirmed.
 * Change it to Cancelled in the sheet and the slot opens up again on the site.
 */

const NOTIFY_EMAIL = "info@licensegemini.com"; // where new-inquiry alerts go; "" to turn off
const SHEET_NAME = "Inquiries";

// Keep these in step with CONFIG in index.html.
const DAYS = ["2027-01-06", "2027-01-07", "2027-01-08"];
const FIRST_SLOT = "10:00", LAST_SLOT = "16:30", SLOT_MINUTES = 30;

// [field sent by the site, column heading]
const COLUMNS = [
  ["_received", "Received"],
  ["reference", "Reference"],
  ["_review", "Review status"],
  ["_meeting_status", "Meeting status"],
  ["meeting_slot", "Meeting slot"],
  ["meeting_label", "Meeting time (Las Vegas)"],
  ["attendees", "Attendees"],
  ["company", "Company"],
  ["website", "Website"],
  ["hq_country", "HQ country"],
  ["company_type", "Company type"],
  ["annual_revenue", "Annual revenue"],
  ["years_in_business", "Years in business"],
  ["regions", "Regions"],
  ["countries", "Specific countries"],
  ["exclusivity", "Rights sought"],
  ["categories", "Category rights sought"],
  ["products", "Products"],
  ["channels", "Sales channels"],
  ["first_3_years_revenue", "First 3 years revenue"],
  ["target_launch", "Target launch"],
  ["licensing_experience", "Brands today"],
  ["name", "Name"],
  ["job_title", "Job title"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["notes", "Notes"]
];
const COL = {};
COLUMNS.forEach(function (c, i) { COL[c[0]] = i + 1; });

/** Run once from the Apps Script editor to create and format the sheet. */
function setup() {
  const sheet = getSheet_();
  SpreadsheetApp.getActiveSpreadsheet().toast("Inquiries sheet is ready.");
  return sheet.getName();
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map(function (c) { return c[1]; })]).setFontWeight("bold");
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(4);
    const rows = sheet.getMaxRows() - 1;
    // Plain text so slot ids and phone numbers are never reinterpreted as dates or formulas.
    sheet.getRange(2, 1, rows, COLUMNS.length).setNumberFormat("@");
    sheet.getRange(2, COL._review, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(["New", "Approved", "Declined"], true).build());
    sheet.getRange(2, COL._meeting_status, rows, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(["Held", "Confirmed", "Cancelled", "No meeting"], true).build());
  }
  return sheet;
}

function validSlots_() {
  const toMin = function (t) { const p = t.split(":"); return Number(p[0]) * 60 + Number(p[1]); };
  const pad = function (n) { return (n < 10 ? "0" : "") + n; };
  const out = {};
  DAYS.forEach(function (d) {
    for (let m = toMin(FIRST_SLOT); m <= toMin(LAST_SLOT); m += SLOT_MINUTES) {
      out[d + "T" + pad(Math.floor(m / 60)) + ":" + pad(m % 60)] = true;
    }
  });
  return out;
}

function heldSlots_(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const status = sheet.getRange(2, COL._meeting_status, last - 1, 1).getDisplayValues();
  const slots = sheet.getRange(2, COL.meeting_slot, last - 1, 1).getDisplayValues();
  const held = {};
  for (let i = 0; i < slots.length; i++) {
    const slot = String(slots[i][0]).trim();
    const st = String(status[i][0]).trim().toLowerCase();
    if (slot && (st === "held" || st === "confirmed")) held[slot] = true;
  }
  return Object.keys(held);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v) {
  if (Array.isArray(v)) v = v.join(", ");
  v = String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 2000);
  // Stop a value being read as a spreadsheet formula.
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

function doGet() {
  return json_({ held: heldSlots_(getSheet_()) });
}

function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad_request" }); }
  if (!data || typeof data !== "object") return json_({ ok: false, error: "bad_request" });

  const email = String(data.email || "").trim();
  if (!String(data.company || "").trim() || !String(data.name || "").trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json_({ ok: false, error: "missing_fields" });
  }

  let slot = String(data.meeting_slot || "").trim();
  if (slot && !validSlots_()[slot]) return json_({ ok: false, error: "bad_slot" });

  // One submission at a time, so two people cannot take the same slot.
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return json_({ ok: false, error: "busy" }); }
  try {
    const sheet = getSheet_();
    if (slot) {
      const held = heldSlots_(sheet);
      if (held.indexOf(slot) !== -1) return json_({ ok: false, error: "slot_taken", held: held });
    }
    const row = COLUMNS.map(function (c) {
      switch (c[0]) {
        case "_received": return Utilities.formatDate(new Date(), "America/Los_Angeles", "yyyy-MM-dd HH:mm") + " PT";
        case "_review": return "New";
        case "_meeting_status": return slot ? "Held" : "No meeting";
        case "meeting_slot": return slot;
        case "meeting_label": return slot ? clean_(data.meeting_label) : "";
        case "attendees": return slot ? clean_(data.attendees) : "";
        default: return clean_(data[c[0]]);
      }
    });
    const r = sheet.getLastRow() + 1;
    sheet.getRange(r, 1, 1, row.length).setNumberFormat("@").setValues([row]);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  if (NOTIFY_EMAIL) {
    try {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        replyTo: email,
        subject: "New Gemini licensing inquiry: " + clean_(data.company) + (slot ? " (meeting held)" : ""),
        body: [
          "Reference: " + clean_(data.reference),
          "Company: " + clean_(data.company) + " (" + clean_(data.hq_country) + ", " + clean_(data.company_type) + ")",
          "Contact: " + clean_(data.name) + ", " + clean_(data.job_title) + ", " + email + " " + clean_(data.phone),
          "Territory: " + clean_(data.regions) + " | " + clean_(data.exclusivity),
          "Categories: " + clean_(data.categories),
          "First 3 years revenue: " + clean_(data.first_3_years_revenue),
          "Meeting: " + (slot ? clean_(data.meeting_label) + " (HELD, awaiting your review)" : "none requested"),
          "",
          "Review it in the sheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
        ].join("\n")
      });
    } catch (err) { /* the row is saved; a failed alert must not fail the submission */ }
  }
  return json_({ ok: true });
}
