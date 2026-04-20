// ─── API Response Types ────────────────────────────────────────────────────

export interface VideoInfo {
  video_id: string;
  title: string;
  channel_name: string;
}

export interface ListVideosResponse {
  total_videos: number;
  video_ids: VideoInfo[];
}

export interface IngestChannelPayload {
  channel_url: string;
  limit: number;
}

export interface IngestVideoPayload {
  video_url: string;
}

export interface IngestResponse {
  status: string;
  message: string;
  ingested_videos?: VideoInfo[];
}

export interface ClearDbResponse {
  status: string;
  message: string;
}

export interface AskPayload {
  question: string;
  video_id: string | null;
}

export interface AskResponse {
  answer: string;
  source_videos: string[];
}

// ─── App State Types ───────────────────────────────────────────────────────

export type Theme = 'light' | 'dark';

export type MessageRole = 'user' | 'ai';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sources?: string[];
  timestamp: Date;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
