import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import {
  ZoomIn,
  MoveHorizontal,
  MoveVertical,
  Check,
  X,
  RotateCcw,
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SplashConfig {
  image: string;
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface ImageAdjustModalProps {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (config: SplashConfig) => void;
}

export const ImageAdjustModal: React.FC<ImageAdjustModalProps> = ({
  imageSrc,
  onCancel,
  onConfirm,
}) => {
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0); // -50% to 50%
  const [offsetY, setOffsetY] = useState(0); // -50% to 50%

  const handleReset = () => {
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const handleApply = () => {
    onConfirm({
      image: imageSrc,
      scale,
      offsetX,
      offsetY,
    });
  };

  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={false}
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Adjust Splash Photo</Text>
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.8}
            style={styles.closeBtn}
          >
            <X size={16} color="rgba(255, 255, 255, 0.8)" />
          </TouchableOpacity>
        </View>

        {/* Frame Preview: Matches mobile splash screen aspect ratio */}
        <View style={styles.previewFrame}>
          {/* Layer 1: Ambient Background */}
          <Image
            source={{ uri: imageSrc }}
            blurRadius={20}
            style={styles.ambientBackground}
          />

          {/* Layer 2: Positioned & Scaled Photo */}
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageSrc }}
              style={[
                styles.mainPreviewImage,
                {
                  transform: [
                    { translateX: offsetX * 2 },
                    { translateY: offsetY * 2 },
                    { scale },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Watermark Overlay Guide */}
          <View style={styles.watermarkGuide} pointerEvents="none">
            <Text style={styles.watermarkText}>LAVI CREATION</Text>
            <View style={styles.watermarkLine} />
          </View>
        </View>

        {/* Sliders & Step Adjustments Card */}
        <View style={styles.controlsCard}>
          <View style={styles.controlsHeader}>
            <Text style={styles.controlsTitle}>Full Photo Positioning</Text>
            <TouchableOpacity
              onPress={handleReset}
              style={styles.resetBtn}
            >
              <RotateCcw size={12} color="#D8B4FE" />
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* 1. Zoom Control */}
          <View style={styles.controlRow}>
            <ZoomIn size={16} color="#C084FC" />
            <Text style={styles.controlLabel}>Zoom</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => setScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(1))))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.valueText}>{scale.toFixed(1)}x</Text>
              <TouchableOpacity
                onPress={() => setScale((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(1))))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Pan X Control */}
          <View style={styles.controlRow}>
            <MoveHorizontal size={16} color="#22D3EE" />
            <Text style={styles.controlLabel}>Pan X</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => setOffsetX((prev) => Math.max(-50, prev - 5))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.valueText, { color: '#67E8F9' }]}>{offsetX}%</Text>
              <TouchableOpacity
                onPress={() => setOffsetX((prev) => Math.min(50, prev + 5))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Pan Y Control */}
          <View style={styles.controlRow}>
            <MoveVertical size={16} color="#F472B6" />
            <Text style={styles.controlLabel}>Pan Y</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => setOffsetY((prev) => Math.max(-50, prev - 5))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.valueText, { color: '#F472B6' }]}>{offsetY}%</Text>
              <TouchableOpacity
                onPress={() => setOffsetY((prev) => Math.min(50, prev + 5))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm & Save Button */}
          <TouchableOpacity
            onPress={handleApply}
            activeOpacity={0.85}
            style={styles.confirmBtn}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.confirmText}>Confirm & Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06040A',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFrame: {
    alignSelf: 'center',
    width: 230,
    height: 390,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.4)',
    overflow: 'hidden',
    backgroundColor: '#06040A',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  ambientBackground: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPreviewImage: {
    width: '100%',
    height: '100%',
  },
  watermarkGuide: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watermarkText: {
    color: 'rgba(239, 68, 68, 0.85)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  watermarkLine: {
    width: 48,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.4)',
  },
  controlsCard: {
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#171426',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  controlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlsTitle: {
    color: '#8F8A9F',
    fontSize: 12,
    fontWeight: '500',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetText: {
    color: '#D8B4FE',
    fontSize: 11,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    color: '#8F8A9F',
    fontSize: 12,
    flex: 1,
    marginLeft: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  valueText: {
    color: '#D8B4FE',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#9333EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});