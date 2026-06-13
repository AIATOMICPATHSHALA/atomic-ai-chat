export class ChatApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

export function mapGeminiError(error: unknown): ChatApiError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("api_key") || lower.includes("api key") || lower.includes("invalid key")) {
    return new ChatApiError(
      "Invalid Gemini API key. Check GEMINI_API_KEY in .env.local.",
      401
    );
  }

  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("429")) {
    return new ChatApiError(
      "API rate limit reached. Please wait a moment and try again.",
      429
    );
  }

  if (lower.includes("safety") || lower.includes("blocked")) {
    return new ChatApiError(
      "Response was blocked for safety reasons. Please rephrase your question.",
      400
    );
  }

  if (lower.includes("not found") && lower.includes("model")) {
    return new ChatApiError(
      "AI model unavailable. Please try again later.",
      503
    );
  }

  if (lower.includes("timeout") || lower.includes("deadline")) {
    return new ChatApiError("Request timed out. Please try again.", 504);
  }

  return new ChatApiError(
    "Failed to get AI response. Please try again.",
    500
  );
}
