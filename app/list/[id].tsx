/**
 * List detail — view items, swipe to remove, edit list, see collaborators.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Animated,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';
import {
  CollaboratorAvatars,
  CollaboratorsSection,
  type Collaborator,
} from '@/components/CollaboratorsSection';

// ─── Types ────────────────────────────────────────────────────────────────────

type ListDetail = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  cover_image_url: string | null;
  owner_id: string;
};

type ListItem = {
  item_id: string;
  added_at: string;
  items: {
    id: string;
    name: string;
    artists_json: any;
    image_url: string | null;
  };
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ListDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [list, setList] = useState<ListDetail | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (id) loadList();
  }, [id]);

  async function loadList() {
    const [
      { data: userData },
      [{ data: listData }, { data: itemData }, { data: collabData }],
    ] = await Promise.all([
      supabase.auth.getUser(),
      Promise.all([
        supabase.from('lists').select('*').eq('id', id).single(),
        supabase
          .from('list_items')
          .select('*, items(*)')
          .eq('list_id', id)
          .order('added_at', { ascending: false }),
        supabase
          .from('list_collaborators')
          .select('user_id, profile:profiles(username, display_name, avatar_url)')
          .eq('list_id', id),
      ]),
    ]);

    setCurrentUserId(userData.user?.id ?? null);
    setList(listData);
    setItems(itemData ?? []);
    setCollaborators(
      (collabData ?? [])
        .filter((r) => (r as any).profile)
        .map((r) => ({
          user_id: r.user_id,
          profile: (r as any).profile as Collaborator['profile'],
        }))
    );
    setLoading(false);
  }

  async function removeItem(itemId: string) {
    await supabase
      .from('list_items')
      .delete()
      .eq('list_id', id)
      .eq('item_id', itemId);
    setItems((prev) => prev.filter((i) => i.item_id !== itemId));
  }

  const isOwner = list?.owner_id === currentUserId;
  const isCollaborator =
    !isOwner && collaborators.some((c) => c.user_id === currentUserId);
  const canRemove = isOwner || isCollaborator;

  if (loading || !list) {
    return <ListDetailSkeleton />;
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.item_id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.headerNav}>
              <Pressable onPress={() => router.back()}>
                <Text style={{ fontSize: 18, color: colors.textSecondary }}>← Back</Text>
              </Pressable>
              {isOwner && (
                <Pressable onPress={() => setShowEdit(true)}>
                  <Text style={{ fontSize: 15, color: colors.accent, fontWeight: '600' }}>
                    Edit
                  </Text>
                </Pressable>
              )}
            </View>

            {list.cover_image_url && (
              <Image
                source={{ uri: list.cover_image_url }}
                style={[styles.coverBanner, { backgroundColor: colors.surfaceElevated }]}
                resizeMode="cover"
              />
            )}

            <View style={styles.titleRow}>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: colors.text,
                  letterSpacing: -0.6,
                  flex: 1,
                }}
              >
                {list.title}
              </Text>
              {list.is_public && <Badge label="Public" variant="neutral" />}
            </View>

            {list.description && (
              <Text variant="body" color="secondary" style={{ marginTop: spacing[2] }}>
                {list.description}
              </Text>
            )}

            {/* Collaborators row */}
            {collaborators.length > 0 && (
              <View style={styles.collabRow}>
                <CollaboratorAvatars collaborators={collaborators} />
                <Text variant="caption" color="tertiary">
                  {collaborators.length}{' '}
                  {collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                </Text>
              </View>
            )}

            <Text
              variant="caption"
              color="tertiary"
              style={{ marginTop: spacing[2], marginBottom: spacing[4] }}
            >
              {items.length} {items.length === 1 ? 'track' : 'tracks'}
              {canRemove && items.length > 0 && (
                <Text variant="caption" color="tertiary"> · Swipe left to remove</Text>
              )}
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
        }
        renderItem={({ item, index }) => (
          <TrackRow
            item={item}
            index={index}
            canRemove={canRemove}
            onRemove={() => removeItem(item.item_id)}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.border }]} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" color="secondary" align="center">
              No tracks yet.{'\n'}Rate songs on Discover to add them here.
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      {showEdit && list && (
        <EditListModal
          list={list}
          onClose={() => setShowEdit(false)}
          onUpdated={(updated) => {
            setList(updated);
            setShowEdit(false);
          }}
          onDeleted={() => {
            setShowEdit(false);
            router.replace('/(tabs)/lists');
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ListDetailSkeleton() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Nav — keep back button real */}
      <View style={[styles.listHeader, { paddingBottom: 0 }]}>
        <View style={styles.headerNav}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 18, color: colors.textSecondary }}>← Back</Text>
          </Pressable>
        </View>

        {/* Title + meta */}
        <Skeleton width="60%" height={28} style={{ marginBottom: spacing[2] }} />
        <Skeleton width="40%" height={14} style={{ marginBottom: spacing[4] }} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      {/* Track rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[5], paddingVertical: spacing[3] }}>
            <Skeleton width={24} height={13} />
            <Skeleton width={44} height={44} borderRadius={radii.sm} />
            <View style={{ flex: 1, gap: 5 }}>
              <Skeleton width="65%" height={14} />
              <Skeleton width="45%" height={12} />
            </View>
          </View>
          {i < 5 && <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        </View>
      ))}
    </SafeAreaView>
  );
}

// ─── Track Row ────────────────────────────────────────────────────────────────

function TrackRow({
  item,
  index,
  canRemove,
  onRemove,
}: {
  item: ListItem;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);

  function renderRightActions(progress: Animated.AnimatedInterpolation<number>) {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });
    return (
      <Animated.View style={{ transform: [{ translateX }] }}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => {
            swipeableRef.current?.close();
            onRemove();
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Remove</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (!canRemove) {
    return <StaticTrackRow item={item} index={index} />;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <StaticTrackRow item={item} index={index} />
    </Swipeable>
  );
}

function StaticTrackRow({ item, index }: { item: ListItem; index: number }) {
  const { colors } = useTheme();
  const artists = Array.isArray(item.items?.artists_json)
    ? item.items.artists_json.join(', ')
    : String(item.items?.artists_json ?? '');

  return (
    <View style={[styles.trackRow, { backgroundColor: colors.bg }]}>
      <Text style={{ fontSize: 13, color: colors.textTertiary, width: 24, textAlign: 'right' }}>
        {index + 1}
      </Text>
      {item.items?.image_url ? (
        <Image
          source={{ uri: item.items.image_url }}
          style={[styles.trackArt, { backgroundColor: colors.surfaceElevated }]}
        />
      ) : (
        <View style={[styles.trackArt, { backgroundColor: colors.surfaceElevated }]} />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {item.items?.name ?? 'Unknown'}
        </Text>
        <Text variant="caption" color="secondary" numberOfLines={1}>
          {artists}
        </Text>
      </View>
    </View>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditListModal({
  list,
  onClose,
  onUpdated,
  onDeleted,
}: {
  list: ListDetail;
  onClose: () => void;
  onUpdated: (updated: ListDetail) => void;
  onDeleted: () => void;
}) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? '');
  const [isPublic, setIsPublic] = useState(list.is_public);
  const [coverUri, setCoverUri] = useState<string | null>(list.cover_image_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const asset = result.assets[0];
      if (!asset.base64) throw new Error('No image data returned');

      const mimeType = 'image/jpeg';
      const path = `${user.id}/${list.id}.jpg`;

      // Decode base64 → ArrayBuffer for upload
      const binaryString = atob(asset.base64);
      const arrayBuffer = new ArrayBuffer(binaryString.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < binaryString.length; i++) {
        view[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('list-covers')
        .upload(path, arrayBuffer, { upsert: true, contentType: mimeType });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('list-covers').getPublicUrl(path);

      setCoverUri(publicUrl);
    } catch (e: any) {
      console.error('[pickImage]', e?.message ?? e);
      setError(e?.message ?? 'Image upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('lists')
      .update({
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        cover_image_url: coverUri,
      })
      .eq('id', list.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    onUpdated({
      ...list,
      title: title.trim(),
      description: description.trim() || null,
      is_public: isPublic,
      cover_image_url: coverUri,
    });
  }

  function handleDelete() {
    Alert.alert('Delete list', `Delete "${list.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: delError } = await supabase
            .from('lists')
            .delete()
            .eq('id', list.id);
          if (delError) {
            Alert.alert('Error', delError.message);
            return;
          }
          onDeleted();
        },
      },
    ]);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
        <View style={styles.modalHeader}>
          <Text variant="h3">Edit list</Text>
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.modalBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={pickImage} disabled={uploading}>
            <View
              style={[
                styles.coverPicker,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              {coverUri ? (
                <Image
                  source={{ uri: coverUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.coverPickerOverlay}>
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#fff',
                      fontWeight: '600',
                      textAlign: 'center',
                    }}
                  >
                    {coverUri ? 'Change image' : 'Add image'}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>

          <Input
            label="Title"
            placeholder="My favourite albums..."
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
          />
          <Input
            label="Description"
            placeholder="Optional"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          <ToggleRow
            label="Public"
            description="Anyone can view this list"
            value={isPublic}
            onToggle={() => setIsPublic((v) => !v)}
          />

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <CollaboratorsSection listId={list.id} />

          <View style={{ height: spacing[6] }} />
        </ScrollView>

        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          {error && (
            <Text
              variant="caption"
              color="negative"
              align="center"
              style={{ marginBottom: spacing[3] }}
            >
              {error}
            </Text>
          )}
          <Button
            label="Save changes"
            variant="primary"
            size="lg"
            fullWidth
            loading={saving}
            disabled={!title.trim() || uploading}
            onPress={handleSave}
          />
          <Pressable style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.negative }}>
              Delete list
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable style={styles.toggleRow} onPress={onToggle}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{label}</Text>
        <Text variant="caption" color="secondary">
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.toggle,
          {
            backgroundColor: value ? colors.accent : colors.surfaceElevated,
            borderColor: value ? colors.accent : colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.toggleThumb,
            {
              backgroundColor: colors.surface,
              transform: [{ translateX: value ? 16 : 0 }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { paddingBottom: spacing[10] },
  listHeader: {
    padding: spacing[5],
    paddingBottom: 0,
  },
  navHeader: {
    padding: spacing[5],
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  coverBanner: {
    width: '100%',
    height: 180,
    borderRadius: radii.lg,
    marginBottom: spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  collabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  divider: {
    height: 1,
  },
  empty: {
    padding: spacing[10],
    alignItems: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
  },
  trackArt: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
  },
  separator: {
    height: 1,
    marginLeft: spacing[5] + 24 + spacing[3] + 44 + spacing[3],
  },
  deleteAction: {
    backgroundColor: '#E5303A',
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },

  // Edit modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  modalBody: {
    gap: spacing[4],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  modalFooter: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
    gap: spacing[3],
    borderTopWidth: 1,
  },
  coverPicker: {
    height: 120,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingVertical: spacing[2],
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: radii.full,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: radii.full,
  },
});
