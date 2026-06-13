import { GoogleGenerativeAI } from "@google/generative-ai";
import { mapGeminiError } from "@/lib/errors";
import { getSystemPrompt } from "@/lib/prompts";
import type { ChatRequestBody, Language } from "@/types/chat";

const GEMINI_MODEL = "gemini-2.5-flash";

type ContentPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

export async function generateChatResponse(body: ChatRequestBody): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey.includes("your_gemini_api_key") || apiKey.includes("_gemini_api_key")) {
    throw new Error("GEMINI_API_KEY is not configured. Add it to your .env.local file.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: getSystemPrompt(body.language),
    });

    const history = body.messages.slice(0, -1).map((msg) => ({
      role: msg.role === "user" ? ("user" as const) : ("model" as const),
      parts: buildParts(body.language, msg.content, msg.imageBase64, msg.imageMimeType),
    }));

    const lastMessage = body.messages[body.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      throw new Error("Last message must be from the user.");
    }

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(
      buildParts(
        body.language,
        lastMessage.content,
        lastMessage.imageBase64,
        lastMessage.imageMimeType
      )
    );

    const response = result.response;
    const text = response.text();

    if (!text?.trim()) {
      const blockReason = response.promptFeedback?.blockReason;
      if (blockReason) {
        throw new Error(`Response blocked: ${blockReason}`);
      }
      throw new Error("Empty response from Gemini.");
    }

    return text.trim();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("GEMINI_API_KEY")) {
      throw error;
    }
    throw mapGeminiError(error);
  }
}

const IMAGE_ONLY_PROMPTS: Record<Language, string> = {
  english: "Please analyze this image and solve my academic doubt step by step.",
  hindi: "कृपया इस छवि का विश्लेषण करें और मेरा शैक्षणिक सवाल चरणबद्ध तरीके से हल करें।",
  hinglish:
    "Please is image ko analyze karo aur mera academic doubt step-by-step solve karo.",
};

function buildParts(
  language: Language,
  content: string,
  imageBase64?: string,
  imageMimeType?: string
): ContentPart[] {
  const parts: ContentPart[] = [];

  if (imageBase64 && imageMimeType) {
    parts.push({
      inlineData: {
        data: imageBase64,
        mimeType: imageMimeType,
      },
    });
  }

  parts.push({
    text: content.trim() || IMAGE_ONLY_PROMPTS[language],
  });

  return parts;
}
