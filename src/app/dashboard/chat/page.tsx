"use client";

import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What did I spend most on this week?",
  "Am I on track with my savings goal?",
  "Should I cancel my gym membership?",
  "What are my riskiest spending habits?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.reply ?? "Sorry, I couldn't answer that." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-[#f0f0f5]">Ask Loop</h1>
        <p className="text-sm text-[#6b6b8a] mt-1">
          Your AI agent knows your goals, spending, receipts, and habits.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#7c6af5]/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#7c6af5]" />
            </div>
            <div>
              <p className="font-semibold text-[#f0f0f5] mb-1">Loop is ready</p>
              <p className="text-sm text-[#6b6b8a] max-w-xs">
                Ask me anything about your money, health, or habits.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm text-[#c0c0d8] bg-[#111118] border border-[#1e1e2e] hover:border-[#7c6af5]/40 hover:bg-[#7c6af5]/5 rounded-xl p-3 transition-all"
                >
                  &ldquo;{s}&rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5",
              msg.role === "user"
                ? "bg-[#7c6af5] text-white"
                : "bg-[#1a1a28] text-[#6b6b8a]"
            )}>
              {msg.role === "user" ? "U" : <MessageSquare className="w-3.5 h-3.5" />}
            </div>
            <div className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
              msg.role === "user"
                ? "bg-[#7c6af5] text-white rounded-tr-sm"
                : "bg-[#111118] border border-[#1e1e2e] text-[#e8e8f0] rounded-tl-sm"
            )}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[#1a1a28] flex items-center justify-center shrink-0 mt-0.5">
              <MessageSquare className="w-3.5 h-3.5 text-[#6b6b8a]" />
            </div>
            <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-[#6b6b8a] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 pt-3 border-t border-[#1e1e2e]">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Loop anything…"
          rows={1}
          className="flex-1 bg-[#1a1a28] border border-[#1e1e2e] text-[#f0f0f5] placeholder-[#6b6b8a] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#7c6af5] focus:border-transparent transition-all"
        />
        <Button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="shrink-0 px-3"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
