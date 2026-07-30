import { NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/db";
import mongoose from "mongoose";
import Student from "@/models/Student";
import { getAuthFromRequest } from "@/lib/auth";

// ---- guest tracking (for users who haven't logged in at all) ----
const guestUsageSchema = new mongoose.Schema({
  guestId: { type: String, index: true },
  ip: { type: String, index: true },
  count: { type: Number, default: 0 },
  firstSeenAt: { type: Date, default: Date.now },
});
const GuestUsage = mongoose.models.GuestUsage || mongoose.model("GuestUsage", guestUsageSchema);

const GUEST_FREE_LIMIT = 5; // total, one-time, before login is forced
const DAILY_FREE_LIMIT = 5; // per day, for logged-in users without an active subscription
const COOKIE_NAME = "guest_id";

function getClientIp(req) {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

export async function POST(req) {
  await connectDB();
  const auth = getAuthFromRequest(req);

  let freeQuestionsLeft = null;
  let guestIdToSet = null;

  if (!auth) {
    // ---------- NOT LOGGED IN: 5 questions total, then login forced ----------
    let guestId = req.cookies.get(COOKIE_NAME)?.value;
    if (!guestId) {
      guestId = crypto.randomBytes(16).toString("hex");
      guestIdToSet = guestId;
    }

    const ip = getClientIp(req);
    let usage = await GuestUsage.findOne({ $or: [{ guestId }, { ip }] });
    if (!usage) usage = await GuestUsage.create({ guestId, ip });

    if (usage.count >= GUEST_FREE_LIMIT) {
      return NextResponse.json(
        { error: "LOGIN_REQUIRED", message: "Free limit khatam ho gayi hai. Login karein." },
        { status: 403 }
      );
    }

    usage.count += 1;
    await usage.save();
    freeQuestionsLeft = GUEST_FREE_LIMIT - usage.count;
  } else {
    // ---------- LOGGED IN ----------
    const student = await Student.findById(auth.id);
    if (!student) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    if (!student.hasActiveSubscription()) {
      // no subscription -> daily 5-question limit, auto-resets every day
      const today = todayStr();
      if (student.lastQuestionDate !== today) {
        student.dailyQuestionsUsed = 0;
        student.lastQuestionDate = today;
      }

      if (student.dailyQuestionsUsed >= DAILY_FREE_LIMIT) {
        return NextResponse.json(
          {
            error: "DAILY_LIMIT_REACHED",
            message: "Aaj ke 5 free questions khatam ho gaye. Kal phir try karein, ya subscription lein.",
          },
          { status: 403 }
        );
      }

      student.dailyQuestionsUsed += 1;
      await student.save();
      freeQuestionsLeft = DAILY_FREE_LIMIT - student.dailyQuestionsUsed;
    }
    // else: active subscription -> unlimited, no counter touched, freeQuestionsLeft stays null (= unlimited)
  }

  const { question } = await req.json();

  // ---- apna existing "answer the question" logic yahan call karo ----
  const answer = `TODO: replace with real answer logic for: ${question}`;
  // ---------------------------------------------------------------

  const res = NextResponse.json({ answer, freeQuestionsLeft });
  if (guestIdToSet) {
    res.cookies.set(COOKIE_NAME, guestIdToSet, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}
