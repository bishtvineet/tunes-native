import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  Clipboard,
  Download,
  Link2,
  Sparkles,
  AlertCircle,
} from 'lucide-react-native';
import {
  fetchVideoInfo,
  downloadAudioStream,
  type ProgressCallbackData,
} from '../services/api';
import type { VideoInfo, Track } from '../types';

interface ConverterTabProps {
  onTrackSaved: (track: Track) => Promise<void>;
}

export const ConverterTab: React.FC<ConverterTabProps> = ({ onTrackSaved }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ProgressCallbackData | null>(null);
  const [preview, setPreview] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fallback paste handler
  const handlePaste = async () => {
    try {
      // In native environments without expo-clipboard installed yet,
      // users can long-press and paste into the TextInput natively.
      setError('Tip: Long press inside the input field to paste directly from your clipboard.');
      setTimeout(() => setError(null), 3000);
    } catch {
      setError('Please paste the URL manually.');
    }
  };

  const handleFetchInfo = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const info = await fetchVideoInfo(url.trim());
      setPreview(info);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch video information';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url.trim()) return;
    setDownloading(true);
    setDownloadProgress({
      percent: 0,
      receivedBytes: 0,
      totalBytes: 0,
      statusText: 'Connecting to NestJS audio stream...',
    });
    setError(null);

    try {
      const track = await downloadAudioStream(
        url.trim(),
        preview,
        (progressData) => {
          setDownloadProgress(progressData);
        },
        3,
        2000
      );

      await onTrackSaved(track);
      setUrl('');
      setPreview(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setError(msg);
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Input Card Wrapper */}
      <View style={styles.card}>
        <Text style={styles.heading}>Convert & Store Offline</Text>

        {/* URL Input Box */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Link2 size={18} color="#8F8A9F" />
          </View>

          <TextInput
            value={url}
            onChangeText={(text) => {
              setUrl(text);
              setError(null);
            }}
            placeholder="Paste YouTube or Music URL..."
            placeholderTextColor="#686278"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.textInput}
          />

          <TouchableOpacity
            onPress={handlePaste}
            activeOpacity={0.8}
            style={styles.pasteButton}
          >
            <Clipboard size={12} color="#D8B4FE" />
            <Text style={styles.pasteText}>Paste</Text>
          </TouchableOpacity>
        </View>

        {/* Fetch Action Button */}
        {!preview && (
          <TouchableOpacity
            onPress={handleFetchInfo}
            disabled={loading || !url.trim()}
            activeOpacity={0.85}
            style={[
              styles.primaryButton,
              (loading || !url.trim()) && styles.disabledButton,
            ]}
          >
            {loading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.buttonText}>Fetching Track Details...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.buttonText}>Fetch Track Preview</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#F87171" style={styles.errorIcon} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Track Preview & Save Card */}
      {preview && (
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Image
              source={{ uri: preview.thumbnail }}
              style={styles.previewThumbnail}
            />
            <View style={styles.previewDetails}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {preview.title}
              </Text>
              <Text style={styles.previewChannel} numberOfLines={1}>
                {preview.channel}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationBadgeText}>
                    {preview.durationFormatted}
                  </Text>
                </View>
                <Text style={styles.qualityText}>High Quality MP3</Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          {downloading && downloadProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressStatusText} numberOfLines={1}>
                  {downloadProgress.statusText}
                </Text>
                {downloadProgress.percent >= 0 && (
                  <Text style={styles.progressPercentText}>
                    {downloadProgress.percent}%
                  </Text>
                )}
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        downloadProgress.percent >= 0
                          ? `${downloadProgress.percent}%`
                          : '40%',
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Download & Save Offline Button */}
          <TouchableOpacity
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.85}
            style={[
              styles.primaryButton,
              downloading && styles.disabledButton,
            ]}
          >
            {downloading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.buttonText}>Writing Track to Disk...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Download size={18} color="#FFFFFF" />
                <Text style={styles.buttonText}>Save Offline to Library</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(21, 18, 33, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 10,
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  textInput: {
    backgroundColor: '#1C182B',
    color: '#FFFFFF',
    paddingLeft: 42,
    paddingRight: 74,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 13,
    fontWeight: '500',
  },
  pasteButton: {
    position: 'absolute',
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pasteText: {
    color: '#D8B4FE',
    fontSize: 11,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#9333EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    flex: 1,
  },
  previewCard: {
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 22, 45, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.35)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  previewThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#241E38',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewDetails: {
    flex: 1,
    marginLeft: 14,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  previewChannel: {
    color: '#8F8A9F',
    fontSize: 11,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  durationBadgeText: {
    color: '#D8B4FE',
    fontSize: 10,
    fontWeight: '700',
  },
  qualityText: {
    color: '#686278',
    fontSize: 10,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatusText: {
    color: '#D8B4FE',
    fontSize: 11,
    flex: 1,
    paddingRight: 8,
  },
  progressPercentText: {
    color: '#D8B4FE',
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EC4899',
  },
});