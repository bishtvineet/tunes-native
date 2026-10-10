import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  Repeat1,
  ChevronDown,
  Music2,
} from 'lucide-react-native';
import type { Track } from '../types';
import type { RepeatMode } from '../hooks/useAudioPlayer';
import { formatDuration } from '../utils/audio';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCRUBBER_BAR_WIDTH = SCREEN_WIDTH - 48;

interface PlayerViewProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  playbackContext: 'All' | 'Favorite';
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleRepeat: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  repeatMode,
  playbackContext,
  onTogglePlay,
  onSeek,
  onNext,
  onPrev,
  onToggleRepeat,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Snake Wave Animation Loop
  const waveAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let waveLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      // Continuous ribbon crawl loop
      waveLoop = Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Undulating vertical sine wave bounce for snake head & ribbon crests
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

      waveLoop.start();
      pulseLoop.start();
    } else {
      waveAnim.setValue(0);
      pulseAnim.setValue(0);
    }

    return () => {
      waveLoop?.stop();
      pulseLoop?.stop();
    };
  }, [isPlaying, waveAnim, pulseAnim]);

  if (!currentTrack) return null;

  const totalDuration = duration || currentTrack.duration || 1;
  const progressPercent = Math.min(
    Math.max(0, (currentTime / totalDuration) * 100),
    100
  );

  const isRepeatActive = repeatMode !== 'off';

  // Wave ripple offset (moving left-to-right along the bar)
  const waveTranslateX = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  // Vertical wave ripple (crawling snake height effect)
  const snakeTranslateY = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-2.5, 2.5],
  });

  const snakeScaleY = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.4, 1],
  });

  return (
    <>
      {/* 1. Floating Mini Player Pill */}
      <View style={styles.floatingWrapper} pointerEvents="box-none">
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => setIsExpanded(true)}
          style={styles.floatingBar}
        >
          {/* Subtle bottom progress line with red snake lead */}
          <View style={styles.floatingProgressTrack}>
            <View
              style={[
                styles.floatingProgressFill,
                { width: `${progressPercent}%` },
              ]}
            >
              {isPlaying && (
                <Animated.View
                  style={[
                    styles.miniSnakeShimmer,
                    { transform: [{ translateX: waveTranslateX }] },
                  ]}
                />
              )}
            </View>
          </View>

          {/* Left Thumbnail & Info */}
          <View style={styles.miniTrackRow}>
            <View style={styles.miniThumbnailBox}>
              {currentTrack.thumbnailUrl ? (
                <Image
                  source={{ uri: currentTrack.thumbnailUrl }}
                  style={styles.miniThumbnail}
                />
              ) : (
                <Music2 size={16} color="#A855F7" />
              )}
            </View>

            <View style={styles.miniTextCol}>
              <Text style={styles.miniTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <View style={styles.miniSubRow}>
                <Text style={styles.miniArtist} numberOfLines={1}>
                  {currentTrack.artist}
                </Text>
                <Text style={styles.miniDot}>•</Text>
                <Text style={styles.miniContext}>From {playbackContext}</Text>
              </View>
            </View>
          </View>

          {/* Right Play/Pause Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              onTogglePlay();
            }}
            style={styles.miniPlayBtn}
          >
            {isPlaying ? (
              <Pause size={16} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Play
                size={16}
                color="#FFFFFF"
                fill="#FFFFFF"
                style={{ marginLeft: 2 }}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </View>

      {/* 2. Fullscreen Expanded Player Modal */}
      <Modal
        visible={isExpanded}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsExpanded(false)}
      >
        <View style={styles.modalContainer}>
          {/* Top Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => setIsExpanded(false)}
                style={styles.iconCircleBtn}
              >
                <ChevronDown size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.headerTitleBox}>
                <Text style={styles.headerBadge}>
                  PLAYING FROM {playbackContext.toUpperCase()}
                </Text>
                <Text style={styles.headerSubtitle}>Offline Playback</Text>
              </View>

              <TouchableOpacity
                onPress={onToggleRepeat}
                style={[
                  styles.iconCircleBtn,
                  isRepeatActive && styles.repeatActiveBtn,
                ]}
              >
                {repeatMode === 'one' ? (
                  <Repeat1
                    size={18}
                    color={isRepeatActive ? '#D8B4FE' : '#8F8A9F'}
                  />
                ) : (
                  <Repeat
                    size={18}
                    color={isRepeatActive ? '#D8B4FE' : '#8F8A9F'}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Large Artwork */}
          <View style={styles.centerSection}>
            <View style={styles.artworkBox}>
              {currentTrack.thumbnailUrl ? (
                <Image
                  source={{ uri: currentTrack.thumbnailUrl }}
                  style={styles.artworkImage}
                />
              ) : (
                <Music2 size={64} color="#A855F7" />
              )}
            </View>

            <View style={styles.trackDetailsBox}>
              <Text style={styles.fullTitle} numberOfLines={2}>
                {currentTrack.title}
              </Text>
              <Text style={styles.fullArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>
          </View>

          {/* Bottom Scrubber & Transport Controls */}
          <View style={styles.bottomSection}>
            {/* Scrubber Touch Bar with Animated Snake Wave */}
            <TouchableOpacity
              activeOpacity={1}
              style={styles.scrubberTouchArea}
              onPress={(e) => {
                const { locationX } = e.nativeEvent;
                const percent = Math.min(Math.max(0, locationX / SCRUBBER_BAR_WIDTH), 1);
                onSeek(Math.floor(percent * totalDuration));
              }}
            >
              <View style={styles.scrubberTrack}>
                {/* Active played segment */}
                <View
                  style={[
                    styles.scrubberFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: isPlaying ? '#EF4444' : '#FA2D48',
                    },
                  ]}
                >
                  {/* Flowing ribbon sine wave body */}
                  {isPlaying && (
                    <Animated.View
                      style={[
                        styles.snakeWaveSegment,
                        {
                          transform: [
                            { translateY: snakeTranslateY },
                            { scaleY: snakeScaleY },
                          ],
                        },
                      ]}
                    />
                  )}

                  {/* Flowing shimmer crawl inside ribbon */}
                  {isPlaying && (
                    <Animated.View
                      style={[
                        styles.waveShimmerGlow,
                        { transform: [{ translateX: waveTranslateX }] },
                      ]}
                    />
                  )}
                </View>

                {/* Animated Snake Head (Pip at current position) */}
                {progressPercent > 0 && (
                  <Animated.View
                    style={[
                      styles.snakeHeadPip,
                      {
                        left: `${progressPercent}%`,
                        transform: [
                          { translateX: -6 },
                          { translateY: isPlaying ? snakeTranslateY : 0 },
                        ],
                      },
                    ]}
                  />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
              <Text style={styles.timeText}>{formatDuration(totalDuration)}</Text>
            </View>

            {/* Transport Actions */}
            <View style={styles.transportRow}>
              <TouchableOpacity onPress={onPrev} style={styles.transportBtn}>
                <SkipBack size={28} color="#FFFFFF" fill="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onTogglePlay}
                style={styles.largePlayBtn}
              >
                {isPlaying ? (
                  <Pause size={30} color="#FFFFFF" fill="#FFFFFF" />
                ) : (
                  <Play
                    size={30}
                    color="#FFFFFF"
                    fill="#FFFFFF"
                    style={{ marginLeft: 3 }}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={onNext} style={styles.transportBtn}>
                <SkipForward size={28} color="#FFFFFF" fill="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 84,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 45,
  },
  floatingBar: {
    backgroundColor: '#181429',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  floatingProgressFill: {
    height: '100%',
    backgroundColor: '#FA2D48',
    position: 'relative',
    overflow: 'hidden',
  },
  miniSnakeShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: '#FF6B81',
    opacity: 0.8,
  },
  miniTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  miniThumbnailBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#241E38',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  miniThumbnail: {
    width: '100%',
    height: '100%',
  },
  miniTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  miniTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  miniSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  miniArtist: {
    color: '#8F8A9F',
    fontSize: 10,
    maxWidth: 120,
  },
  miniDot: {
    color: '#555066',
    fontSize: 8,
    marginHorizontal: 4,
  },
  miniContext: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '500',
  },
  miniPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Native iOS PageSheet Container */
  modalContainer: {
    flex: 1,
    backgroundColor: '#0B0914',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    alignItems: 'center',
    width: '100%',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatActiveBtn: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
    borderColor: 'rgba(147, 51, 234, 0.5)',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerBadge: {
    color: '#C084FC',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: '#8F8A9F',
    fontSize: 11,
    marginTop: 2,
  },
  centerSection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  artworkBox: {
    width: SCREEN_WIDTH - 96,
    height: SCREEN_WIDTH - 96,
    maxWidth: 280,
    maxHeight: 280,
    borderRadius: 28,
    backgroundColor: '#181427',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  trackDetailsBox: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fullTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  fullArtist: {
    color: 'rgba(216, 180, 254, 0.85)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomSection: {
    width: '100%',
  },
  scrubberTouchArea: {
    paddingVertical: 14,
  },
  scrubberTrack: {
    width: '100%',
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    justifyContent: 'center',
  },
  scrubberFill: {
    height: '100%',
    borderRadius: 2.5,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  snakeWaveSegment: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#DC2626',
    opacity: 0.85,
  },
  waveShimmerGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderRadius: 2,
  },
  snakeHeadPip: {
    position: 'absolute',
    top: -3.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeText: {
    color: '#8F8A9F',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    marginTop: 18,
  },
  transportBtn: {
    padding: 8,
  },
  largePlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 15,
  },
});