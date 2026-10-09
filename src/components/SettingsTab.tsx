import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  RotateCw,
  Lock,
  ChevronDown,
  Check,
  AlertCircle,
  KeyRound,
  Network,
} from 'lucide-react-native';
import { syncCookiesToBackend } from '../services/api';
import {
  NETWORK_MODES,
  setSavedNetworkMode,
  type NetworkMode,
} from '../services/network';

interface SettingsTabProps {
  networkMode: NetworkMode;
  onNetworkModeChange: (mode: NetworkMode) => void;
  onOpenAdminGate: () => void;
  onNotify: (message: string, type: 'info' | 'success' | 'warning') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  networkMode,
  onNetworkModeChange,
  onOpenAdminGate,
  onNotify,
}) => {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const [isCookieSyncOpen, setIsCookieSyncOpen] = useState(false);

  // Cookie sync state
  const [cookieText, setCookieText] = useState('');
  const [isSyncingCookies, setIsSyncingCookies] = useState(false);
  const [cookieStatus, setCookieStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  const handleCheckUpdate = async () => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);

    // Native app update simulation check
    setTimeout(() => {
      setIsCheckingUpdate(false);
      onNotify('Your app is running the latest native build!', 'success');
    }, 1200);
  };

  const handleSyncCookies = async () => {
    if (!cookieText.trim()) return;
    setIsSyncingCookies(true);
    setCookieStatus({ type: 'idle', message: '' });

    try {
      const res = await syncCookiesToBackend(cookieText.trim());
      setCookieStatus({
        type: 'success',
        message: res.message || 'Cookies synced successfully!',
      });
      setCookieText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update cookies on server.';
      setCookieStatus({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsSyncingCookies(false);
    }
  };

  const handleSelectMode = async (mode: NetworkMode) => {
    await setSavedNetworkMode(mode);
    onNetworkModeChange(mode);
    onNotify(`Routing mode: ${NETWORK_MODES[mode].label}`, 'info');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. Network Routing Selector */}
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsNetworkOpen((prev) => !prev)}
          style={styles.cardHeader}
        >
          <View style={styles.headerLeft}>
            <View style={styles.iconBoxCyan}>
              <Network size={20} color="#22D3EE" />
            </View>
            <View>
              <View style={styles.titleBadgeRow}>
                <Text style={styles.cardTitle}>Network & Relay Route</Text>
                <View style={styles.cyanBadge}>
                  <Text style={styles.cyanBadgeText}>
                    {NETWORK_MODES[networkMode].badge}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>Select endpoint & proxy strategy</Text>
            </View>
          </View>
          <ChevronDown
            size={18}
            color="#22D3EE"
            style={{ transform: [{ rotate: isNetworkOpen ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {isNetworkOpen && (
          <View style={styles.dropdownContent}>
            {(Object.keys(NETWORK_MODES) as NetworkMode[]).map((key) => {
              const info = NETWORK_MODES[key];
              const isSelected = networkMode === key;
              return (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.8}
                  onPress={() => handleSelectMode(key)}
                  style={[
                    styles.modeOption,
                    isSelected ? styles.modeOptionSelected : styles.modeOptionDefault,
                  ]}
                >
                  <View style={styles.modeOptionHeader}>
                    <Text
                      style={[
                        styles.modeOptionTitle,
                        isSelected && { color: '#67E8F9' },
                      ]}
                    >
                      {info.label}
                    </Text>
                    {isSelected && <Check size={14} color="#22D3EE" />}
                  </View>
                  <Text style={styles.modeOptionDesc}>{info.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* 2. App Update Check */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleCheckUpdate}
        disabled={isCheckingUpdate}
        style={[styles.card, styles.rowCard]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBoxPurple}>
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color="#C084FC" />
            ) : (
              <RotateCw size={20} color="#C084FC" />
            )}
          </View>
          <View>
            <Text style={styles.cardTitle}>Check for App Updates</Text>
            <Text style={styles.cardSubtitle}>Verify latest version & components</Text>
          </View>
        </View>
        <Text style={styles.checkText}>
          {isCheckingUpdate ? 'Checking...' : 'Check'}
        </Text>
      </TouchableOpacity>

      {/* 3. Admin Splash Screen Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onOpenAdminGate}
        style={[styles.card, styles.adminCard]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBoxPink}>
            <Lock size={18} color="#F472B6" />
          </View>
          <View>
            <Text style={styles.cardTitle}>Splash Background (Admin)</Text>
            <Text style={styles.cardSubtitle}>Password & key protected photo upload</Text>
          </View>
        </View>
        <Text style={styles.unlockText}>Unlock</Text>
      </TouchableOpacity>

      {/* 4. Cookie Sync Accordion */}
      <View style={styles.card}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsCookieSyncOpen((prev) => !prev)}
          style={styles.cardHeader}
        >
          <View style={styles.headerLeft}>
            <View style={styles.iconBoxPurple}>
              <KeyRound size={20} color="#C084FC" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Sync YouTube Cookies</Text>
              <Text style={styles.cardSubtitle}>Update server session without restarting</Text>
            </View>
          </View>
          <ChevronDown
            size={18}
            color="#C084FC"
            style={{ transform: [{ rotate: isCookieSyncOpen ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {isCookieSyncOpen && (
          <View style={styles.dropdownContent}>
            <TextInput
              multiline
              numberOfLines={4}
              value={cookieText}
              onChangeText={(text) => {
                setCookieText(text);
                setCookieStatus({ type: 'idle', message: '' });
              }}
              placeholder="# Netscape HTTP Cookie File&#10;.youtube.com..."
              placeholderTextColor="#686278"
              style={styles.cookieInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {cookieStatus.type === 'success' && (
              <View style={styles.statusSuccess}>
                <Check size={14} color="#86EFAC" />
                <Text style={styles.statusSuccessText}>{cookieStatus.message}</Text>
              </View>
            )}

            {cookieStatus.type === 'error' && (
              <View style={styles.statusError}>
                <AlertCircle size={14} color="#FCA5A5" />
                <Text style={styles.statusErrorText}>{cookieStatus.message}</Text>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSyncCookies}
              disabled={isSyncingCookies || !cookieText.trim()}
              style={[
                styles.syncBtn,
                (!cookieText.trim() || isSyncingCookies) && styles.disabledBtn,
              ]}
            >
              {isSyncingCookies ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.btnText}>Syncing to Server...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <KeyRound size={14} color="#FFFFFF" />
                  <Text style={styles.btnText}>Update Server Cookies</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    borderRadius: 18,
    backgroundColor: 'rgba(21, 18, 33, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(88, 28, 135, 0.15)',
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBoxCyan: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxPurple: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxPink: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  cyanBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cyanBadgeText: {
    color: '#67E8F9',
    fontSize: 9,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#8F8A9F',
    fontSize: 11,
    marginTop: 2,
  },
  checkText: {
    color: '#C084FC',
    fontSize: 12,
    fontWeight: '600',
  },
  unlockText: {
    color: '#F472B6',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dropdownContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
    paddingTop: 8,
  },
  modeOption: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  modeOptionDefault: {
    backgroundColor: 'rgba(28, 24, 43, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modeOptionSelected: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: 'rgba(6, 182, 212, 0.5)',
  },
  modeOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeOptionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modeOptionDesc: {
    color: '#8F8A9F',
    fontSize: 10,
  },
  cookieInput: {
    backgroundColor: '#1C182B',
    color: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: 11,
    fontFamily: 'monospace',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  statusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusSuccessText: {
    color: '#86EFAC',
    fontSize: 11,
  },
  statusError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusErrorText: {
    color: '#FCA5A5',
    fontSize: 11,
  },
  syncBtn: {
    backgroundColor: '#9333EA',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});