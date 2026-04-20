import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Sun,
  Moon,
  ChevronDown,
  Sparkles,
  MessageSquare,
  Filter,
} from "lucide-react";
import MessageBubble, { ThinkingBubble } from "./MessageBubble";
import { Message, VideoInfo } from "../types";
import { askQuestion } from "../api/client";

interface ChatWindowProps {
  availableVideos: VideoInfo[];
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

const WELCOME_PROMPTS = [
  "Summarize the key points from my ingested videos",
  "What topics are covered across all videos?",
  "Give me actionable takeaways from this content",
  "What are the most important concepts discussed?",
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  availableVideos,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  theme,
  onToggleTheme,
}) => {
  const [input, setInput] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  // Send message
  const handleSend = useCallback(
    async (questionOverride?: string) => {
      const question = (questionOverride ?? input).trim();
      if (!question || isLoading) return;

      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: question,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const payload = {
          question,
          video_id: selectedVideoId || null,
        };
        const res = await askQuestion(payload);

        const aiMsg: Message = {
          id: generateId(),
          role: "ai",
          content: res.answer,
          sources: res.source_videos,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const errMsg: Message = {
          id: generateId(),
          role: "ai",
          content: `**Error:** ${(err as Error).message ?? "Something went wrong. Please try again."}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, selectedVideoId, setMessages, setIsLoading],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedVideo = availableVideos.find(
    (v) => v.video_id === selectedVideoId,
  );
  const isEmpty = messages.length === 0;

  return (
    <main
      className="flex flex-col flex-1 min-w-0 h-full"
      style={{ backgroundColor: "var(--surface)" }}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          backgroundColor: "var(--surface)",
          boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
        }}
      >
        {/* Left: Title + filter context */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 neu-raised-sm"
            style={{ backgroundColor: "var(--surface-container)" }}
          >
            <Sparkles size={16} style={{ color: "var(--primary)" }} />
          </div>
          <div className="min-w-0">
            <h2
              className="font-extrabold text-base leading-tight tracking-editorial truncate"
              style={{
                fontFamily: "Manrope, sans-serif",
                color: "var(--on-surface)",
              }}
            >
              {selectedVideo
                ? selectedVideo.title.length > 70
                  ? selectedVideo.title.slice(0, 70) + "..."
                  : selectedVideo.title
                : "All Videos"}
            </h2>
            <p
              className="text-xs truncate"
              style={{ color: "var(--on-surface-faint)" }}
            >
              {selectedVideo
                ? `Filtering · ${selectedVideo.channel_name}`
                : `${availableVideos.length} video${availableVideos.length !== 1 ? "s" : ""} in knowledge base`}
            </p>
          </div>
        </div>

        {/* Right: Filter dropdown + theme toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Video filter dropdown */}
          <div className="relative" ref={filterRef}>
            {/* Trigger pill */}
            <button
              onClick={() => setIsFilterOpen((o) => !o)}
              className="flex items-center gap-2 pl-3 pr-8 py-2 rounded-xl neu-raised-sm transition-shadow duration-150 cursor-pointer"
              style={{ backgroundColor: "var(--surface-container)" }}
            >
              <Filter size={13} style={{ color: "var(--on-surface-muted)" }} />
              <span
                className="text-sm font-medium truncate"
                style={{
                  color: "var(--on-surface)",
                  fontFamily: "Inter, sans-serif",
                  maxWidth: "240px",
                }}
              >
                {selectedVideo
                  ? selectedVideo.title.length > 28
                    ? selectedVideo.title.slice(0, 28) + "…"
                    : selectedVideo.title
                  : "All Videos"}
              </span>
              <ChevronDown
                size={13}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 transition-transform duration-200 ${isFilterOpen ? "rotate-180" : ""}`}
                style={{ color: "var(--on-surface-faint)" }}
              />
            </button>

            {/* Custom option panel */}
            {isFilterOpen && (
              <div
                className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden neu-raised-sm"
                style={{
                  backgroundColor: "var(--surface-container)",
                  minWidth: "220px",
                  maxWidth: "320px",
                  boxShadow: "var(--neu-sm)",
                }}
              >
                <div className="overflow-y-auto" style={{ maxHeight: "260px" }}>
                  {[
                    { video_id: "", title: "All Videos", channel_name: "" },
                    ...availableVideos,
                  ].map((v) => {
                    const isSelected = v.video_id === selectedVideoId;
                    return (
                      <div
                        key={v.video_id || "__all__"}
                        onClick={() => {
                          setSelectedVideoId(v.video_id);
                          setIsFilterOpen(false);
                        }}
                        className="px-3.5 py-2.5 cursor-pointer transition-colors duration-100"
                        style={{
                          backgroundColor: isSelected
                            ? "var(--surface-high)"
                            : "transparent",
                          color: isSelected
                            ? "var(--primary)"
                            : "var(--on-surface)",
                          fontFamily: "Inter, sans-serif",
                          fontSize: "0.8125rem",
                          fontWeight: isSelected ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected)
                            (
                              e.currentTarget as HTMLDivElement
                            ).style.backgroundColor = "var(--surface-high)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected)
                            (
                              e.currentTarget as HTMLDivElement
                            ).style.backgroundColor = "transparent";
                        }}
                      >
                        <p className="truncate">{v.title}</p>
                        {v.channel_name && (
                          <p
                            className="text-xs truncate mt-0.5"
                            style={{
                              color: isSelected
                                ? "var(--primary)"
                                : "var(--on-surface-faint)",
                              opacity: 0.8,
                            }}
                          >
                            {v.channel_name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-xl transition-all duration-200 neu-raised-sm active:neu-well-xs"
            style={{ backgroundColor: "var(--surface-container)" }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun size={15} style={{ color: "var(--on-surface-muted)" }} />
            ) : (
              <Moon size={15} style={{ color: "var(--on-surface-muted)" }} />
            )}
          </button>
        </div>
      </header>

      {/* ── Message Feed ────────────────────────────────── */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5"
      >
        {isEmpty ? (
          /* ── Welcome screen ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-8 animate-fade-in min-h-full">
            <div className="text-center space-y-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 neu-raised"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
                }}
              >
                <MessageSquare size={24} color="#fff" />
              </div>
              <h3
                className="text-2xl font-black tracking-editorial"
                style={{
                  fontFamily: "Manrope, sans-serif",
                  color: "var(--on-surface)",
                }}
              >
                Start a conversation
              </h3>
              <p
                className="text-sm max-w-xs"
                style={{ color: "var(--on-surface-muted)" }}
              >
                Ask anything about your ingested YouTube videos. The AI will
                retrieve relevant context and synthesize an answer.
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {WELCOME_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  disabled={availableVideos.length === 0}
                  className="text-left px-4 py-3.5 rounded-2xl text-sm transition-all duration-200 neu-raised-sm
                             hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: "var(--surface-container)",
                    color: "var(--on-surface)",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <Sparkles
                    size={12}
                    className="inline mr-2 mb-0.5"
                    style={{ color: "var(--primary)" }}
                  />
                  {prompt}
                </button>
              ))}
            </div>

            {availableVideos.length === 0 && (
              <p
                className="text-xs"
                style={{ color: "var(--on-surface-faint)" }}
              >
                ↖ Ingest some videos first to get started
              </p>
            )}
          </div>
        ) : (
          /* ── Actual messages ── */
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                availableVideos={availableVideos}
              />
            ))}
            {isLoading && <ThinkingBubble />}
          </>
        )}
      </div>

      {/* ── Input Area ──────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-6 pb-6 pt-3"
        style={{ backgroundColor: "var(--surface)" }}
      >
        <div
          className="flex items-end gap-3 px-4 py-3 rounded-2xl neu-well-sm"
          style={{ backgroundColor: "var(--surface-low)" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              availableVideos.length === 0
                ? "Ingest videos to start chatting…"
                : "Ask a question about your videos… (Enter to send, Shift+Enter for newline)"
            }
            disabled={isLoading || availableVideos.length === 0}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm leading-relaxed focus:outline-none py-1 placeholder:transition-opacity disabled:opacity-50"
            style={{
              color: "var(--on-surface)",
              fontFamily: "Inter, sans-serif",
              minHeight: "36px",
              maxHeight: "160px",
              caretColor: "var(--primary)",
            }}
          />

          <button
            onClick={() => handleSend()}
            disabled={
              isLoading || !input.trim() || availableVideos.length === 0
            }
            className="btn-primary flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          >
            <Send size={15} />
          </button>
        </div>

        {/* Footer hint */}
        <p
          className="text-center text-xs mt-2.5"
          style={{
            color: "var(--on-surface-faint)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          AI results are prone to errors. Cross verify for authencity of facts.
        </p>
      </div>
    </main>
  );
};

export default ChatWindow;
