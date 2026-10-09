export interface VideoInfo {
  id: string;
  title: string;
  channel: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  originalUrl: string;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  durationFormatted: string;
  thumbnailUrl: string;
  fileUri: string; // Native permanent local file path (e.g. file:///.../tracks/id.mp3)
  createdAt: number;
}