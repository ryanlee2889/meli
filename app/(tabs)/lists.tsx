/**
 * Lists screen — personal + shared lists.
 */
import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';
import {
  CollaboratorsSection,
  CollaboratorAvatars,
  type Collaborator,
} from '@/components/CollaboratorsSection';

// ─── Types ────────────────────────────────────────────────────────────────────

type List = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  cover_image_url: string | null;
  itemCount: number;
  coverUrl: string | null;
  collaborators: Collaborator[];
  isShared?: boolean;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ListsScreen() {
  const { colors } = useTheme();
  const [myLists, setMyLists] = useState<List[]>([]);
  const [sharedLists, setSharedLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingList, setEditingList] = useState<List | null>(null);

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Fetch owned lists + lists I'm collaborating on, in parallel
    const [ownedRes, collabRes] = await Promise.all([
      supabase
        .from('lists')
        .select('id, title, description, is_public, created_at, cover_image_url')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('list_collaborators')
        .select('list_id, lists(id, title, description, is_public, created_at, cover_image_url)')
        .eq('user_id', user.id),
    ]);

    const ownedRaw = ownedRes.data ?? [];
    const collabRaw = collabRes.data ?? [];

    const sharedRaw = collabRaw
      .map((c) => (c as any).lists)
      .filter(Boolean) as Array<{
      id: string;
      title: string;
      description: string | null;
      is_public: boolean;
      created_at: string;
      cover_image_url: string | null;
    }>;

    const allListIds = [
      ...ownedRaw.map((l) => l.id),
      ...sharedRaw.map((l) => l.id),
    ];

    if (!allListIds.length) {
      setMyLists([]);
      setSharedLists([]);
      setLoading(false);
      return;
    }

    // Fetch list items (for counts + cover fallback) and collaborators in parallel
    const [itemsRes, collabDataRes] = await Promise.all([
      supabase
        .from('list_items')
        .select('list_id, items(image_url)')
        .in('list_id', allListIds),
      supabase
        .from('list_collaborators')
        .select('list_id, user_id, profile:profiles(username, display_name, avatar_url)')
        .in('list_id', allListIds),
    ]);

    // Build count + cover map
    const countMap: Record<string, number> = {};
    const coverMap: Record<string, string | null> = {};
    for (const item of itemsRes.data ?? []) {
      countMap[item.list_id] = (countMap[item.list_id] ?? 0) + 1;
      if (!coverMap[item.list_id]) {
        coverMap[item.list_id] = (item.items as any)?.image_url ?? null;
      }
    }

    // Build collaborator map (excluding current user from their own shared cards)
    const collabMap: Record<string, Collaborator[]> = {};
    for (const row of collabDataRes.data ?? []) {
      if (!(row as any).profile) continue;
      if (!collabMap[row.list_id]) collabMap[row.list_id] = [];
      collabMap[row.list_id].push({
        user_id: row.user_id,
        profile: (row as any).profile as Collaborator['profile'],
      });
    }

    setMyLists(
      ownedRaw.map((l) => ({
        ...l,
        itemCount: countMap[l.id] ?? 0,
        coverUrl: coverMap[l.id] ?? null,
        collaborators: collabMap[l.id] ?? [],
      }))
    );

    setSharedLists(
      sharedRaw.map((l) => ({
        ...l,
        itemCount: countMap[l.id] ?? 0,
        coverUrl: coverMap[l.id] ?? null,
        // Show all collaborators (others can see who else is on the list)
        collaborators: (collabMap[l.id] ?? []).filter((c) => c.user_id !== user.id),
        isShared: true,
      }))
    );

    setLoading(false);
  }

  function handleDeleted(listId: string) {
    setMyLists((prev) => prev.filter((l) => l.id !== listId));
    setEditingList(null);
  }

  function handleUpdated(updated: List) {
    setMyLists((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setEditingList(null);
  }

  const allEmpty = myLists.length === 0 && sharedLists.length === 0 && !loading;
  const hasBothSections = myLists.length > 0 && sharedLists.length > 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
          Lists
        </Text>
        <Button
          label="+ New"
          variant="secondary"
          size="sm"
          onPress={() => setShowCreate(true)}
        />
      </View>

      {allEmpty ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 32, textAlign: 'center' }}>≡</Text>
          <Text variant="h3" align="center" style={{ marginTop: spacing[3] }}>
            No lists yet
          </Text>
          <Text variant="body" color="secondary" align="center" style={{ marginTop: spacing[2] }}>
            Create lists to organise your ratings and share with friends.
          </Text>
          <View style={{ marginTop: spacing[4] }}>
            <Button
              label="Create first list"
              variant="primary"
              size="md"
              onPress={() => setShowCreate(true)}
            />
          </View>
        </View>
      ) : (
        <FlatList
          data={myLists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          ListHeaderComponent={
            hasBothSections ? (
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                MY LISTS
              </Text>
            ) : null
          }
          ListFooterComponent={
            sharedLists.length > 0 ? (
              <View style={{ marginTop: hasBothSections ? spacing[6] : 0 }}>
                <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                  SHARED WITH ME
                </Text>
                {sharedLists.map((list, i) => (
                  <View key={list.id} style={{ marginBottom: i < sharedLists.length - 1 ? spacing[3] : 0 }}>
                    <ListCard
                      list={list}
                      onPress={() => router.push(`/list/${list.id}`)}
                      onEdit={undefined}
                    />
                  </View>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ListCard
              list={item}
              onPress={() => router.push(`/list/${item.id}`)}
              onEdit={() => setEditingList(item)}
            />
          )}
        />
      )}

      <CreateListModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newList) => {
          setMyLists((prev) => [{ ...newList, itemCount: 0, coverUrl: null, collaborators: [] }, ...prev]);
          setShowCreate(false);
        }}
      />

      {editingList && (
        <EditListModal
          list={editingList}
          onClose={() => setEditingList(null)}
          onUpdated={handleUpdated}
          onDeleted={() => handleDeleted(editingList.id)}
        />
      )}
    </SafeAreaView>
  );
}

// ─── List Card ───────────────────────────────────────────────────────────────

function ListCard({
  list,
  onPress,
  onEdit,
}: {
  list: List;
  onPress: () => void;
  onEdit?: () => void;
}) {
  const { colors } = useTheme();
  const displayCover = list.cover_image_url ?? list.coverUrl;

  return (
    <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable style={styles.listCardMain} onPress={onPress}>
        {/* Cover thumbnail */}
        <View style={[styles.coverThumb, { backgroundColor: colors.surfaceElevated }]}>
          {displayCover ? (
            <Image source={{ uri: displayCover }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Text style={{ fontSize: 16, color: colors.textTertiary }}>≡</Text>
          )}
        </View>

        {/* Text content */}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
              {list.title}
            </Text>
            {list.is_public && <Badge label="Public" variant="neutral" />}
            {list.isShared && <Badge label="Shared" variant="neutral" />}
          </View>
          {list.description ? (
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {list.description}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Text variant="caption" color="tertiary">
              {list.itemCount} {list.itemCount === 1 ? 'track' : 'tracks'}
            </Text>
            {list.collaborators.length > 0 && (
              <>
                <Text style={{ fontSize: 11, color: colors.textTertiary }}>·</Text>
                <CollaboratorAvatars collaborators={list.collaborators} />
              </>
            )}
          </View>
        </View>
      </Pressable>

      {/* Edit button — only for owned lists */}
      {onEdit ? (
        <Pressable style={styles.editBtn} onPress={onEdit} hitSlop={8}>
          <Text style={{ fontSize: 15, color: colors.textTertiary }}>···</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateListModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (list: Omit<List, 'itemCount' | 'coverUrl' | 'collaborators'>) => void;
}) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from('lists')
      .insert({
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
      })
      .select()
      .single();

    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) {
      setTitle('');
      setDescription('');
      setIsPublic(false);
      onCreated(data);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalRoot, { backgroundColor: colors.bg }]}>
        <View style={styles.modalHeader}>
          <Text variant="h3">New list</Text>
          <Pressable onPress={onClose}>
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.modalBody}>
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
        </View>

        <View style={styles.modalFooter}>
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
            label="Create list"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!title.trim()}
            onPress={handleCreate}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditListModal({
  list,
  onClose,
  onUpdated,
  onDeleted,
}: {
  list: List;
  onClose: () => void;
  onUpdated: (updated: List) => void;
  onDeleted: () => void;
}) {
  const { colors } = useTheme();
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? '');
  const [isPublic, setIsPublic] = useState(list.is_public);
  const [coverUri, setCoverUri] = useState<string | null>(list.cover_image_url ?? null);
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

  const displayCover = coverUri ?? list.coverUrl;

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
          {/* Cover image picker */}
          <Pressable onPress={pickImage} disabled={uploading}>
            <View
              style={[
                styles.coverPicker,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
              ]}
            >
              {displayCover ? (
                <Image
                  source={{ uri: displayCover }}
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
                    {displayCover ? 'Change image' : 'Add image'}
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

          {/* Collaborators */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <CollaboratorsSection listId={list.id} />

          {/* Spacing so delete button isn't hidden by keyboard */}
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

// ─── Toggle Row ───────────────────────────────────────────────────────────────

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  list: {
    padding: spacing[5],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: spacing[3],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  listCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
  },
  coverThumb: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
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
  divider: {
    height: 1,
    marginVertical: spacing[2],
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
