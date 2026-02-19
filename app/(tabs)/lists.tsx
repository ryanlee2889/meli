/**
 * Lists screen — personal lists with cover art and real counts.
 */
import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';

type List = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  itemCount: number;
  coverUrl: string | null;
};

export default function ListsScreen() {
  const { colors } = useTheme();
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rawLists } = await supabase
      .from('lists')
      .select('id, title, description, is_public, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (!rawLists || rawLists.length === 0) {
      setLists([]);
      setLoading(false);
      return;
    }

    const listIds = rawLists.map((l) => l.id);

    // Fetch all list_items for these lists in one query
    const { data: listItems } = await supabase
      .from('list_items')
      .select('list_id, items(image_url)')
      .in('list_id', listIds);

    // Build cover + count maps
    const countMap: Record<string, number> = {};
    const coverMap: Record<string, string | null> = {};

    for (const item of listItems ?? []) {
      countMap[item.list_id] = (countMap[item.list_id] ?? 0) + 1;
      if (!coverMap[item.list_id]) {
        coverMap[item.list_id] = (item.items as any)?.image_url ?? null;
      }
    }

    setLists(
      rawLists.map((l) => ({
        ...l,
        itemCount: countMap[l.id] ?? 0,
        coverUrl: coverMap[l.id] ?? null,
      }))
    );
    setLoading(false);
  }

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

      {lists.length === 0 && !loading ? (
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
          data={lists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/list/${item.id}`)}>
              <ListCard list={item} />
            </Pressable>
          )}
        />
      )}

      <CreateListModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newList) => {
          setLists((prev) => [{ ...newList, itemCount: 0, coverUrl: null }, ...prev]);
          setShowCreate(false);
        }}
      />
    </SafeAreaView>
  );
}

function ListCard({ list }: { list: List }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Cover thumbnail */}
      <View style={[styles.coverThumb, { backgroundColor: colors.surfaceElevated }]}>
        {list.coverUrl ? (
          <Image source={{ uri: list.coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: 16, color: colors.textTertiary }}>≡</Text>
        )}
      </View>

      {/* Text content */}
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
            {list.title}
          </Text>
          {list.is_public && <Badge label="Public" variant="neutral" />}
        </View>
        {list.description ? (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {list.description}
          </Text>
        ) : null}
        <Text variant="caption" color="tertiary">
          {list.itemCount} {list.itemCount === 1 ? 'track' : 'tracks'}
        </Text>
      </View>

      <Text style={{ fontSize: 16, color: colors.textTertiary }}>›</Text>
    </View>
  );
}

function CreateListModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (list: Omit<List, 'itemCount' | 'coverUrl'>) => void;
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

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
    if (insertError) { setError(insertError.message); return; }
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
            <Text variant="caption" color="negative" align="center" style={{ marginBottom: spacing[3] }}>
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
        <Text variant="caption" color="secondary">{description}</Text>
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
            { backgroundColor: colors.surface, transform: [{ translateX: value ? 16 : 0 }] },
          ]}
        />
      </View>
    </Pressable>
  );
}

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
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
  },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  coverThumb: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modalRoot: { flex: 1, padding: spacing[5] },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  modalBody: { gap: spacing[4] },
  modalFooter: { marginTop: 'auto', paddingTop: spacing[6] },
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
