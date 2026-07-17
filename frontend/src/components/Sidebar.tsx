import React, { useState, useRef } from "react";
import {
  Youtube,
  Layers,
  Plus,
  Link,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  Database,
  RefreshCw,
} from "lucide-react";
import { VideoInfo } from "../types";
import { ingestVideo, ingestChannel, clearDb } from "../api/client";

interface SidebarProps {
  availableVideos: VideoInfo[];
  onVideosChange: () => Promise<void>;
  onClearVideos: () => void;
  isLoading: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

type FeedbackState = { type: "success" | "error"; message: string } | null;

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <p
    className="text-xs font-semibold uppercase tracking-widest mb-2"
    style={{
      color: "var(--on-surface-muted)",
      fontFamily: "Manrope, sans-serif",
    }}
  >
    {children}
  </p>
);

const FeedbackBanner: React.FC<{ state: FeedbackState }> = ({ state }) => {
  if (!state) return null;
  const isError = state.type === "error";
  return (
    <div
      className="toast-enter flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs leading-snug"
      style={{
        backgroundColor: isError
          ? "rgba(239,68,68,0.1)"
          : "rgba(34,197,94,0.1)",
        color: isError ? "var(--tertiary)" : "#16a34a",
        boxShadow: "var(--neu-inset-xs)",
      }}
    >
      {isError ? (
        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
      ) : (
        <CheckCircle size={13} className="flex-shrink-0 mt-0.5" />
      )}
      <span>{state.message}</span>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  availableVideos,
  onVideosChange,
  onClearVideos,
  isLoading,
}) => {
  // Single video form
  const [videoUrl, setVideoUrl] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoFeedback, setVideoFeedback] = useState<FeedbackState>(null);

  // Channel form
  const [channelUrl, setChannelUrl] = useState("");
  const [channelLimit, setChannelLimit] = useState(10);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelFeedback, setChannelFeedback] = useState<FeedbackState>(null);

  // Clear DB
  const [clearLoading, setClearLoading] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (
    setter: React.Dispatch<React.SetStateAction<FeedbackState>>,
    type: "success" | "error",
    message: string,
  ) => {
    setter({ type, message });
    setTimeout(() => setter(null), 5000);
  };

  // ── Ingest single video ──────────────────────────────────────
  const handleIngestVideo = async () => {
    if (!videoUrl.trim()) return;
    setVideoLoading(true);
    setVideoFeedback(null);
    try {
      const res = await ingestVideo({ video_url: videoUrl.trim() });
      showFeedback(
        setVideoFeedback,
        "success",
        res.message || "Video ingested successfully.",
      );
      setVideoUrl("");
      await onVideosChange();
    } catch (err) {
      showFeedback(setVideoFeedback, "error", (err as Error).message);
    } finally {
      setVideoLoading(false);
    }
  };

  // ── Ingest channel ───────────────────────────────────────────
  const handleIngestChannel = async () => {
    if (!channelUrl.trim()) return;
    setChannelLoading(true);
    setChannelFeedback(null);
    try {
      const res = await ingestChannel({
        channel_url: channelUrl.trim(),
        limit: channelLimit,
      });
      const count = res.ingested_videos?.length ?? 0;
      showFeedback(
        setChannelFeedback,
        "success",
        res.message || `Ingested ${count} video${count !== 1 ? "s" : ""}.`,
      );
      setChannelUrl("");
      await onVideosChange();
    } catch (err) {
      showFeedback(setChannelFeedback, "error", (err as Error).message);
    } finally {
      setChannelLoading(false);
    }
  };

  // ── Clear DB ─────────────────────────────────────────────────
  const handleClearDb = async () => {
    if (!confirmClear) {
      // First click → arm the button, auto-disarm after 4 s
      setConfirmClear(true);
      confirmTimerRef.current = setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    // Second click → execute
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    setConfirmClear(false);
    setClearLoading(true);
    try {
      await clearDb();
      onClearVideos();
    } catch (err) {
      console.error(err);
    } finally {
      setClearLoading(false);
    }
  };

  return (
    <aside
      className="flex flex-col h-full w-[27%] flex-shrink-0 p-5 gap-5 overflow-hidden"
      style={{ backgroundColor: "var(--surface)" }}
    >
      {/* ── Logo ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-1 pb-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center neu-raised-sm flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)",
          }}
        >
          <Youtube size={17} color="#fff" />
        </div>
        <div>
          <h1
            className="text-base font-extrabold leading-none tracking-editorial"
            style={{
              fontFamily: "Manrope, sans-serif",
              color: "var(--on-surface)",
            }}
          >
            Youtube RAG
          </h1>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--on-surface-faint)" }}
          >
            Ask questions about Youtube videos
          </p>
        </div>
      </div>

      {/* ── Main scrollable area ────────────────────────── */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto p-2.5">
        {/* ── Add Single Video ────────────────────────────── */}
        <section
          className="rounded-2xl p-3 flex flex-col gap-2 neu-raised-sm flex-shrink-0"
          style={{ backgroundColor: "var(--surface-container)" }}
        >
          <SectionLabel>
            <span className="flex items-center gap-1.5">
              <Link size={10} />
              Add Single Video
            </span>
          </SectionLabel>

          <input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleIngestVideo()}
            className="neu-input w-full px-3.5 py-2.5 rounded-xl text-sm"
          />

          <button
            onClick={handleIngestVideo}
            disabled={videoLoading || !videoUrl.trim()}
            className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full"
          >
            {videoLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            {videoLoading ? "Ingesting…" : "Ingest Video"}
          </button>

          <FeedbackBanner state={videoFeedback} />
        </section>

        {/* ── Add Channel ─────────────────────────────────── */}
        <section
          className="rounded-2xl p-3 flex flex-col gap-2 neu-raised-sm flex-shrink-0"
          style={{ backgroundColor: "var(--surface-container)" }}
        >
          <SectionLabel>
            <span className="flex items-center gap-1.5">
              <Layers size={10} />
              Add Channel
            </span>
          </SectionLabel>

          <input
            type="url"
            placeholder="https://youtube.com/@channel"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            className="neu-input w-full px-3.5 py-2.5 rounded-xl text-sm"
          />

          {/* Limit stepper */}
          <div className="flex items-center gap-2">
            <label
              className="text-xs flex-shrink-0"
              style={{
                color: "var(--on-surface-muted)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Video limit
            </label>
            <div
              className="flex items-center rounded-lg overflow-hidden flex-1 neu-well-xs"
              style={{ backgroundColor: "var(--surface-low)" }}
            >
              <button
                onClick={() => setChannelLimit((l) => Math.max(1, l - 1))}
                className="px-3 py-1.5 text-sm transition-colors hover:text-primary"
                style={{ color: "var(--on-surface-muted)" }}
              >
                -
              </button>
              <span
                className="flex-1 text-center text-sm font-semibold"
                style={{
                  color: "var(--on-surface)",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                {channelLimit}
              </span>
              <button
                onClick={() => setChannelLimit((l) => Math.min(50, l + 1))}
                className="px-3 py-1.5 text-sm transition-colors hover:text-primary"
                style={{ color: "var(--on-surface-muted)" }}
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={handleIngestChannel}
            disabled={channelLoading || !channelUrl.trim()}
            className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold w-full"
          >
            {channelLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Layers size={14} />
            )}
            {channelLoading ? "Ingesting…" : "Ingest Channel"}
          </button>

          <FeedbackBanner state={channelFeedback} />
        </section>

        {/* ── Knowledge Base ──────────────────────────────── */}
        <section
          className="rounded-2xl p-4 flex flex-col gap-3 neu-raised-sm flex-1 min-h-0"
          style={{ backgroundColor: "var(--surface-container)" }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between">
            <SectionLabel>
              <span className="flex items-center gap-1.5">
                <Database size={10} />
                Memory
              </span>
            </SectionLabel>

            <div className="flex items-center gap-2 -mt-3">
              {/* Video count badge */}
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold neu-raised-sm"
                style={{
                  backgroundColor: "var(--surface-high)",
                  color: "var(--primary)",
                  fontFamily: "Manrope, sans-serif",
                }}
              >
                {availableVideos.length}
              </span>
              {/* Refresh button */}
              <button
                onClick={onVideosChange}
                disabled={isLoading}
                className="p-1.5 rounded-lg transition-opacity hover:opacity-80"
                title="Refresh list"
              >
                <RefreshCw
                  size={12}
                  style={{ color: "var(--on-surface-faint)" }}
                  className={isLoading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 rounded-xl overflow-y-auto min-h-[100px] [scrollbar-width:none] neu-well-xs">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="skeleton h-3 rounded-full w-full" />
                    <div className="skeleton h-2.5 rounded-full w-2/3" />
                  </div>
                ))}
              </div>
            ) : availableVideos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 py-6 text-center">
                <Database
                  size={22}
                  style={{ color: "var(--on-surface-faint)", opacity: 0.5 }}
                />
                <p
                  className="text-xs"
                  style={{ color: "var(--on-surface-faint)" }}
                >
                  No videos ingested yet.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {availableVideos.map((video) => (
                  <li
                    key={video.video_id}
                    className="group flex items-start gap-2.5 px-3 py-2.5 rounded-lg cursor-default"
                  >
                    {/* <ChevronRight
                      size={12}
                      className="flex-shrink-0 mt-0.5 opacity-30 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--primary)' }}
                    /> */}
                    <div className="min-w-0">
                      <p
                        className="text-xs font-medium leading-snug line-clamp-2"
                        style={{
                          color: "var(--on-surface-muted)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {video.title}
                      </p>
                      <p
                        className="text-xs mt-0.5 truncate"
                        style={{ color: "var(--on-surface-faint)" }}
                      >
                        {video.channel_name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* ── Danger Zone ──────────────────────────────────── */}
      <div
        className="pt-4 border-t"
        style={{
          borderColor: "transparent",
          boxShadow:
            "inset 0 1px 0 rgba(var(--on-surface-rgb, 30,37,53), 0.07)",
        }}
      >
        <button
          onClick={handleClearDb}
          disabled={clearLoading}
          className="btn-danger flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          {clearLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} />
          )}
          {confirmClear
            ? "Click again to confirm"
            : clearLoading
              ? "Clearing…"
              : "Clear Knowledge Base"}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
