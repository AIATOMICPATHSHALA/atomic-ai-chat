"use client";

import { MessageSquarePlus, PanelLeftClose, Trash2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { ChatSession } from "@/types/chat";

interface SidebarProps {
  chats: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClose?: () => void;
}

export function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClose,
}: SidebarProps) {
  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <aside className="flex h-full w-full flex-col bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
        <Logo />
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-atomic-orange/50 bg-white px-4 py-3 text-sm font-medium text-atomic-orange transition-all hover:border-atomic-orange hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New Doubt
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {sortedChats.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            No chat history yet. Ask your first doubt!
          </p>
        ) : (
          <ul className="space-y-1">
            {sortedChats.map((chat) => (
              <li key={chat.id}>
                <div
                  className={`group flex items-center gap-1 rounded-xl transition-colors ${
                    activeChatId === chat.id
                      ? "bg-atomic-orange/10 dark:bg-atomic-orange/20"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <button
                    onClick={() => onSelectChat(chat.id)}
                    className="min-w-0 flex-1 px-3 py-2.5 text-left"
                  >
                    <p
                      className={`truncate text-sm font-medium ${
                        activeChatId === chat.id
                          ? "text-atomic-orange"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {chat.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">
                      {new Date(chat.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                      {" - "}
                      {chat.messages.length} msg
                    </p>
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    className="mr-2 rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-700">
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          (c) Atomic Pathshala 2025
        </p>
      </div>
    </aside>
  );
}
