import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { MUSIC_QUOTES } from '../utils/user';
import type { SplashConfig } from './ImageAdjustModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
  backgroundConfig?: SplashConfig | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  backgroundConfig,
}) => {
  const [quote] = useState(() => {
    const idx = Math.floor(Math.random() * MUSIC_QUOTES.length);
    return MUSIC_QUOTES[idx];
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const quoteFadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // 1. Initial fade-in & scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Quote reveals at 600ms
    const quoteTimer = setTimeout(() => {
      Animated.timing(quoteFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 600);

    // 3. Shatter & dissolve fade-out at 2800ms
    const shatterTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2800);

    // 4. Complete transition at 3400ms
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3400);

    return () => {
      clearTimeout(quoteTimer);
      clearTimeout(shatterTimer);
      clearTimeout(finishTimer);
    };
  }, [fadeAnim, quoteFadeAnim, scaleAnim, onFinish]);

  const laviChars = ['L', 'A', 'V', 'I'];
  const creationLetters = ['C', 'R', 'E', 'A', 'T', 'I', 'O', 'N'];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* 1. Custom User Background or Deep Canvas Base */}
      {backgroundConfig?.image ? (
        <View style={StyleSheet.absoluteFill}>
          {/* Ambient blurred base */}
          <Image
            source={{ uri: backgroundConfig.image }}
            blurRadius={30}
            style={styles.ambientBgImage}
          />
          {/* Uncropped calibrated photo */}
          <View style={styles.centerBgWrapper}>
            <Image
              source={{ uri: backgroundConfig.image }}
              style={[
                styles.customBgPhoto,
                {
                  transform: [
                    { translateX: backgroundConfig.offsetX * 2 },
                    { translateY: backgroundConfig.offsetY * 2 },
                    { scale: backgroundConfig.scale },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>
          <View style={styles.vignetteOverlay} />
        </View>
      ) : (
        <View style={styles.defaultCanvasBg} />
      )}

      {/* 2. Ambient Pulsing Rings */}
      <View style={styles.ambientRingsContainer} pointerEvents="none">
        <View style={styles.ringOuter} />
        <View style={styles.ringInner} />
      </View>

      {/* 3. Center Hero: LAVI CREATION */}
      <View style={styles.heroCenter} pointerEvents="none">
        <View style={styles.laviRow}>
          {laviChars.map((char, i) => (
            <Text key={i} style={styles.laviChar}>
              {char}
            </Text>
          ))}
        </View>

        {/* Embossed CREATION Glass Pill */}
        <View style={styles.creationPill}>
          <View style={styles.creationLettersRow}>
            {creationLetters.map((char, idx) => (
              <Text key={idx} style={styles.creationChar}>
                {char}
              </Text>
            ))}
          </View>
        </View>

        {/* Spectrum Equalizer Bars */}
        <View style={styles.equalizerRow}>
          <View style={[styles.eqBar, { height: 12, backgroundColor: '#EF4444' }]} />
          <View style={[styles.eqBar, { height: 20, backgroundColor: '#A855F7' }]} />
          <View style={[styles.eqBar, { height: 28, backgroundColor: '#EC4899' }]} />
          <View style={[styles.eqBar, { height: 16, backgroundColor: '#A855F7' }]} />
          <View style={[styles.eqBar, { height: 8, backgroundColor: '#EF4444' }]} />
        </View>
      </View>

      {/* 4. Independent Quote Layer */}
      <Animated.View
        style={[
          styles.quoteContainer,
          {
            opacity: quoteFadeAnim,
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.quoteCard}>
          <Text style={styles.quoteQuoteSign}>“</Text>
          <Text style={styles.quoteText}>"{quote.text}"</Text>
          <View style={styles.quoteFooter}>
            <View style={styles.authorBadge}>
              <View style={styles.authorDot} />
              <Text style={styles.authorText}>{quote.author}</Text>
            </View>
            <View style={styles.miniEqRow}>
              <View style={[styles.miniEqBar, { height: 8, backgroundColor: '#C084FC' }]} />
              <View style={[styles.miniEqBar, { height: 14, backgroundColor: '#F472B6' }]} />
              <View style={[styles.miniEqBar, { height: 10, backgroundColor: '#EF4444' }]} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: '#06040A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultCanvasBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#06040A',
  },
  ambientBgImage: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  centerBgWrapper: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customBgPhoto: {
    width: '100%',
    height: '100%',
    opacity: 0.55,
  },
  vignetteOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 4, 10, 0.45)',
  },
  ambientRingsContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    position: 'absolute',
  },
  ringInner: {
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    position: 'absolute',
  },
  heroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  laviRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  laviChar: {
    fontSize: 52,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 2,
    textShadowColor: 'rgba(220, 38, 38, 0.6)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  creationPill: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  creationLettersRow: {
    flexDirection: 'row',
    gap: 4,
  },
  creationChar: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 4,
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 22,
  },
  eqBar: {
    width: 5,
    borderRadius: 2.5,
  },
  quoteContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 28,
    left: 20,
    right: 20,
  },
  quoteCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteQuoteSign: {
    position: 'absolute',
    top: -10,
    left: 10,
    fontSize: 54,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    color: 'rgba(255, 255, 255, 0.1)',
  },
  quoteText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 19,
    letterSpacing: 0.2,
  },
  quoteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  authorText: {
    color: '#B5AFCE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  miniEqRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  miniEqBar: {
    width: 2,
    borderRadius: 1,
  },
});