import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import generateAtomicId from "@/lib/generateAtomicId";
import { syncStudentToSheet } from "@/lib/googleSheets";
import { signAccessToken, signRefreshToken } from "@/lib/auth";

const VALID_BATCHES = ["Selection Pro Batch", "Selection 1.0 Batch", "Arambh Batch", "Manzil Batch", "No Batch"];

export async function POST(req) {
  try {
    await connectDB();
    const { name, email, phone, password, batch } = await req.json();

    if (!name || !email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Valid name, email, and password (min 8 chars) required" },
        { status: 400 }
      );
    }

    if (!batch || !VALID_BATCHES.includes(batch)) {
      return NextResponse.json(
        { error: `Batch must be one of: ${VALID_BATCHES.join(", ")}` },
        { status: 400 }
      );
    }

    const existing = await Student.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const atomicId = await generateAtomicId();

    const student = await Student.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      atomicId,
      batch,
      subscription: { plan: "free", isActive: false },
    });

    syncStudentToSheet(student); // fire and forget

    const accessToken = signAccessToken(student);
    const refreshToken = signRefreshToken(student);
    student.refreshTokens.push(refreshToken);
    await student.save();

    const res = NextResponse.json(
      {
        accessToken,
        student: {
          atomicId: student.atomicId,
          name: student.name,
          email: student.email,
          role: student.role,
          batch: student.batch,
        },
      },
      { status: 201 }
    );

    res.cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
