import { NextRequest, NextResponse } from "next/server";
import { validateChatRequest } from "@/lib/api-validation";
import { ChatApiError, getGeminiErrorDetails } from "@/lib/errors";
import {
  generateChatResponse,
  generateChatResponseStream,
} from "@/lib/gemini";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof ChatApiError) {
    if (error.cause) {
      console.error("[Chat API]", getGeminiErrorDetails(error.cause));
    }

    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  const message =
    error instanceof Error ? error.message : "Something went wrong. Please try again.";

  console.error("[Chat API]", error);

  return NextResponse.json({ error: message }, { status: 500 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = validateChatRequest(body);

    if (validated.stream) {
      const encoder = new TextEncoder();
      const responseStream = generateChatResponseStream(validated, request.signal);
      const firstChunk = await responseStream.next();

      if (firstChunk.done) {
        throw new ChatApiError("Received an empty response from AI.", 500);
      }

      return new Response(
        new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              controller.enqueue(encoder.encode(firstChunk.value));

              for await (const chunk of responseStream) {
                controller.enqueue(encoder.encode(chunk));
              }
              controller.close();
            } catch (error) {
              controller.error(error);
            }
          },
        }),
        {
          headers: {
            "Cache-Control": "no-store, no-transform",
            "Content-Type": "text/plain; charset=utf-8",
            "X-Accel-Buffering": "no",
          },
        }
      );
    }

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
    return errorResponse(error);
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
