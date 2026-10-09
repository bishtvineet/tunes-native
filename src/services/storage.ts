import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '../types';

const TRACKS_METADATA_KEY = 'tunes_native_tracks_meta';
const TRACKS_DIR = `${FileSystem.documentDirectory}tracks/`;

// Ensure directory exists on device disk
const ensureDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(TRACKS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(TRACKS_DIR, { intermediates: true });
  }
};

export const saveTrack = async (track: Track): Promise<void> => {
  try {
    await ensureDirectoryExists();
    const existingTracks = await getAllTracks();
    const updated = [track, ...existingTracks.filter((t) => t.id !== track.id)];
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
    return list.sort((a, b) => b.createdAt - a.createdAt);
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
    if (trackToDelete && trackToDelete.fileUri) {
      const fileInfo = await FileSystem.getInfoAsync(trackToDelete.fileUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(trackToDelete.fileUri, { idempotent: true });
      }
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
    const files = await FileSystem.readDirectoryAsync(TRACKS_DIR);
    let totalBytes = 0;

    for (const fileName of files) {
      const fileInfo = await FileSystem.getInfoAsync(`${TRACKS_DIR}${fileName}`);
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

    const files = await FileSystem.readDirectoryAsync(TRACKS_DIR);
    let freedBytes = 0;
    let prunedCount = 0;

    for (const file of files) {
      const fullPath = `${TRACKS_DIR}${file}`;
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
  return `${TRACKS_DIR}${trackId}.mp3`;
};