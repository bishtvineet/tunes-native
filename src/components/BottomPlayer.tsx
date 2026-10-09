import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Pause, SkipForward, SkipBack, Music2 } from 'lucide-react-native';
import type { Track } from '../types';
import { formatDuration } from '../utils/audio';

interface BottomPlayerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onPress?: () => void;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onPress,
}) => {
  if (!currentTrack) return null;

  const totalDuration = duration || currentTrack.duration || 1;
  const progressPercent = Math.min(Math.max(0, (currentTime / totalDuration) * 100), 100);

  return (
    <View style={styles.container}>
      {/* Mini Progress scrubber line */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.progressBarBackground}
        onPress={(e) => {
          const { locationX } = e.nativeEvent;
          onSeek(Math.floor((locationX / 360) * totalDuration));
        }}
      >
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={styles.contentRow}
      >
        {/* Track Thumbnail & Title */}
        <View style={styles.trackInfo}>
          {currentTrack.thumbnailUrl ? (
            <Image
              source={{ uri: currentTrack.thumbnailUrl }}
              style={styles.thumbnail}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Music2 size={20} color="#A855F7" />
            </View>
          )}

          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {currentTrack.artist} • {formatDuration(currentTime)} / {currentTrack.durationFormatted}
            </Text>
          </View>
        </View>

        {/* Playback Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            style={styles.iconButton}
          >
            <SkipBack size={20} color="#D4D4D8" fill="#D4D4D8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            style={styles.playButton}
          >
            {isPlaying ? (
              <Pause size={18} color="#000000" fill="#000000" />
            ) : (
              <Play size={18} color="#000000" fill="#000000" style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onNext();
            }}
            style={styles.iconButton}
          >
            <SkipForward size={20} color="#D4D4D8" fill="#D4D4D8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(19, 17, 28, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 20,
    zIndex: 50,
  },
  progressBarBackground: {
    width: '100%',
    height: 3,
    backgroundColor: '#27272A',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EC4899',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1E1A2E',
  },
  thumbnailPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#1E1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    color: '#9894AB',
    fontSize: 11,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    padding: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});