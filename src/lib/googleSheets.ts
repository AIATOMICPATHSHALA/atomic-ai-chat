import { google } from "googleapis";

// SETUP (one-time):
// 1. Google Cloud Console -> new project -> enable "Google Sheets API"
// 2. IAM & Admin -> Service Accounts -> create -> Keys -> Add Key -> JSON -> download
// 3. Save as service-account.json in project root, add to .gitignore
// 4. Open your Sheet -> Share -> add the service account's client_email as Editor
// 5. .env me: GOOGLE_SHEET_ID=<sheet URL ke /d/ aur /edit ke beech wala part>
// 6. Sheet me tab "Students" banao, header row: Atomic ID | Name | Email | Phone | Batch | Role | Plan | Access Status | Expires At | Synced At
// 7. Sheet me tab "Schedule" banao, header row (16 columns, A-P):
//    Date | Day | Teacher | Start Time | Lecture Name | Lecture No. | Class Type | Subject |
//    Stream key | Batch | Platform | Status | Recording | Chapter | Topic | Remarks

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_RANGE = "Students!A:J";
const SCHEDULE_SHEET_RANGE = "Schedule!A:P";

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "./service-account.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client as Parameters<typeof google.sheets>[0]["auth"] });
}

type SheetableStudent = {
  atomicId: string;
  name: string | null;
  email: string;
  phone?: string | null;
  atomicBatch?: string | null;
  role: string;
  plan?: string;
  accessStatus?: string;
  expiresAt?: Date | null;
};

export async function syncStudentToSheet(student: SheetableStudent) {
  try {
    const sheets = await getSheetsClient();
    const row = [
      student.atomicId,
      student.name || "",
      student.email,
      student.phone || "",
      student.atomicBatch || "NO_BATCH",
      student.role,
      student.plan || "FREE",
      student.accessStatus || "ACTIVE",
      student.expiresAt ? new Date(student.expiresAt).toISOString() : "",
      new Date().toISOString(),
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: SHEET_RANGE,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } catch (err: unknown) {
    // never let a sheet-sync failure break registration/login for the user
    console.error("Google Sheets sync failed:", err instanceof Error ? err.message : String(err));
  }
}

// Raw row shape matching the real "Schedule" tab layout (16 columns, A-P).
// No parsing/validation here — that happens in the sync route.
export interface SheetScheduleRow {
  date: string;
  day: string;
  teacherName: string;
  startTimeRaw: string;
  lectureName: string;
  lectureNo: string;
  classType: string;
  subject: string;
  streamKey: string;
  batch: string;
  platform: string;
  status: string;
  recording: string;
  chapter: string;
  topic: string;
  remarks: string;
}

export async function readScheduleSheet(): Promise<SheetScheduleRow[]> {
  const sheets = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: SCHEDULE_SHEET_RANGE,
  });

  const rows = response.data.values ?? [];
  const cell = (row: unknown[], index: number) => String(row[index] ?? "").trim();

  return rows
    .slice(1) // skip header row
    .filter((row) => cell(row, 0)) // must at least have a Date
    .map((row) => ({
      date: cell(row, 0),
      day: cell(row, 1),
      teacherName: cell(row, 2),
      startTimeRaw: cell(row, 3),
      lectureName: cell(row, 4),
      lectureNo: cell(row, 5),
      classType: cell(row, 6),
      subject: cell(row, 7),
      streamKey: cell(row, 8),
      batch: cell(row, 9),
      platform: cell(row, 10),
      status: cell(row, 11),
      recording: cell(row, 12),
      chapter: cell(row, 13),
      topic: cell(row, 14),
      remarks: cell(row, 15),
    }));
}