import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Search,
  Trash2,
  Music2,
  HardDrive,
  Sparkles,
  MoreVertical,
} from 'lucide-react-native';
import type { Track } from '../types';

export interface LibraryTabProps {
  tracks: Track[];
  currentTrack?: Track | null;
  currentTrackId?: string | undefined;
  isPlaying?: boolean;
  onSelectTrack: (track: Track) => void;
  onDeleteTrack: (id: string) => void | Promise<void>;
  storageUsage?: string;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  tracks,
  currentTrack,
  currentTrackId,
  isPlaying = false,
  onSelectTrack,
  onDeleteTrack,
  storageUsage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const activeId = currentTrack?.id || currentTrackId;

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q)
    );
  }, [tracks, searchQuery]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <Sparkles size={13} color="#EC4899" />
            <Text style={styles.badgeText}>SMART LIBRARY</Text>
          </View>
          <Text style={styles.title}>Your Music</Text>
        </View>

        {/* Offline Storage Badge */}
        {storageUsage ? (
          <View style={styles.storageBadge}>
            <HardDrive size={13} color="#A855F7" />
            <Text style={styles.storageText}>{storageUsage}</Text>
          </View>
        ) : null}
      </View>

      {/* Pill Search Bar */}
      <View style={styles.searchWrapper}>
        <Search
          size={16}
          color="rgba(152, 148, 171, 0.7)"
          style={styles.searchIcon}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tracks, artists..."
          placeholderTextColor="rgba(152, 148, 171, 0.6)"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Empty State: No Tracks */}
      {tracks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Music2 size={28} color="#A855F7" />
          </View>
          <Text style={styles.emptyTitle}>No songs saved yet</Text>
          <Text style={styles.emptySubtitle}>
            Paste a YouTube link in the Converter tab to save and listen completely offline.
          </Text>
        </View>
      ) : filteredTracks.length === 0 ? (
        /* Empty State: No Search Matches */
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            No matching tracks found for "{searchQuery}".
          </Text>
        </View>
      ) : (
        /* Track List */
        <View style={styles.trackList}>
          {filteredTracks.map((track) => {
            const isCurrent = activeId === track.id;
            const isMenuOpen = activeMenuId === track.id;

            return (
              <TouchableOpacity
                key={track.id}
                activeOpacity={0.8}
                onPress={() => onSelectTrack(track)}
                style={[
                  styles.trackCard,
                  isCurrent ? styles.activeTrackCard : styles.inactiveTrackCard,
                ]}
              >
                {/* Left: Thumbnail & Equalizer */}
                <View style={styles.trackContent}>
                  <View style={styles.thumbnailWrapper}>
                    {track.thumbnailUrl ? (
                      <Image
                        source={{ uri: track.thumbnailUrl }}
                        style={styles.thumbnail}
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <Music2 size={20} color="#9894AB" />
                      </View>
                    )}

                    {isCurrent && (
                      <View style={styles.equalizerOverlay}>
                        <View
                          style={[
                            styles.eqBar,
                            {
                              height: isPlaying ? 10 : 4,
                              backgroundColor: '#EC4899',
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.eqBar,
                            {
                              height: isPlaying ? 16 : 8,
                              backgroundColor: '#9333EA',
                            },
                          ]}
                        />
                        <View
                          style={[
                            styles.eqBar,
                            {
                              height: isPlaying ? 8 : 6,
                              backgroundColor: '#7C3AED',
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>

                  {/* Middle: Details */}
                  <View style={styles.detailsWrapper}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.trackTitle,
                        isCurrent && styles.activeTrackTitle,
                      ]}
                    >
                      {track.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text numberOfLines={1} style={styles.artistText}>
                        {track.artist}
                      </Text>
                      <Text style={styles.metaDot}>•</Text>
                      <Text style={styles.durationText}>
                        {track.durationFormatted}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right: Actions Menu */}
                <View style={styles.actionCol}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(isMenuOpen ? null : track.id);
                    }}
                    style={styles.menuButton}
                  >
                    <MoreVertical size={16} color="rgba(152, 148, 171, 0.6)" />
                  </TouchableOpacity>

                  {isMenuOpen && (
                    <View style={styles.dropdownMenu}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onDeleteTrack(track.id);
                          setActiveMenuId(null);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Trash2 size={14} color="#F87171" />
                        <Text style={styles.dropdownDeleteText}>
                          Delete Offline
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 120,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  badgeText: {
    color: '#EC4899',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  storageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1D1A2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  storageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9894AB',
  },
  searchWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 20,
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: 'rgba(19, 17, 28, 0.8)',
    color: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 10,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 70,
    paddingHorizontal: 16,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#13111C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9894AB',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  noResultsText: {
    color: '#9894AB',
    fontSize: 13,
  },
  trackList: {
    gap: 10,
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 16,
    position: 'relative',
  },
  activeTrackCard: {
    backgroundColor: '#1D1A2B',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.5)',
  },
  inactiveTrackCard: {
    backgroundColor: 'rgba(19, 17, 28, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  trackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  thumbnailWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1D1A2B',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalizerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: 8,
    gap: 2,
  },
  eqBar: {
    width: 3,
    borderRadius: 1.5,
  },
  detailsWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTrackTitle: {
    color: '#E9D5FF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  artistText: {
    color: '#9894AB',
    fontSize: 11,
    maxWidth: 130,
  },
  metaDot: {
    color: 'rgba(152, 148, 171, 0.4)',
    fontSize: 10,
    marginHorizontal: 4,
  },
  durationText: {
    color: 'rgba(152, 148, 171, 0.8)',
    fontSize: 11,
  },
  actionCol: {
    position: 'relative',
    zIndex: 10,
  },
  menuButton: {
    padding: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    right: 0,
    top: 36,
    width: 140,
    backgroundColor: '#1D1A2B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownDeleteText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '500',
  },
});