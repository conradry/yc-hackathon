"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  onSubmit: (text: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isStreaming,
  onStop,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    onSubmit(input.trim());
    setInput("");
  };

  return (
    <div className="flex-none px-6 py-4 border-t-3 border-black bg-white">
      <div className="flex gap-3 max-w-4xl mx-auto">
        <div className="flex-1 neo-border rounded-sm bg-[var(--color-secondary)] flex items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask about perturbation biology..."
            rows={1}
            className="flex-1 px-4 py-3 bg-transparent resize-none outline-none font-[var(--font-body)] text-sm"
          />
        </div>
        {isStreaming ? (
          <button
            onClick={onStop}
            className="neo-btn bg-[var(--color-destructive)] text-white px-6 py-3 rounded-sm font-semibold text-sm"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="neo-btn bg-[var(--color-primary)] text-white px-6 py-3 rounded-sm font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
