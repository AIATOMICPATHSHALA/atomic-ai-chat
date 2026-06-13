"use client";

import { AlertCircle, Menu } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput } from "@/components/ChatInput";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Logo } from "@/components/Logo";
import { MessageBubble } from "@/components/MessageBubble";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TypingIndicator } from "@/components/TypingIndicator";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { createChatTitle, generateId, loadChats, saveChats } from "@/lib/storage";
import type { ChatMessage, ChatSession, Language } from "@/types/chat";

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatApp() {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("hinglish");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  useEffect(() => {
    const stored = loadChats();
    setChats(stored);
    if (stored.length > 0) {
      setActiveChatId(stored.sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveChats(chats);
  }, [chats, hydrated]);

  useEffect(() => {
    if (activeChat) setLanguage(activeChat.language);
  }, [activeChat?.id, activeChat?.language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages, isLoading]);

  const createNewChat = useCallback(() => {
    const newChat: ChatSession = {
      id: generateId(),
      title: "New Doubt",
      messages: [],
      language,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setError(null);
    setSidebarOpen(false);
  }, [language]);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeChatId === id) {
          setActiveChatId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeChatId]
  );

  const updateChatLanguage = (lang: Language) => {
    setLanguage(lang);
    if (activeChatId) {
      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, language: lang } : c))
      );
    }
  };

  const sendMessage = async (text: string, imageFile?: File) => {
    setError(null);

    let chatId = activeChatId;
    let currentChats = chats;

    if (!chatId) {
      const newChat: ChatSession = {
        id: generateId(),
        title: "New Doubt",
        messages: [],
        language,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      currentChats = [newChat, ...chats];
      chatId = newChat.id;
      setChats(currentChats);
      setActiveChatId(chatId);
    }

    let imageUrl: string | undefined;
    let imageBase64: string | undefined;
    let imageMimeType: string | undefined;

    if (imageFile) {
      const converted = await fileToBase64(imageFile);
      imageBase64 = converted.base64;
      imageMimeType = converted.mimeType;
      imageUrl = URL.createObjectURL(imageFile);
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
      imageUrl,
      imageBase64,
      imageMimeType,
      timestamp: Date.now(),
    };

    const chat = currentChats.find((c) => c.id === chatId)!;
    const updatedMessages = [...chat.messages, userMessage];
    const title =
      chat.messages.length === 0 ? createChatTitle(text || "Image doubt") : chat.title;

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              title,
              messages: updatedMessages,
              language,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setIsLoading(true);

    try {
      const apiMessages = updatedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.role === "user" && msg.imageBase64 && msg.imageMimeType
          ? { imageBase64: msg.imageBase64, imageMimeType: msg.imageMimeType }
          : {}),
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, language }),
      });

      let data: { message?: string; error?: string };
      try {
        data = await response.json();
      } catch {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      if (!response.ok) {
        throw new Error(data.error ?? `Request failed (${response.status}).`);
      }

      if (!data.message?.trim()) {
        throw new Error("Received an empty response from AI.");
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
      };

      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: [...c.messages, assistantMessage],
                updatedAt: Date.now(),
              }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-white dark:bg-atomic-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-atomic-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-white dark:bg-atomic-navy">
      {/* Desktop sidebar */}
      <div className="hidden w-72 shrink-0 border-r border-slate-200 dark:border-slate-700 lg:block">
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={createNewChat}
          onSelectChat={(id) => {
            setActiveChatId(id);
            setError(null);
          }}
          onDeleteChat={deleteChat}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <Sidebar
              chats={chats}
              activeChatId={activeChatId}
              onNewChat={createNewChat}
              onSelectChat={(id) => {
                setActiveChatId(id);
                setError(null);
                setSidebarOpen(false);
              }}
              onDeleteChat={deleteChat}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 px-3 py-3 dark:border-slate-700 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Logo compact />
            </div>
            <h2 className="hidden text-sm font-semibold text-slate-700 dark:text-slate-200 lg:block">
              {activeChat?.title ?? "New Doubt"}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector
              value={language}
              onChange={updateChatLanguage}
              disabled={isLoading}
            />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col overflow-hidden">
          {!activeChat || activeChat.messages.length === 0 ? (
            <WelcomeScreen onSuggestionClick={(text) => sendMessage(text)} />
          ) : (
            <div className="flex-1 space-y-6 overflow-y-auto px-3 py-6 sm:px-6">
              {activeChat.messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 sm:mx-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            placeholder={
              language === "hindi"
                ? "अपना सवाल यहाँ लिखें…"
                : language === "hinglish"
                  ? "Apna doubt yahan likho…"
                  : "Ask your doubt here…"
            }
          />
        </main>
      </div>
    </div>
  );
}
