"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { GraduationCap, Send, Sparkles, Brain } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useDistrict } from "@/context/DistrictContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Topic {
  id: string;
  topic: string;
  description: string;
  emoji: string;
}

interface AskResponse {
  success: boolean;
  question: string;
  data: {
    answer: string;
    key_points: string[];
    local_context: string;
    language_note?: string;
  };
}

interface Message {
  role: "user" | "ai";
  content: string;
  key_points?: string[];
  local_context?: string;
  language_note?: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TopicChip({
  topic,
  onClick,
}: {
  topic: Topic;
  onClick: (t: Topic) => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(topic)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body font-medium",
        "border border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
        "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]",
        "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]",
        "hover:border-[var(--color-primary)]/60 hover:text-[var(--color-primary)] dark:hover:text-[var(--color-primary-dark)]",
        "transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1"
      )}
    >
      <span>{topic.emoji}</span>
      <span>{topic.topic}</span>
    </motion.button>
  );
}

function UserBubble({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] sm:max-w-[65%]">
        <div
          className={cn(
            "px-4 py-3 rounded-[var(--radius-lg)] rounded-br-sm",
            "bg-[var(--color-primary)] text-white",
            "text-sm font-body leading-relaxed"
          )}
        >
          {message.content}
        </div>
        <p className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-1 text-right">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function AiBubble({ message }: { message: Message }) {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-ochre)]/15 border border-[var(--color-ochre)]/30 flex items-center justify-center mt-0.5">
        <Sparkles className="w-4 h-4 text-[var(--color-ochre)]" />
      </div>

      <div className="flex-1 min-w-0 max-w-[80%]">
        {/* Answer text */}
        <div
          className={cn(
            cardClass,
            "px-4 py-3 rounded-tl-sm text-sm font-body leading-relaxed",
            "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]"
          )}
        >
          {message.content}

          {/* Key points */}
          {message.key_points && message.key_points.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)] pt-3">
              {message.key_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] text-xs font-body">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* Local context */}
          {message.local_context && (
            <p className="mt-3 pt-3 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-xs font-body italic text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {message.local_context}
            </p>
          )}

          {/* Language note */}
          {message.language_note && (
            <p className="mt-2 text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              {message.language_note}
            </p>
          )}
        </div>

        <p className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 text-center px-4"
    >
      <div className="w-16 h-16 rounded-full bg-[var(--color-ochre)]/10 border border-[var(--color-ochre)]/20 flex items-center justify-center mb-4">
        <GraduationCap className="w-8 h-8 text-[var(--color-ochre)]" />
      </div>
      <p className="font-display font-semibold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-1.5">
        Your AI Hygiene Educator
      </p>
      <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] max-w-xs">
        Ask your first question to get AI-powered hygiene guidance tailored for Northern Ghana communities.
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EducatorPage() {
  const { district } = useDistrict();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch topics
  const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ["educator-topics"],
    queryFn: async () => {
      const { data } = await api.get("/educator/topics");
      return data.data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Ask mutation
  const { mutate: ask, isPending } = useMutation<AskResponse, Error, string>({
    mutationFn: async (question: string) => {
      const { data } = await api.post("/educator/ask", {
        question,
        district,
      });
      return data as AskResponse;
    },
    onSuccess: (res, question) => {
      const aiMsg: Message = {
        role: "ai",
        content: res.data.answer,
        key_points: res.data.key_points,
        local_context: res.data.local_context,
        language_note: res.data.language_note,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    },
  });

  // Auto-scroll on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Submit handler
  const handleSubmit = () => {
    const question = input.trim();
    if (!question || isPending) return;

    const userMsg: Message = {
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    ask(question);
  };

  // Keyboard shortcut
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Topic chip click
  const handleTopicClick = (topic: Topic) => {
    setInput(`Tell me about ${topic.topic} in Northern Ghana communities`);
    textareaRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] space-y-4"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            AI Hygiene Educator
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            Ask questions about WASH and sanitation in Northern Ghana
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-ochre)]/10 border border-[var(--color-ochre)]/25 shrink-0 self-start">
          <Brain className="w-3.5 h-3.5 text-[var(--color-ochre)]" />
          <span className="text-xs font-body font-semibold text-[var(--color-ochre)]">Gemini AI</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Topic chips                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0">
        {topicsLoading ? (
          <div className="flex items-center gap-2 py-1">
            <PageSpinner />
            <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
              Loading topics…
            </span>
          </div>
        ) : topics.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <TopicChip key={topic.id} topic={topic} onClick={handleTopicClick} />
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Chat area                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div
        className={cn(
          cardClass,
          "flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        )}
      >
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                {msg.role === "user" ? (
                  <UserBubble message={msg} />
                ) : (
                  <AiBubble message={msg} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Loading indicator */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2 }}
              className="flex gap-3"
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--color-ochre)]/15 border border-[var(--color-ochre)]/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[var(--color-ochre)]" />
              </div>
              <div className={cn(cardClass, "px-4 py-3 flex items-center gap-1.5 rounded-tl-sm")}>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--color-text-3)] dark:bg-[var(--color-text-3-dark)]"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Input area                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className={cn(cardClass, "p-3 shrink-0")}>
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            placeholder="Ask about handwashing, safe water, flood sanitation…"
            className={cn(
              "flex-1 resize-none bg-transparent text-sm font-body",
              "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]",
              "placeholder:text-[var(--color-text-3)] dark:placeholder:text-[var(--color-text-3-dark)]",
              "focus:outline-none leading-relaxed",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
          <div className="shrink-0 pb-0.5">
            <motion.div
              whileHover={!isPending && input.trim() ? { scale: 1.05 } : {}}
              whileTap={!isPending && input.trim() ? { scale: 0.95 } : {}}
            >
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isPending}
                size="sm"
                className={cn(
                  "gap-1.5 font-body font-semibold transition-all duration-150",
                  "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {isPending ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="inline-block"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </motion.span>
                    Thinking
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
        <p className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-2">
          Press <kbd className="px-1 py-0.5 rounded border border-[var(--color-border)] dark:border-[var(--color-border-dark)] font-mono text-[10px]">Enter</kbd> to send
          &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 rounded border border-[var(--color-border)] dark:border-[var(--color-border-dark)] font-mono text-[10px]">Shift + Enter</kbd> for new line
        </p>
      </div>
    </motion.div>
  );
}
