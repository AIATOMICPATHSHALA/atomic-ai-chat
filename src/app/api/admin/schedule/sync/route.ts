import { NextResponse } from "next/server";
import { requireScheduleManager } from "@/lib/auth";
import { readScheduleSheet, type SheetScheduleRow } from "@/lib/googleSheets";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const VALID_BATCHES = new Set([
  "SELECTION_PRO",
  "SELECTION_1_0",
  "ARAMBH",
  "MANZIL",
  "UDAAN",
  "NO_BATCH",
]);

function accessError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }
  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "Admin or faculty access is required." }, { status: 403 });
  }
  return null;
}

// "6 : 00 PM", "11 : 00 Am", "18:00", "2 : 15 pm" -> "18:00" (24hr HH:MM)
// Entries without AM/PM are assumed to already be 24-hour time.
function parseStartTime(raw: string): string | null {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  const match = /^(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)?$/i.exec(cleaned);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = match[2];
  const suffix = match[3]?.toLowerCase();

  if (suffix === "pm" && hours < 12) hours += 12;
  if (suffix === "am" && hours === 12) hours = 0;
  if (hours > 23 || hours < 0) return null;

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

// "01/08/2026" (dd/mm/yyyy) -> Date
function parseSheetDate(raw: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildNotes(row: SheetScheduleRow): string | null {
  const parts = [
    row.lectureNo && `Lecture: ${row.lectureNo}`,
    row.classType && `Type: ${row.classType}`,
    row.chapter && `Chapter: ${row.chapter}`,
    row.platform && `Platform: ${row.platform}`,
    row.status && `Status: ${row.status}`,
    row.streamKey && `Stream key: ${row.streamKey}`,
    row.remarks && `Remarks: ${row.remarks}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : null;
}

export async function POST() {
  try {
    await requireScheduleManager();
    const rows = await readScheduleSheet();
    const prisma = getPrisma();

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const batch = row.batch.toUpperCase().replace(/\s+/g, "_");
      const classDate = parseSheetDate(row.date);
      const startTime = parseStartTime(row.startTimeRaw);
      const subject = row.subject.trim();

      if (!VALID_BATCHES.has(batch) || !classDate || !startTime || !subject) {
        skipped += 1;
        continue;
      }

      const topic = row.topic.trim() || row.lectureName.trim() || "General";
      const teacherName = row.teacherName.trim() || null;
      const youtubeLink = /^https?:\/\//i.test(row.recording.trim()) ? row.recording.trim() : null;
      const notes = buildNotes(row);

      const existing = await prisma.classSchedule.findFirst({
        where: {
          batch: batch as never,
          classDate,
          startTime,
          subject,
        },
      });

      if (existing) {
        await prisma.classSchedule.update({
          where: { id: existing.id },
          data: {
            teacherName,
            topic: topic || existing.topic,
            youtubeLink,
            notes,
          },
        });
        updated += 1;
      } else {
        await prisma.classSchedule.create({
          data: {
            batch: batch as never,
            classDate,
            startTime,
            subject,
            teacherName,
            topic,
            youtubeLink,
            notes,
          },
        });
        created += 1;
      }
    }

    return NextResponse.json({ created, updated, skipped, total: rows.length });
  } catch (error) {
    const response = accessError(error);
    if (response) return response;
    console.error("[Schedule Sync API]", error);
    return NextResponse.json({ error: "Could not sync schedule from Google Sheet." }, { status: 500 });
  }
}