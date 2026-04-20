import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Youtube } from 'lucide-react';
import { Message, VideoInfo } from '../types';

interface MessageBubbleProps {
  message: Message;
  availableVideos: VideoInfo[];
}

// Maps a source video_id → human-readable title (falls back to the ID itself)
function resolveTitle(videoId: string, videos: VideoInfo[]): string {
  const found = videos.find(v => v.video_id === videoId);
  return found ? found.title : videoId;
}

// Truncate long titles for the chip label
function truncate(str: string, max = 42): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// Format timestamp
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const SkeletonDots: React.FC = () => (
  <div className="flex items-center gap-1.5 py-1">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="block w-2 h-2 rounded-full"
        style={{
          backgroundColor: 'var(--primary)',
          animation: `pulseSoft 1.4s ease-in-out ${i * 0.2}s infinite`,
        }}
      />
    ))}
  </div>
);

export const ThinkingBubble: React.FC = () => (
  <div className="flex items-start gap-3 animate-fade-in">
    {/* Avatar */}
    <div
      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center neu-raised-sm"
      style={{ backgroundColor: 'var(--surface-container)' }}
    >
      <Bot size={15} style={{ color: 'var(--primary)' }} />
    </div>

    {/* Bubble */}
    <div
      className="rounded-2xl rounded-tl-sm px-4 py-3 neu-well-sm"
      style={{ backgroundColor: 'var(--surface-container)' }}
    >
      <SkeletonDots />
    </div>
  </div>
);

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, availableVideos }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-3 animate-slide-up">
        {/* Bubble */}
        <div className="max-w-[72%] flex flex-col items-end gap-1">
          <div
            className="px-4 py-3 rounded-2xl rounded-br-sm btn-primary"
            style={{ maxWidth: '100%' }}
          >
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--on-primary)', fontFamily: 'Inter, sans-serif' }}
            >
              {message.content}
            </p>
          </div>
          <span className="text-xs pr-1" style={{ color: 'var(--on-surface-faint)' }}>
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center neu-raised-sm"
          style={{ backgroundColor: 'var(--surface-container)' }}
        >
          <User size={15} style={{ color: 'var(--on-surface-muted)' }} />
        </div>
      </div>
    );
  }

  // ── AI Bubble ──────────────────────────────────────────────────
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center neu-raised-sm"
        style={{ backgroundColor: 'var(--surface-container)' }}
      >
        <Bot size={15} style={{ color: 'var(--primary)' }} />
      </div>

      {/* Content column */}
      <div className="max-w-[78%] flex flex-col gap-2">
        {/* Main bubble */}
        <div
          className="px-5 py-4 rounded-2xl rounded-tl-sm neu-well-sm"
          style={{ backgroundColor: 'var(--surface-container)' }}
        >
          <div className="ai-prose text-sm">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Source chips */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-1">
            {message.sources.map((sourceId, idx) => {
              const title = resolveTitle(sourceId, availableVideos);
              return (
                <a
                  key={idx}
                  href={`https://www.youtube.com/watch?v=${sourceId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={title}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                             transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    backgroundColor: 'var(--surface-container)',
                    color: 'var(--primary)',
                    boxShadow: 'var(--neu-xs)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <Youtube size={11} className="flex-shrink-0 opacity-70 group-hover:opacity-100" />
                  <span>{truncate(title, 38)}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs pl-1" style={{ color: 'var(--on-surface-faint)' }}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
