/**
 * Lists screen — personal + collaborative lists.
 */
import { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  TextInput,
  Modal,
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
  is_collaborative: boolean;
  item_count?: number;
  created_at: string;
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

    const { data } = await supabase
      .from('lists')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });

    setLists(data ?? []);
    setLoading(false);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <Text
          style={{ fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}
        >
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
          <Button
            label="Create first list"
            variant="primary"
            size="md"
            onPress={() => setShowCreate(true)}
            style={{ marginTop: spacing[4] }}
          />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing[3] }} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/list/${item.id}`)}>
              <Card gap={spacing[2]}>
                <View style={styles.listItemHeader}>
                  <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    {item.is_collaborative && (
                      <Badge label="Collab" variant="accent" />
                    )}
                    {item.is_public && (
                      <Badge label="Public" variant="neutral" />
                    )}
                  </View>
                </View>
                {item.description && (
                  <Text variant="caption" color="secondary" numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <Text variant="caption" color="tertiary">
                  {item.item_count ?? 0} tracks
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      <CreateListModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newList) => {
          setLists((prev) => [newList, ...prev]);
          setShowCreate(false);
        }}
      />
    </SafeAreaView>
  );
}

function CreateListModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (list: List) => void;
}) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('lists')
      .insert({
        owner_user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        is_public: isPublic,
        is_collaborative: isCollaborative,
      })
      .select()
      .single();

    setLoading(false);
    if (data) onCreated(data);
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

          {/* Toggles */}
          <ToggleRow
            label="Public"
            description="Anyone can view this list"
            value={isPublic}
            onToggle={() => setIsPublic((v) => !v)}
          />
          <ToggleRow
            label="Collaborative"
            description="Invite others to add tracks"
            value={isCollaborative}
            onToggle={() => setIsCollaborative((v) => !v)}
          />
        </View>

        <View style={styles.modalFooter}>
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
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
