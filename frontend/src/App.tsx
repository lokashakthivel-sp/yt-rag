import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { VideoInfo, Message, Theme } from "./types";
import { listVideos } from "./api/client";

function App() {
  const [availableVideos, setAvailableVideos] = useState<VideoInfo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [theme, setTheme] = useState<Theme>("dark");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Fetch video list
  const fetchVideos = useCallback(async () => {
    setIsSidebarLoading(true);
    try {
      const data = await listVideos();
      setAvailableVideos(data.video_ids ?? []);
    } catch (err) {
      console.error("[RAG Studio] Failed to fetch video list:", err);
    } finally {
      setIsSidebarLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleToggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const handleClearVideos = () => {
    setAvailableVideos([]);
    // Also clear chat since the knowledge base is gone
    setMessages([]);
  };

  return (
    <div
      className="flex h-full overflow-hidden relative"
      style={{ backgroundColor: "var(--surface)" }}
    >
      {/* Sidebar — fixed-width neumorphic panel */}
      <Sidebar
        availableVideos={availableVideos}
        onVideosChange={fetchVideos}
        onClearVideos={handleClearVideos}
        isLoading={isSidebarLoading}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Vertical divider — shadow-based, no border */}
      <div
        className="w-px flex-shrink-0 self-stretch my-4 rounded-full"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--surface-lowest), transparent)",
          opacity: 0.8,
        }}
      />

      {/* Main chat pane — grows to fill remaining space */}
      <ChatWindow
        availableVideos={availableVideos}
        messages={messages}
        setMessages={setMessages}
        isLoading={isAiLoading}
        setIsLoading={setIsAiLoading}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}

export default App;
