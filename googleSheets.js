import { google } from "googleapis";

// SETUP (one-time):
// 1. Google Cloud Console -> new project -> enable "Google Sheets API"
// 2. Create Service Account -> download JSON key -> save as service-account.json in project root
//    (add "service-account.json" to .gitignore — never commit it)
// 3. Open your Google Sheet -> Share -> add the service account email
//    (looks like xxxx@xxxx.iam.gserviceaccount.com) as Editor
// 4. Put the Sheet ID (from the sheet's URL between /d/ and /edit) in .env.local as GOOGLE_SHEET_ID

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_RANGE = "Students!A:I";

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "./service-account.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

export async function syncStudentToSheet(student) {
  try {
    const sheets = await getSheetsClient();
    const row = [
      student.atomicId,
      student.name,
      student.email,
      student.phone || "",
      student.batch || "No Batch",
      student.subscription?.plan || "free",
      student.subscription?.isActive ? "Active" : "Inactive",
      student.subscription?.expiresAt ? new Date(student.subscription.expiresAt).toISOString() : "",
      new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } catch (err) {
    // sheet sync failing should never break registration for the user
    console.error("Google Sheets sync failed:", err.message);
  }
}
