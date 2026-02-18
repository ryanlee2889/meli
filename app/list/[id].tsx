/**
 * List detail — view items, manage collaborators.
 */
import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { spacing, radii } from '@/theme';
import { supabase } from '@/lib/supabase';

type ListDetail = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  is_collaborative: boolean;
};

type ListItem = {
  item_id: string;
  created_at: string;
  items: {
    id: string;
    name: string;
    artists_json: any;
    image_url: string | null;
  };
  added_by?: { username: string };
};

export default function ListDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [list, setList] = useState<ListDetail | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadList();
  }, [id]);

  async function loadList() {
    const [{ data: listData }, { data: itemData }] = await Promise.all([
      supabase.from('lists').select('*').eq('id', id).single(),
      supabase
        .from('list_items')
        .select('*, items(*), added_by:profiles(username)')
        .eq('list_id', id)
        .order('created_at', { ascending: false }),
    ]);

    setList(listData);
    setItems(itemData ?? []);
    setLoading(false);
  }

  if (loading || !list) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ fontSize: 22, color: colors.textSecondary }}>←</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.item_id}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Pressable onPress={() => router.back()} style={{ marginBottom: spacing[2] }}>
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>← Back</Text>
            </Pressable>

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
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                {list.is_collaborative && <Badge label="Collab" variant="accent" />}
                {list.is_public && <Badge label="Public" variant="neutral" />}
              </View>
            </View>

            {list.description && (
              <Text variant="body" color="secondary" style={{ marginTop: spacing[2] }}>
                {list.description}
              </Text>
            )}

            <Text
              variant="caption"
              color="tertiary"
              style={{ marginTop: spacing[2], marginBottom: spacing[4] }}
            >
              {items.length} {items.length === 1 ? 'track' : 'tracks'}
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
        }
        renderItem={({ item, index }) => <TrackRow item={item} index={index} />}
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
    </SafeAreaView>
  );
}

function TrackRow({ item, index }: { item: ListItem; index: number }) {
  const { colors } = useTheme();
  const artists = Array.isArray(item.items?.artists_json)
    ? item.items.artists_json.join(', ')
    : String(item.items?.artists_json ?? '');

  return (
    <View style={styles.trackRow}>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  listContent: { paddingBottom: spacing[10] },
  listHeader: {
    padding: spacing[5],
    paddingBottom: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
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
  header: {
    padding: spacing[5],
  },
});
