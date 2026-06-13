"use client";

import { Bot, User } from "lucide-react";
import Image from "next/image";
import type { ChatMessage } from "@/types/chat";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-atomic-orange text-white"
            : "bg-atomic-blue text-white dark:bg-atomic-blue-light"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={`max-w-[85%] space-y-2 sm:max-w-[75%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {message.imageUrl && (
          <div
            className={`overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 ${
              isUser ? "ml-auto" : ""
            }`}
          >
            <Image
              src={message.imageUrl}
              alt="Uploaded doubt"
              width={320}
              height={240}
              className="max-h-60 w-auto object-contain"
              unoptimized
            />
          </div>
        )}

        {message.content && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isUser
                ? "message-user rounded-tr-sm"
                : "message-assistant rounded-tl-sm"
            }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}