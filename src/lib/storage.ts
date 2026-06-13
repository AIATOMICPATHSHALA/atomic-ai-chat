import type { ChatSession } from "@/types/chat";

const STORAGE_KEY = "atomic-pathshala-chats";

export function loadChats(): ChatSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChats(chats: ChatSession[]): void {
  if (typeof window === "undefined") return;

  // Strip base64 image data before persisting to avoid bloating localStorage
  const stripped = chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map(({ imageBase64, imageMimeType, ...msg }) => msg),
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createChatTitle(firstMessage: string): string {
  const cleaned = firstMessage.trim().replace(/\s+/g, " ");
  if (!cleaned) return "New Doubt";
  return cleaned.length > 40 ? `${cleaned.slice(0, 40)}…` : cleaned;
}
