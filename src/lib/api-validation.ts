import type { ChatRequestBody, Language } from "@/types/chat";
import { ChatApiError } from "@/lib/errors";

const VALID_LANGUAGES: Language[] = ["english", "hindi", "hinglish"];
const VALID_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 10000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB

export function validateChatRequest(body: unknown): ChatRequestBody {
  if (!body || typeof body !== "object") {
    throw new ChatApiError("Invalid request body.", 400);
  }

  const { messages, language } = body as ChatRequestBody;

  if (!VALID_LANGUAGES.includes(language)) {
    throw new ChatApiError("Invalid language. Use english, hindi, or hinglish.", 400);
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ChatApiError("No messages provided.", 400);
  }

  if (messages.length > MAX_MESSAGES) {
    throw new ChatApiError("Too many messages in conversation.", 400);
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    throw new ChatApiError("Last message must be from the user.", 400);
  }

  const validatedMessages = messages.map((msg, index) => {
    if (msg.role !== "user" && msg.role !== "assistant") {
      throw new ChatApiError("Invalid message role.", 400);
    }

    if (typeof msg.content !== "string") {
      throw new ChatApiError("Message content must be a string.", 400);
    }

    if (msg.content.length > MAX_CONTENT_LENGTH) {
      throw new ChatApiError("Message is too long.", 400);
    }

    if (msg.imageBase64) {
      if (!msg.imageMimeType || !VALID_IMAGE_TYPES.includes(msg.imageMimeType)) {
        throw new ChatApiError("Unsupported image type. Use JPEG, PNG, WebP, or GIF.", 400);
      }

      const estimatedBytes = Math.ceil((msg.imageBase64.length * 3) / 4);
      if (estimatedBytes > MAX_IMAGE_BYTES) {
        throw new ChatApiError("Image is too large. Maximum size is 4 MB.", 400);
      }
    }

    // Require text or image on the latest user message
    if (index === messages.length - 1 && msg.role === "user") {
      if (!msg.content.trim() && !msg.imageBase64) {
        throw new ChatApiError("Message must include text or an image.", 400);
      }
    }

    return msg;
  });

  return { messages: validatedMessages, language };
}
