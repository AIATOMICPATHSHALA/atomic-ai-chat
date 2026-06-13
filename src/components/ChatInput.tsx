"use client";

import { Camera, ImagePlus, Send, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

interface ChatInputProps {
  onSend: (text: string, imageFile?: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleImageSelect = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !imageFile) || disabled) return;

    onSend(trimmed, imageFile ?? undefined);
    setText("");
    clearImage();

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const canSend = (text.trim().length > 0 || imageFile) && !disabled;

  return (
    <div className="border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-atomic-navy sm:p-4">
      {imagePreview && (
        <div className="relative mb-3 inline-block">
          <Image
            src={imagePreview}
            alt="Preview"
            width={120}
            height={90}
            className="rounded-xl border border-slate-200 object-cover dark:border-slate-600"
            unoptimized
          />
          <button
            onClick={clearImage}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-md hover:bg-red-600"
            aria-label="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleImageSelect(e.target.files?.[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleImageSelect(e.target.files?.[0])}
        />

        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-atomic-orange disabled:opacity-50 dark:hover:bg-slate-800"
            title="Upload image"
            aria-label="Upload image"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-atomic-orange disabled:opacity-50 dark:hover:bg-slate-800 sm:hidden"
            title="Take photo"
            aria-label="Take photo with camera"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? "Ask your doubt here… (Shift+Enter for new line)"}
          rows={1}
          className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-atomic-orange focus:outline-none focus:ring-2 focus:ring-atomic-orange/20 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-atomic-orange text-white shadow-md transition-all hover:bg-atomic-orange-dark disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      <p className="mt-2 hidden text-center text-xs text-slate-400 sm:block dark:text-slate-500">
        Supports English, Hindi & Hinglish · Upload images or use camera on mobile
      </p>
    </div>
  );
}