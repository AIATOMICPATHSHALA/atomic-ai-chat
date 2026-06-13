import { NextRequest, NextResponse } from "next/server";
import { validateChatRequest } from "@/lib/api-validation";
import { ChatApiError } from "@/lib/errors";
import { generateChatResponse } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateChatRequest(body);
    const message = await generateChatResponse(validated);

    return NextResponse.json(
      { message },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (error instanceof ChatApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Something went wrong. Please try again.";

    console.error("[Chat API]", error);

    const status =
      message.includes("GEMINI_API_KEY") ? 500 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
