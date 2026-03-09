"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { ChatActionsProvider } from "@/lib/chat-context";

export function ChatContainer() {
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
    onError: (err) => {
      console.error("[ChatContainer] Chat error:", err);
    },
  });
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "streaming" || status === "submitted";

  const handleSendMessage = useCallback(
    (text: string) => {
      setInput("");
      sendMessage({ text });
    },
    [sendMessage]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ChatActionsProvider value={{ sendMessage: handleSendMessage }}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex-none px-6 py-4 border-b-3 border-black bg-white">
          <h1 className="font-[var(--font-heading)] text-xl font-black tracking-tight">
            Perturbation Data Analysis
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Multi-agent scientific literature and dataset analysis
          </p>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="flex-none px-6 py-3 bg-red-50 border-b-2 border-red-300 text-red-800 text-sm">
            <span className="font-bold">Error:</span>{" "}
            {error.message || "Something went wrong. Please try again."}
          </div>
        )}

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4"
        >
          {messages.length === 0 && <WelcomeScreen onSuggestion={handleSendMessage} />}
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isStreaming={isStreaming && index === messages.length - 1}
            />
          ))}
        </div>

        {/* Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={handleSendMessage}
          isStreaming={isStreaming}
          onStop={stop}
        />
      </div>
    </ChatActionsProvider>
  );
}

function WelcomeScreen({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 max-w-2xl mx-auto text-center py-16">
      <div className="neo-border neo-shadow bg-white p-6 rounded-sm">
        <h2 className="font-[var(--font-heading)] text-2xl font-black mb-3">
          Perturbation Biology Assistant
        </h2>
        <p className="text-[var(--color-muted)] mb-6">
          Search curated publications and datasets, assess paper quality with
          multi-agent consensus, and analyze gene expression data.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SuggestionChip
            text="What genes are upregulated in cells treated with vorinostat?"
            onClick={onSuggestion}
          />
          <SuggestionChip
            text="Are there datasets with combinatorial perturbation on TP53 and PIK3CA?"
            onClick={onSuggestion}
          />
          <SuggestionChip
            text="Find CRISPR knockout studies on TP53 in organoids"
            onClick={onSuggestion}
          />
          <SuggestionChip
            text="Compare HDAC inhibitor responses across cell lines"
            onClick={onSuggestion}
          />
        </div>
      </div>
    </div>
  );
}

function SuggestionChip({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="neo-btn bg-[var(--color-secondary)] px-4 py-3 rounded-sm text-left text-sm hover:bg-[var(--color-secondary-hover)] transition-colors"
    >
      {text}
    </button>
  );
}
