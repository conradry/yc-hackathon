"use client";

import type { UIMessage } from "ai";
import { isToolUIPart } from "ai";
import { WorkflowTerminal } from "@/components/workflow/WorkflowTerminal";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";
  const hasTools = message.parts.some((p) => isToolUIPart(p));

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] neo-border neo-shadow bg-[var(--color-primary)] text-white px-4 py-3 rounded-sm">
          {message.parts.map((part, i) =>
            part.type === "text" && part.text.trim() ? (
              <div key={i} className="text-sm">
                <FormattedText text={part.text} />
              </div>
            ) : null
          )}
        </div>
      </div>
    );
  }

  // Assistant message with tools → WorkflowTerminal
  if (hasTools) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[95%] w-full">
          <WorkflowTerminal parts={message.parts} isStreaming={isStreaming} />
        </div>
      </div>
    );
  }

  // Assistant message without tools → text block
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        {message.parts.map((part, i) =>
          part.type === "text" && part.text.trim() ? (
            <div
              key={i}
              className="neo-border neo-shadow bg-white px-4 py-3 rounded-sm text-sm prose prose-sm max-w-none"
            >
              <FormattedText text={part.text} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

export function FormattedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <h4 key={i} className="font-bold text-sm mt-3">
              {line.slice(4)}
            </h4>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h3 key={i} className="font-bold text-base mt-3">
              {line.slice(3)}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2 key={i} className="font-bold text-lg mt-3">
              {line.slice(2)}
            </h2>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[var(--color-muted)]">-</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-[var(--color-muted)] font-mono text-xs">
                {line.match(/^\d+/)?.[0]}.
              </span>
              <span>{line.replace(/^\d+\.\s/, "")}</span>
            </div>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-bold">
              {line.slice(2, -2)}
            </p>
          );
        }
        if (!line.trim()) return <div key={i} className="h-2" />;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
