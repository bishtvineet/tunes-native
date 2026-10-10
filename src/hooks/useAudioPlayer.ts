import { useState, useRef, useEffect, useCallback } from 'react';
import {
  createAudioPlayer,
  AudioPlayer,
  setAudioModeAsync,
} from 'expo-audio';
import type { Track } from '../types';

export type RepeatMode = 'off' | 'all' | 'one';

export const useAudioPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');

  const [playbackContext, setPlaybackContext] = useState<'All' | 'Favorite'>('All');
  const activeQueueRef = useRef<Track[]>([]);

  const repeatModeRef = useRef<RepeatMode>('off');
  const currentTrackRef = useRef<Track | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Configure native iOS audio session once on mount with full background playback support
  useEffect(() => {
    const initAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          staysActiveInBackground: true,
          interruptionMode: 'doNotMix',
          shouldRouteThroughEarpiece: false,
        } as any);
      } catch (err) {
        console.warn('AudioMode initialization warning:', err);
      }
    };

    initAudio();

    return () => {
      if (playerRef.current) {
        try {
          if (typeof (playerRef.current as any).setActiveForLockScreen === 'function') {
            (playerRef.current as any).setActiveForLockScreen(false);
          }
          playerRef.current.release();
        } catch { }
      }
    };
  }, []);

  const nextTrackRef = useRef<() => void>(() => { });
  const prevTrackRef = useRef<() => void>(() => { });

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;

    if (isPlaying) {
      p.pause();
      setIsPlaying(false);
    } else {
      p.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seek = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;

    p.seekTo(seconds);
    setCurrentTime(seconds);
  }, []);

  const playTrack = useCallback(
    async (track: Track, context: 'All' | 'Favorite' = 'All', queue: Track[] = []) => {
      try {
        setPlaybackContext(context);
        if (queue.length > 0) {
          activeQueueRef.current = queue;
        }

        // Release prior native player instance
        if (playerRef.current) {
          try {
            if (typeof (playerRef.current as any).setActiveForLockScreen === 'function') {
              (playerRef.current as any).setActiveForLockScreen(false);
            }
            playerRef.current.release();
          } catch { }
          playerRef.current = null;
        }

        // Initialize AudioPlayer with update intervals for lock-screen scrubbers
        const newPlayer = createAudioPlayer(
          { uri: track.fileUri },
          { updateInterval: 1000 } as any
        );

        // Bind metadata and lock screen media options (Title, Artist, Artwork, Next/Prev)
        if (typeof (newPlayer as any).setActiveForLockScreen === 'function') {
          try {
            (newPlayer as any).setActiveForLockScreen(
              true,
              {
                title: track.title,
                artist: track.artist,
                artworkUrl: track.thumbnailUrl || undefined,
              },
              {
                showNextTrack: true,
                showPreviousTrack: true,
                showSeekForward: true,
                showSeekBackward: true,
              }
            );
          } catch {
            (newPlayer as any).setActiveForLockScreen(true);
          }
        }

        // Connect remote lock-screen actions if supported by native layer
        if (typeof (newPlayer as any).addListener === 'function') {
          try {
            (newPlayer as any).addListener('onRemoteNextTrack', () => {
              nextTrackRef.current();
            });
            (newPlayer as any).addListener('onRemotePreviousTrack', () => {
              prevTrackRef.current();
            });
          } catch { }
        }

        newPlayer.addListener('playbackStatusUpdate', (status) => {
          setIsPlaying(Boolean(status.playing));
          setCurrentTime(Math.floor(status.currentTime || 0));
          
          const trackDuration = Math.floor(status.duration || 0);
          if (trackDuration > 0) {
            setDuration(trackDuration);
          }

          if (status.didJustFinish) {
            const mode = repeatModeRef.current;
            if (mode === 'one') {
              newPlayer.seekTo(0);
              newPlayer.play();
            } else if (mode === 'all') {
              nextTrackRef.current();
            } else {
              setIsPlaying(false);
              newPlayer.seekTo(0);
            }
          }
        });

        playerRef.current = newPlayer;
        setCurrentTrack(track);
        currentTrackRef.current = track;

        // If track duration was already known, initialize it
        if (track.duration && track.duration > 0) {
          setDuration(track.duration);
        }

        newPlayer.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Failed to load and play track with expo-audio:', err);
      }
    },
    []
  );

  const nextTrack = useCallback(() => {
    const queue = activeQueueRef.current;
    const track = currentTrackRef.current;
    if (!queue.length || !track) return;

    const currentIndex = queue.findIndex((t) => t.id === track.id);
    if (currentIndex === -1) return;

    if (currentIndex < queue.length - 1) {
      playTrack(queue[currentIndex + 1], playbackContext, queue);
    } else {
      playTrack(queue[0], playbackContext, queue);
    }
  }, [playbackContext, playTrack]);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  const prevTrack = useCallback(() => {
    const queue = activeQueueRef.current;
    const track = currentTrackRef.current;
    const p = playerRef.current;
    if (!queue.length || !track) return;

    if (p && currentTime > 3) {
      p.seekTo(0);
      setCurrentTime(0);
      return;
    }

    const currentIndex = queue.findIndex((t) => t.id === track.id);
    if (currentIndex > 0) {
      playTrack(queue[currentIndex - 1], playbackContext, queue);
    } else {
      playTrack(queue[queue.length - 1], playbackContext, queue);
    }
  }, [playbackContext, playTrack, currentTime]);

  useEffect(() => {
    prevTrackRef.current = prevTrack;
  }, [prevTrack]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      let next: RepeatMode = 'off';
      if (prev === 'off') next = 'all';
      else if (prev === 'all') next = 'one';
      else next = 'off';
      repeatModeRef.current = next;
      return next;
    });
  }, []);

  const stopTrack = useCallback(() => {
    if (playerRef.current) {
      try {
        if (typeof (playerRef.current as any).setActiveForLockScreen === 'function') {
          (playerRef.current as any).setActiveForLockScreen(false);
        }
        playerRef.current.pause();
        playerRef.current.release();
      } catch { }
      playerRef.current = null;
    }
    setCurrentTrack(null);
    currentTrackRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const updatePlaybackContext = useCallback(
    (context: 'All' | 'Favorite', queue: Track[]) => {
      setPlaybackContext(context);
      activeQueueRef.current = queue;
    },
    []
  );

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    repeatMode,
    playbackContext,
    playTrack,
    togglePlay,
    seek,
    nextTrack,
    prevTrack,
    toggleRepeat,
    stopTrack,
    updatePlaybackContext,
  };
};