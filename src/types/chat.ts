export type Language = "english" | "hindi" | "hinglish";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  imageBase64?: string;
  imageMimeType?: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  language: Language;
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequestBody {
  messages: Array<{
    role: MessageRole;
    content: string;
    imageBase64?: string;
    imageMimeType?: string;
  }>;
  language: Language;
}
