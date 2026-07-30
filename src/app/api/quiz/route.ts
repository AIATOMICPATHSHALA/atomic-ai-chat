import { NextRequest, NextResponse } from "next/server";
import { generateQuizQuestions } from "@/lib/gemini";
import { buildQuizRequestPrompt, parseQuizJson, getEntriesForSubject, type QuizSubject } from "@/lib/quiz";
import { getCurrentUser } from "@/lib/auth";
import {
  hasActiveSubscription,
  getDailyQuestionsUsed,
  recordQuestionUsage,
  DAILY_FREE_LIMIT,
} from "@/lib/access";

export const runtime = "nodejs";

const VALID_SUBJECTS: QuizSubject[] = ["Biology", "Physics", "Chemistry", "Full NEET"];
const VALID_LANGUAGES = ["english", "hindi", "hinglish"];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      subject?: string;
      language?: string;
      topic?: string;
      questionCount?: number;
    };
    const subject = body.subject;
    const language = VALID_LANGUAGES.includes(body.language ?? "")
      ? (body.language as "english" | "hindi" | "hinglish")
      : "english";
    const topic = body.topic?.trim() || undefined;

    if (!subject || !VALID_SUBJECTS.includes(subject as QuizSubject)) {
      return NextResponse.json({ error: "Invalid quiz subject." }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (user) {
      const isSubscribed = await hasActiveSubscription(user.id);
      if (!isSubscribed) {
        const used = await getDailyQuestionsUsed(user.id);
        if (used >= DAILY_FREE_LIMIT) {
          return NextResponse.json(
            {
              error: "Aaj ke free sawaal khatam ho gaye. Subscribe karke unlimited access paayein.",
              code: "DAILY_LIMIT_REACHED",
            },
            { status: 403 }
          );
        }
      }
    }

    const entries = getEntriesForSubject(subject as QuizSubject, body.questionCount);
    const prompt = buildQuizRequestPrompt(entries, language, topic);
    const raw = await generateQuizQuestions(prompt);
    const questions = parseQuizJson(raw);

    if (!questions) {
      return NextResponse.json(
        { error: "Could not generate the quiz. Please try again." },
        { status: 502 }
      );
    }

    if (user) {
      await recordQuestionUsage(user.id);
    }

    return NextResponse.json({ questions, entries });
  } catch (error) {
    console.error("[Quiz API]", error);
    return NextResponse.json({ error: "Could not generate the quiz." }, { status: 500 });
  }
}