import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '../types';
import { formatDuration } from '../utils/audio';

const TRACKS_METADATA_KEY = 'tunes_native_tracks_meta';

// Dynamically retrieve the current tracks directory in case iOS changed the sandbox container UUID
export const getTracksDir = (): string => `${FileSystem.documentDirectory}tracks/`;

// Ensure directory exists on device disk
const ensureDirectoryExists = async () => {
  const dir = getTracksDir();
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
};

// Normalize track path to always use the live documentDirectory container
const normalizeTrackPath = (track: Track): Track => {
  const fileName = `${track.id}.mp3`;
  const liveUri = `${getTracksDir()}${fileName}`;
  return {
    ...track,
    fileUri: liveUri,
    durationFormatted: track.duration && track.duration > 0 
      ? formatDuration(track.duration) 
      : track.durationFormatted || '--:--',
  };
};

export const saveTrack = async (track: Track): Promise<void> => {
  try {
    await ensureDirectoryExists();
    const existingTracks = await getAllTracks();
    const normalized = normalizeTrackPath(track);
    const updated = [normalized, ...existingTracks.filter((t) => t.id !== track.id)];
    await AsyncStorage.setItem(TRACKS_METADATA_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save track metadata:', err);
    throw err;
  }
};

export const getAllTracks = async (): Promise<Track[]> => {
  try {
    const raw = await AsyncStorage.getItem(TRACKS_METADATA_KEY);
    if (!raw) return [];
    const list: Track[] = JSON.parse(raw);
    
    // Always map tracks to the current app container path
    const resolvedTracks = list.map(normalizeTrackPath);
    return resolvedTracks.sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.error('Failed to fetch tracks:', err);
    return [];
  }
};

export const deleteTrack = async (id: string): Promise<void> => {
  try {
    const existingTracks = await getAllTracks();
    const trackToDelete = existingTracks.find((t) => t.id === id);

    // 1. Delete physical audio file from device disk
    const filePath = trackToDelete?.fileUri || getTrackFilePath(id);
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
    }

    // 2. Remove metadata from AsyncStorage
    const remaining = existingTracks.filter((t) => t.id !== id);
    await AsyncStorage.setItem(TRACKS_METADATA_KEY, JSON.stringify(remaining));

    // 3. Remove from favorites if present
    const favsRaw = await AsyncStorage.getItem('tunes_favorites');
    if (favsRaw) {
      const favs: string[] = JSON.parse(favsRaw);
      const updatedFavs = favs.filter((item) => item !== id);
      await AsyncStorage.setItem('tunes_favorites', JSON.stringify(updatedFavs));
    }
  } catch (err) {
    console.error('Failed to delete track:', err);
  }
};

export const getStorageStats = async (): Promise<{ totalBytes: number; formattedSize: string }> => {
  try {
    await ensureDirectoryExists();
    const tracksDir = getTracksDir();
    const files = await FileSystem.readDirectoryAsync(tracksDir);
    let totalBytes = 0;

    for (const fileName of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${tracksDir}${fileName}`);
      if (fileInfo.exists && !fileInfo.isDirectory) {
        totalBytes += fileInfo.size || 0;
      }
    }

    const formattedSize = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
    return { totalBytes, formattedSize };
  } catch {
    return { totalBytes: 0, formattedSize: '0.0 MB' };
  }
};

export const pruneStaleStorage = async (): Promise<{ freedBytes: number; prunedCount: number }> => {
  try {
    await ensureDirectoryExists();
    const tracks = await getAllTracks();
    const validFilePaths = new Set(tracks.map((t) => t.fileUri));
    const tracksDir = getTracksDir();

    const files = await FileSystem.readDirectoryAsync(tracksDir);
    let freedBytes = 0;
    let prunedCount = 0;

    for (const file of files) {
      const fullPath = `${tracksDir}${file}`;
      if (!validFilePaths.has(fullPath)) {
        const info = await FileSystem.getInfoAsync(fullPath);
        if (info.exists) {
          freedBytes += info.size || 0;
          await FileSystem.deleteAsync(fullPath, { idempotent: true });
          prunedCount++;
        }
      }
    }

    return { freedBytes, prunedCount };
  } catch {
    return { freedBytes: 0, prunedCount: 0 };
  }
};

export const getTrackFilePath = (trackId: string): string => {
  return `${getTracksDir()}${trackId}.mp3`;
};