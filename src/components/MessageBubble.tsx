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
  components={{
    h1: ({ children }) => (
      <h1 className="mb-4 mt-4 text-2xl font-bold text-orange-600">
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2 className="mb-3 mt-4 text-xl font-semibold text-orange-500">
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3 className="mb-2 mt-3 text-lg font-semibold">
        {children}
      </h3>
    ),

    p: ({ children }) => (
      <p className="mb-3 leading-8">
        {children}
      </p>
    ),

    ul: ({ children }) => (
      <ul className="mb-3 list-disc pl-6 space-y-2">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="mb-3 list-decimal pl-6 space-y-2">
        {children}
      </ol>
    ),

    li: ({ children }) => (
      <li className="leading-7">
        {children}
      </li>
    ),

    strong: ({ children }) => (
      <strong className="font-bold text-orange-600">
        {children}
      </strong>
    ),

    table: ({ children }) => (
      <table className="my-4 w-full border border-slate-300">
        {children}
      </table>
    ),

    th: ({ children }) => (
      <th className="border bg-slate-100 px-3 py-2 text-left">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="border px-3 py-2">
        {children}
      </td>
    ),

    code({ children }) {
      return (
        <code className="rounded bg-slate-100 px-1 py-0.5 text-red-600">
          {children}
        </code>
      );
    },

    pre: ({ children }) => (
      <pre className="my-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-white">
        {children}
      </pre>
    ),
  }}
>
  {message.content}
</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}