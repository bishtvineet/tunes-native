import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Search,
  ChevronLeft,
  Home,
  Music,
  Radio,
  X,
  Sparkle,
  Lock,
  Key,
  ShieldCheck,
  Settings as SettingsIcon,
  Heart,
  Trash2,
  Music2,
  Play,
  Pause,
  HardDrive,
  Sparkles,
  Zap,
} from 'lucide-react-native';
import { useAudioPlayer } from './src/hooks/useAudioPlayer';
import {
  getAllTracks,
  deleteTrack,
  saveTrack,
  pruneStaleStorage,
  getStorageStats,
} from './src/services/storage';
import { ConverterTab } from './src/components/ConverterTab';
import { SettingsTab } from './src/components/SettingsTab';
import { PlayerView } from './src/components/PlayerView';
import { SplashScreen } from './src/components/SplashScreen';
import {
  ImageAdjustModal,
  type SplashConfig,
} from './src/components/ImageAdjustModal';
import { getInitials, formatDisplayName } from './src/utils/user';
import {
  sha256,
  ADMIN_PASSWORD_HASH,
  ADMIN_KEY_HASH,
} from './src/utils/crypto';
import type { Track } from './src/types';
import {
  getSavedNetworkMode,
  initNetworkMode,
  type NetworkMode,
} from './src/services/network';
import { pingRenderHealth } from './src/services/api';

type TabType = 'all' | 'favorite' | 'convert' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [previousTab, setPreviousTab] = useState<TabType>('all');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('cloud');

  // Header action states
  const [isWakingHost, setIsWakingHost] = useState(false);
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);
  const [storageUsageStr, setStorageUsageStr] = useState('0.0 MB');

  // User state
  const [userName, setUserName] = useState<string>('');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(false);
  const [splashConfig, setSplashConfig] = useState<SplashConfig | null>(null);

  // Admin Verification
  const [showAdminGate, setShowAdminGate] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);

  // Search & Toast
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    message: string;
    type: 'info' | 'success' | 'warning';
  } | null>(null);

  const {
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
  } = useAudioPlayer() as ReturnType<typeof useAudioPlayer> & {
    stopTrack?: () => void;
    updatePlaybackContext?: (context: 'All' | 'Favorite', queue: Track[]) => void;
  };

  // Load storage data and user configuration on boot
  useEffect(() => {
    const initializeAppData = async () => {
      // 1. Network mode
      const savedMode = await initNetworkMode();
      setNetworkMode(savedMode);

      // 2. User name
      const savedUser = await AsyncStorage.getItem('tunes_user_name');
      if (savedUser) {
        setUserName(savedUser);
        setShowSplash(true);
      } else {
        setShowNameModal(true);
      }

      // 3. Favorites
      const savedFavs = await AsyncStorage.getItem('tunes_favorites');
      if (savedFavs) {
        try {
          setFavoriteIds(JSON.parse(savedFavs));
        } catch { }
      }

      // 4. Custom splash config
      const savedSplash = await AsyncStorage.getItem('tunes_splash_config');
      if (savedSplash) {
        try {
          setSplashConfig(JSON.parse(savedSplash));
        } catch { }
      }

      // 5. Track library
      await refreshLibrary();
    };

    initializeAppData();
  }, []);

  const refreshLibrary = async () => {
    try {
      const stored = await getAllTracks();
      setTracks(stored);
      const stats = await getStorageStats();
      setStorageUsageStr(stats.formattedSize);
    } catch (err) {
      console.error('Failed to load tracks', err);
    }
  };

  const showNotification = (
    message: string,
    type: 'info' | 'success' | 'warning'
  ) => {
    setStatusNotice({ message, type });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Header Action: Wake Up Host
  const handleWakeUpHost = async () => {
    if (isWakingHost) return;
    setIsWakingHost(true);
    showNotification(
      'Pinging Render to wake container (cold start may take 30-50s)...',
      'info'
    );

    const result = await pingRenderHealth();
    setIsWakingHost(false);

    if (result.ok) {
      showNotification(`Render host is awake & ready! (${result.timeMs}ms)`, 'success');
    } else {
      showNotification(
        `Could not reach Render after ${result.timeMs}ms. Try again shortly.`,
        'warning'
      );
    }
  };

  // Header Action: Clean Storage
  const handleCleanStorage = async () => {
    if (isCleaningStorage) return;
    setIsCleaningStorage(true);

    try {
      const result = await pruneStaleStorage();
      await refreshLibrary();

      if (result.prunedCount > 0) {
        showNotification(
          `Cleaned ${result.prunedCount} orphaned item(s). Space freed!`,
          'success'
        );
      } else {
        showNotification('Storage is clean! No orphan data found.', 'info');
      }
    } catch {
      showNotification('Could not complete storage cleanup.', 'warning');
    } finally {
      setIsCleaningStorage(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    await AsyncStorage.setItem('tunes_user_name', trimmed);
    setUserName(trimmed);
    setShowNameModal(false);
    setShowSplash(true);
  };

  const handleAdminVerify = async () => {
    setAdminError(null);
    const passHash = await sha256(adminPassword.trim());
    const keyHash = await sha256(adminKey.trim());

    if (passHash === ADMIN_PASSWORD_HASH && keyHash === ADMIN_KEY_HASH) {
      setIsAdminAuthenticated(true);
      setAdminError(null);
    } else {
      setAdminError('Invalid Admin credentials.');
    }
  };

  const toggleFavorite = async (id: string) => {
    const isCurrentlyFavorite = favoriteIds.includes(id);
    const updatedFavorites = isCurrentlyFavorite
      ? favoriteIds.filter((item) => item !== id)
      : [...favoriteIds, id];

    setFavoriteIds(updatedFavorites);
    await AsyncStorage.setItem('tunes_favorites', JSON.stringify(updatedFavorites));

    // If the toggled track is the currently playing track, switch its playback queue & context
    if (currentTrack?.id === id && typeof updatePlaybackContext === 'function') {
      if (!isCurrentlyFavorite) {
        // Just became a favorite -> switch to Favorite queue
        const newFavQueue = tracks.filter((t) => updatedFavorites.includes(t.id));
        updatePlaybackContext('Favorite', newFavQueue);
      } else {
        // Unfavorited -> switch back to All (non-favorite) queue
        const newAllQueue = tracks.filter((t) => !updatedFavorites.includes(t.id));
        updatePlaybackContext('All', newAllQueue);
      }
    }
  };

  const handleTrackSaved = async (newTrack: Track) => {
    await saveTrack(newTrack);
    await refreshLibrary();
    setActiveTab('all');
    playTrack(newTrack, 'All', [newTrack, ...tracks]);
  };

  const handleDeleteTrack = async (id: string) => {
    // If deleted track is currently playing or loaded in player, tear down playback
    if (currentTrack?.id === id) {
      if (typeof stopTrack === 'function') {
        stopTrack();
      } else {
        if (isPlaying) {
          togglePlay();
        }
      }
    }
    await deleteTrack(id);
    await refreshLibrary();
  };

  const displayedTracks = useMemo(() => {
    let list: Track[] = [];

    if (activeTab === 'favorite') {
      // Only favorited tracks
      list = tracks.filter((t) => favoriteIds.includes(t.id));
    } else if (activeTab === 'all') {
      // Only non-favorited tracks (moved to favorite when heart is tapped)
      list = tracks.filter((t) => !favoriteIds.includes(t.id));
    } else {
      list = tracks;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tracks, activeTab, favoriteIds, searchQuery]);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0B14" />

      {/* 1. Name Prompt Modal for First Launch */}
      <Modal visible={showNameModal} animationType="fade" transparent={false}>
        <View style={styles.modalFullCenter}>
          <View style={styles.nameCard}>
            <View style={styles.nameIconBox}>
              <Sparkle size={24} color="#C084FC" />
            </View>
            <Text style={styles.nameHeading}>What should we call you?</Text>
            <Text style={styles.nameSubheading}>
              Enter your name to personalize your offline music player.
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Vineet Bisht"
              placeholderTextColor="#686278"
              style={styles.nameInput}
              autoFocus
            />
            <TouchableOpacity
              onPress={handleSaveName}
              disabled={!nameInput.trim()}
              style={[
                styles.nameSubmitBtn,
                !nameInput.trim() && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.nameSubmitText}>Let's Listen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin Photo Gate Modal */}
      <Modal
        visible={showAdminGate}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAdminGate(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.adminModalBox}>
            <View style={styles.adminModalHeader}>
              <View style={styles.adminTitleRow}>
                <ShieldCheck size={20} color="#C084FC" />
                <Text style={styles.adminTitleText}>Admin Access</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowAdminGate(false);
                  setIsAdminAuthenticated(false);
                  setAdminPassword('');
                  setAdminKey('');
                  setAdminError(null);
                }}
              >
                <X size={18} color="#8F8A9F" />
              </TouchableOpacity>
            </View>

            {!isAdminAuthenticated ? (
              <View style={styles.adminForm}>
                <Text style={styles.adminHint}>
                  Enter credentials to unlock custom splash photo settings.
                </Text>
                <View style={styles.inputWithIcon}>
                  <Lock size={15} color="#8F8A9F" style={styles.inputInnerIcon} />
                  <TextInput
                    secureTextEntry
                    placeholder="Admin Password"
                    placeholderTextColor="#686278"
                    value={adminPassword}
                    onChangeText={setAdminPassword}
                    style={styles.adminInput}
                  />
                </View>
                <View style={styles.inputWithIcon}>
                  <Key size={15} color="#8F8A9F" style={styles.inputInnerIcon} />
                  <TextInput
                    secureTextEntry
                    placeholder="Secret Key"
                    placeholderTextColor="#686278"
                    value={adminKey}
                    onChangeText={setAdminKey}
                    style={styles.adminInput}
                  />
                </View>
                {adminError && (
                  <Text style={styles.adminErrorText}>{adminError}</Text>
                )}
                <TouchableOpacity
                  onPress={handleAdminVerify}
                  style={styles.adminSubmitBtn}
                >
                  <Text style={styles.adminSubmitText}>Verify Access</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.adminSuccessContent}>
                <Text style={styles.adminAuthSuccessText}>
                  ✓ Admin Authenticated
                </Text>
                <Text style={styles.adminNotice}>
                  Custom splash photos can be placed inside the project assets folder.
                </Text>
                {splashConfig?.image && (
                  <TouchableOpacity
                    onPress={async () => {
                      await AsyncStorage.removeItem('tunes_splash_config');
                      setSplashConfig(null);
                      showNotification('Splash background reset.', 'info');
                    }}
                    style={styles.removeSplashBtn}
                  >
                    <Text style={styles.removeSplashText}>
                      Reset to Default Splash
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Adjust Photo Modal */}
      {pendingImageSrc && (
        <ImageAdjustModal
          imageSrc={pendingImageSrc}
          onCancel={() => setPendingImageSrc(null)}
          onConfirm={async (config) => {
            try {
              await AsyncStorage.setItem(
                'tunes_splash_config',
                JSON.stringify(config)
              );
              setSplashConfig(config);
              setPendingImageSrc(null);
              setShowAdminGate(false);
              showNotification('Splash background saved!', 'success');
            } catch {
              setAdminError('Storage limit exceeded.');
            }
          }}
        />
      )}

      {/* 2. Splash Screen */}
      {showSplash && !showNameModal && (
        <SplashScreen
          onFinish={() => setShowSplash(false)}
          backgroundConfig={splashConfig}
        />
      )}

      {/* FLOATING TOP TOAST */}
      {statusNotice && (
        <View
          style={[
            styles.toast,
            statusNotice.type === 'success'
              ? styles.toastSuccess
              : statusNotice.type === 'info'
                ? styles.toastInfo
                : styles.toastWarning,
          ]}
        >
          <Text style={styles.toastText}>{statusNotice.message}</Text>
          <TouchableOpacity onPress={() => setStatusNotice(null)}>
            <X size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* 3. Main Screen View */}
      <View style={styles.mainContainer}>
        {/* Header */}
        <View style={styles.header}>
          {activeTab === 'settings' ? (
            <>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  onPress={() =>
                    setActiveTab(previousTab === 'settings' ? 'all' : previousTab)
                  }
                  style={styles.headerCircleBtn}
                >
                  <ChevronLeft size={22} color="#A6A0B8" />
                </TouchableOpacity>
                <View>
                  <Text style={styles.headerTitle}>App Settings</Text>
                  <Text style={styles.headerSubtitle}>Preferences & routing</Text>
                </View>
              </View>

              {/* COMPACT TOOLBAR */}
              <View style={styles.toolbar}>
                <View style={styles.storageBox}>
                  <HardDrive size={13} color="#C084FC" />
                  <Text style={styles.storageBoxText}>{storageUsageStr}</Text>
                </View>

                <TouchableOpacity
                  onPress={handleCleanStorage}
                  disabled={isCleaningStorage}
                  style={styles.toolIconBtnAmber}
                >
                  {isCleaningStorage ? (
                    <ActivityIndicator size="small" color="#FBBF24" />
                  ) : (
                    <Sparkles size={14} color="#FBBF24" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleWakeUpHost}
                  disabled={isWakingHost}
                  style={styles.toolIconBtnEmerald}
                >
                  {isWakingHost ? (
                    <ActivityIndicator size="small" color="#34D399" />
                  ) : (
                    <Zap size={14} color="#34D399" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.headerLeft}>
                <View style={styles.avatarBorder}>
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarText}>
                      {getInitials(userName)}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    Hello, {formatDisplayName(userName)}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    Ready for your offline tunes?
                  </Text>
                </View>
              </View>

              <View style={styles.headerRightActions}>
                <TouchableOpacity
                  onPress={() => setShowSearchInput(!showSearchInput)}
                  style={styles.headerCircleBtn}
                >
                  <Search size={18} color="#A6A0B8" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setPreviousTab(activeTab);
                    setActiveTab('settings');
                  }}
                  style={styles.headerCircleBtn}
                >
                  <SettingsIcon size={18} color="#A6A0B8" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Collapsible Search */}
        {showSearchInput && activeTab !== 'settings' && (
          <View style={styles.searchCollapsible}>
            <Search size={16} color="#8F8A9F" style={styles.searchCollapsibleIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by title or artist..."
              placeholderTextColor="#686278"
              style={styles.searchCollapsibleInput}
              autoFocus
            />
          </View>
        )}

        {/* Tabs Pill Switcher */}
        {activeTab !== 'settings' && (
          <View style={styles.tabPillRow}>
            {(['all', 'favorite', 'convert'] as TabType[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabPill,
                  activeTab === tab && styles.tabPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    activeTab === tab && styles.tabPillTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tab Views */}
        <View style={styles.tabContentArea}>
          {activeTab === 'settings' ? (
            <SettingsTab
              networkMode={networkMode}
              onNetworkModeChange={setNetworkMode}
              onOpenAdminGate={() => setShowAdminGate(true)}
              onNotify={showNotification}
            />
          ) : activeTab === 'convert' ? (
            <ConverterTab onTrackSaved={handleTrackSaved} />
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.trackScrollContainer}
            >
              <View style={styles.trackListSubheader}>
                <Text style={styles.trackListSubheading}>
                  {activeTab.toUpperCase()} TRACKS
                </Text>
                <Text style={styles.trackCountText}>
                  {displayedTracks.length} items
                </Text>
              </View>

              {displayedTracks.length === 0 ? (
                <View style={styles.noTracksBox}>
                  <Music2 size={36} color="rgba(168, 85, 247, 0.4)" />
                  <Text style={styles.noTracksTitle}>No tracks found</Text>
                  <Text style={styles.noTracksSubtitle}>
                    {activeTab === 'favorite'
                      ? 'Tap the heart icon on any song to save it here.'
                      : 'Use the Convert tab to download offline audio.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.trackCardsCol}>
                  {displayedTracks.map((track) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isFavorite = favoriteIds.includes(track.id);

                    const handleRowClick = () => {
                      if (isCurrent) {
                        togglePlay();
                      } else {
                        playTrack(
                          track,
                          activeTab === 'favorite' ? 'Favorite' : 'All',
                          displayedTracks
                        );
                      }
                    };

                    return (
                      <TouchableOpacity
                        key={track.id}
                        activeOpacity={0.8}
                        onPress={handleRowClick}
                        style={[
                          styles.trackRowCard,
                          isCurrent && styles.trackRowCardActive,
                        ]}
                      >
                        <View style={styles.trackRowLeft}>
                          <View style={styles.trackRowThumbBox}>
                            {track.thumbnailUrl ? (
                              <Image
                                source={{ uri: track.thumbnailUrl }}
                                style={styles.trackRowThumb}
                              />
                            ) : (
                              <Music2 size={18} color="#C084FC" />
                            )}
                          </View>
                          <View style={styles.trackRowInfo}>
                            <Text
                              style={[
                                styles.trackRowTitle,
                                isCurrent && { color: '#E9D5FF' },
                              ]}
                              numberOfLines={1}
                            >
                              {track.title}
                            </Text>
                            <View style={styles.trackRowMeta}>
                              <Text
                                style={styles.trackRowArtist}
                                numberOfLines={1}
                              >
                                {track.artist}
                              </Text>
                              <Text style={styles.trackRowDot}>•</Text>
                              <Text style={styles.trackRowDuration}>
                                {track.durationFormatted}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.trackRowActions}>
                          <TouchableOpacity
                            onPress={() => toggleFavorite(track.id)}
                            style={styles.trackActionBtn}
                          >
                            <Heart
                              size={18}
                              color={isFavorite ? '#EC4899' : '#8F8A9F'}
                              fill={isFavorite ? '#EC4899' : 'transparent'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteTrack(track.id)}
                            style={styles.trackActionBtn}
                          >
                            <Trash2 size={16} color="#8F8A9F" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={handleRowClick}
                            style={[
                              styles.trackPlayIndicator,
                              isCurrent &&
                              isPlaying &&
                              styles.trackPlayIndicatorActive,
                            ]}
                          >
                            {isCurrent && isPlaying ? (
                              <Pause size={14} color="#FFFFFF" fill="#FFFFFF" />
                            ) : (
                              <Play
                                size={14}
                                color="#FFFFFF"
                                fill="#FFFFFF"
                                style={{ marginLeft: 2 }}
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Bottom Tab Navigation Bar */}
        <View style={styles.bottomNavWrapper}>
          <View style={styles.bottomNavPill}>
            <TouchableOpacity
              onPress={() => setActiveTab('all')}
              style={[
                styles.navBtn,
                activeTab === 'all' && styles.navBtnActive,
              ]}
            >
              <Home
                size={20}
                color={activeTab === 'all' ? '#FFFFFF' : '#8F8A9F'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('favorite')}
              style={styles.navBtn}
            >
              <Music
                size={20}
                color={activeTab === 'favorite' ? '#C084FC' : '#8F8A9F'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('convert')}
              style={styles.navBtn}
            >
              <Radio
                size={20}
                color={activeTab === 'convert' ? '#C084FC' : '#8F8A9F'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Mini Player & Full Modal Player */}
        <PlayerView
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          repeatMode={repeatMode}
          playbackContext={playbackContext}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onNext={nextTrack}
          onPrev={prevTrack}
          onToggleRepeat={toggleRepeat}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0B14',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
    backgroundColor: '#9333EA',
  },
  avatarInner: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: '#1A162B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    maxWidth: 160,
  },
  headerSubtitle: {
    color: '#8F8A9F',
    fontSize: 11,
    marginTop: 2,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(28, 24, 43, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#1C182B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  storageBoxText: {
    color: '#D8B4FE',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  toolIconBtnAmber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolIconBtnEmerald: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCollapsible: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 12,
  },
  searchCollapsibleIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  searchCollapsibleInput: {
    backgroundColor: '#181427',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingLeft: 38,
    paddingRight: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  tabPillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(28, 24, 43, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabPillActive: {
    backgroundColor: '#9333EA',
    borderColor: 'rgba(147, 51, 234, 0.5)',
  },
  tabPillText: {
    color: '#8F8A9F',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabContentArea: {
    flex: 1,
  },
  trackScrollContainer: {
    paddingBottom: 150,
  },
  trackListSubheader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  trackListSubheading: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  trackCountText: {
    color: '#8F8A9F',
    fontSize: 11,
  },
  noTracksBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noTracksTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  noTracksSubtitle: {
    color: '#8F8A9F',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 220,
    marginTop: 4,
  },
  trackCardsCol: {
    gap: 8,
  },
  trackRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(21, 18, 33, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  trackRowCardActive: {
    backgroundColor: '#1E1933',
    borderColor: 'rgba(147, 51, 234, 0.5)',
  },
  trackRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  trackRowThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#241E38',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackRowThumb: {
    width: '100%',
    height: '100%',
  },
  trackRowInfo: {
    marginLeft: 10,
    flex: 1,
  },
  trackRowTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  trackRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  trackRowArtist: {
    color: '#8F8A9F',
    fontSize: 11,
    maxWidth: 110,
  },
  trackRowDot: {
    color: '#555066',
    fontSize: 8,
    marginHorizontal: 4,
  },
  trackRowDuration: {
    color: '#8F8A9F',
    fontSize: 11,
  },
  trackRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackActionBtn: {
    padding: 6,
  },
  trackPlayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackPlayIndicatorActive: {
    backgroundColor: '#9333EA',
  },
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  bottomNavPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: 200,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: 'rgba(21, 18, 33, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  navBtn: {
    padding: 8,
  },
  navBtnActive: {
    backgroundColor: '#9333EA',
    borderRadius: 20,
  },
  toast: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 360,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 90,
  },
  toastSuccess: {
    backgroundColor: '#064E3B',
    borderColor: '#059669',
    borderWidth: 1,
  },
  toastInfo: {
    backgroundColor: '#1E1B4B',
    borderColor: '#4338CA',
    borderWidth: 1,
  },
  toastWarning: {
    backgroundColor: '#78350F',
    borderColor: '#D97706',
    borderWidth: 1,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  modalFullCenter: {
    flex: 1,
    backgroundColor: '#0D0B14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  nameCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: '#171426',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
  },
  nameIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  nameHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  nameSubheading: {
    color: '#8F8A9F',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 18,
  },
  nameInput: {
    backgroundColor: '#120F20',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 16,
  },
  nameSubmitBtn: {
    backgroundColor: '#9333EA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  nameSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  adminModalBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    backgroundColor: '#181428',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
  },
  adminModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminTitleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  adminForm: {
    gap: 10,
  },
  adminHint: {
    color: '#8F8A9F',
    fontSize: 11,
    marginBottom: 4,
  },
  inputWithIcon: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputInnerIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  adminInput: {
    backgroundColor: '#120F20',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingLeft: 36,
    paddingRight: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 12,
  },
  adminErrorText: {
    color: '#F87171',
    fontSize: 11,
  },
  adminSubmitBtn: {
    backgroundColor: '#9333EA',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
  },
  adminSubmitText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  adminSuccessContent: {
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  adminAuthSuccessText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
  },
  adminNotice: {
    color: '#8F8A9F',
    fontSize: 11,
    textAlign: 'center',
  },
  removeSplashBtn: {
    marginTop: 8,
  },
  removeSplashText: {
    color: '#F87171',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
});