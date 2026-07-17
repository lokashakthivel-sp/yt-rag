import {
  ListVideosResponse,
  IngestChannelPayload,
  IngestVideoPayload,
  IngestResponse,
  ClearDbResponse,
  AskPayload,
  AskResponse,
} from '../types';

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    let errorMsg = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.detail) errorMsg = body.detail;
      else if (body.message) errorMsg = body.message;
    } catch { /* ignore parse errors */ }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

// ─── Endpoints ────────────────────────────────────────────────────────────

export const listVideos = (): Promise<ListVideosResponse> =>
  request<ListVideosResponse>('/list-videos');

export const ingestChannel = (payload: IngestChannelPayload): Promise<IngestResponse> =>
  request<IngestResponse>('/ingest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const ingestVideo = (payload: IngestVideoPayload): Promise<IngestResponse> =>
  request<IngestResponse>('/ingest-video', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const clearDb = (): Promise<ClearDbResponse> =>
  request<ClearDbResponse>('/clear-db', { method: 'DELETE' });

export const askQuestion = (payload: AskPayload): Promise<AskResponse> =>
  request<AskResponse>('/ask', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
