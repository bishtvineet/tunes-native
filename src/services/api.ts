import * as FileSystem from 'expo-file-system/legacy';
import type { VideoInfo, Track } from '../types';
import { getApiConfig, getRenderUrl } from './network';
import { getTrackFilePath } from './storage';
import { createAudioPlayer } from 'expo-audio';

export interface ProgressCallbackData {
  percent: number; // 0 to 100, or -1 when indeterminate
  receivedBytes: number;
  totalBytes: number;
  statusText: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const safeDecode = (str: string | null): string => {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0 || isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const checkHealth = async (customBaseUrl?: string): Promise<boolean> => {
  const { baseUrl } = getApiConfig();
  const targetUrl = customBaseUrl || baseUrl;

  try {
    const res = await fetch(`${targetUrl}/health`, { method: 'GET' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
};

export const pingRenderHealth = async (): Promise<{ ok: boolean; timeMs: number }> => {
  const renderUrl = getRenderUrl();
  const startTime = Date.now();

  try {
    const res = await fetch(`${renderUrl}/health`, { method: 'GET' });
    const timeMs = Date.now() - startTime;
    if (!res.ok) return { ok: false, timeMs };
    const data = await res.json();
    return { ok: data?.status === 'ok', timeMs };
  } catch {
    const timeMs = Date.now() - startTime;
    return { ok: false, timeMs };
  }
};

export const fetchVideoInfo = async (url: string): Promise<VideoInfo> => {
  const { baseUrl, networkMode } = getApiConfig();

  const res = await fetch(`${baseUrl}/converter/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, networkMode }),
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Received non-JSON response from backend (${baseUrl})`);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || `Failed to fetch preview: ${res.statusText}`);
  }

  return await res.json();
};

export const downloadAudioStream = async (
  url: string,
  previewFallback?: VideoInfo | null,
  onProgress?: (progress: ProgressCallbackData) => void,
  maxRetries = 3,
  retryDelayMs = 2000
): Promise<Track> => {
  let attempt = 0;
  const { baseUrl, networkMode } = getApiConfig();

  while (attempt < maxRetries) {
    attempt++;

    try {
      if (attempt > 1 && onProgress) {
        onProgress({
          percent: 0,
          receivedBytes: 0,
          totalBytes: 0,
          statusText: `Retrying download (Attempt ${attempt}/${maxRetries})...`,
        });
      }

      onProgress?.({
        percent: 0,
        receivedBytes: 0,
        totalBytes: 0,
        statusText: 'Connecting to audio stream...',
      });

      // 1. Send the POST request to your NestJS backend
      const res = await fetch(`${baseUrl}/converter/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          networkMode,
          id: previewFallback?.id,
          title: previewFallback?.title,
          channel: previewFallback?.channel,
          thumbnail: previewFallback?.thumbnail,
          duration: previewFallback?.duration,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      // Extract metadata headers
      const rawTitle = res.headers.get('X-Audio-Title');
      const rawArtist = res.headers.get('X-Audio-Artist');
      const rawThumb = res.headers.get('X-Audio-Thumbnail');

      const title = previewFallback?.title || safeDecode(rawTitle) || 'Unknown Title';
      const artist = previewFallback?.channel || safeDecode(rawArtist) || 'Unknown Artist';
      const thumbnailUrl = previewFallback?.thumbnail || rawThumb || '';
      let duration = previewFallback?.duration || Number(res.headers.get('X-Audio-Duration')) || 0;
      const id = previewFallback?.id || res.headers.get('X-Audio-Id') || `track_${Date.now()}`;

      const targetFilePath = getTrackFilePath(id);

      onProgress?.({
        percent: 50,
        receivedBytes: 0,
        totalBytes: 0,
        statusText: 'Writing track to device storage...',
      });

      // 2. Read arrayBuffer and write directly to disk as Base64 (native file storage)
      const arrayBuffer = await res.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Fast binary to base64 conversion
      let binaryString = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        binaryString += String.fromCharCode.apply(
          null,
          Array.from(uint8Array.subarray(i, i + chunkSize))
        );
      }
      const base64Data = btoa(binaryString);

      await FileSystem.writeAsStringAsync(targetFilePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      onProgress?.({
        percent: 100,
        receivedBytes: uint8Array.length,
        totalBytes: uint8Array.length,
        statusText: 'Saved offline!',
      });
      if (!duration || duration <= 0) {
        duration = await getAudioDurationFromUri(targetFilePath);
      }
      
      return {
        id,
        title,
        artist,
        duration,
        durationFormatted: formatDuration(duration),
        thumbnailUrl,
        fileUri: targetFilePath,
        createdAt: Date.now(),
      };
    } catch (err: unknown) {
      console.warn(`Download attempt ${attempt} failed:`, err);

      if (attempt >= maxRetries) {
        const msg = err instanceof Error ? err.message : 'Network error';
        throw new Error(`Download failed after ${maxRetries} attempts: ${msg}`);
      }

      if (onProgress) {
        onProgress({
          percent: 0,
          receivedBytes: 0,
          totalBytes: 0,
          statusText: `Connection dropped. Retrying in ${retryDelayMs / 1000}s...`,
        });
      }

      await sleep(retryDelayMs);
    }
  }

  throw new Error('Download terminated unexpectedly');
};

export const syncCookiesToBackend = async (
  cookieText: string
): Promise<{ success: boolean; message: string; byteCount: number }> => {
  const { baseUrl } = getApiConfig();

  const res = await fetch(`${baseUrl}/converter/cookies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookies: cookieText.trim() }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Failed to update cookies on server.');
  }

  return await res.json();
};
/**
 * Native duration resolver for iOS using expo-audio.
 * Inspects the downloaded audio file directly without playing sound.
 */
export const getAudioDurationFromUri = (uri: string): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const tempPlayer = createAudioPlayer({ uri });
      let resolved = false;

      const cleanup = (durationVal: number) => {
        if (resolved) return;
        resolved = true;
        try {
          tempPlayer.release();
        } catch {}
        resolve(durationVal > 0 ? Math.round(durationVal) : 0);
      };

      // Timeout safety: if metadata isn't ready in 3.5s, resolve 0
      const timer = setTimeout(() => {
        cleanup(tempPlayer.duration || 0);
      }, 3500);

      // Check if duration is immediately available on creation
      if (tempPlayer.duration && tempPlayer.duration > 0) {
        clearTimeout(timer);
        cleanup(tempPlayer.duration);
        return;
      }

      // Listen for the first status update containing duration
      tempPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.duration && status.duration > 0) {
          clearTimeout(timer);
          cleanup(status.duration);
        }
      });
    } catch {
      resolve(0);
    }
  });
};