/**
 * Shared collaborator UI — invite by username, display avatars.
 * Used in both the lists screen edit modal and list detail edit modal.
 */
import { useEffect, useState } from 'react';
import { View, Image, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './ui/Text';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { spacing } from '@/theme';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Collaborator = {
  user_id: string;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
};

// ─── AvatarBubble ─────────────────────────────────────────────────────────────

export function AvatarBubble({
  profile,
  size = 28,
}: {
  profile: { display_name: string; avatar_url: string | null };
  size?: number;
}) {
  const { colors } = useTheme();
  const initial = (profile.display_name || '?')[0].toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {profile.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={{ width: size, height: size }} />
      ) : (
        <Text
          style={{
            fontSize: Math.round(size * 0.42),
            fontWeight: '700',
            color: colors.text,
            lineHeight: size,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

// ─── CollaboratorAvatars ──────────────────────────────────────────────────────

export function CollaboratorAvatars({ collaborators }: { collaborators: Collaborator[] }) {
  const { colors } = useTheme();
  if (!collaborators.length) return null;

  const MAX = 4;
  const visible = collaborators.slice(0, MAX);
  const extra = collaborators.length - MAX;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {visible.map((c, i) => (
        <View key={c.user_id} style={{ marginLeft: i === 0 ? 0 : -7 }}>
          <AvatarBubble profile={c.profile} size={20} />
        </View>
      ))}
      {extra > 0 && (
        <Text
          style={{
            fontSize: 11,
            color: colors.textTertiary,
            marginLeft: spacing[1],
            fontWeight: '600',
          }}
        >
          +{extra}
        </Text>
      )}
    </View>
  );
}

// ─── CollaboratorsSection ─────────────────────────────────────────────────────

export function CollaboratorsSection({ listId }: { listId: string }) {
  const { colors } = useTheme();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    loadCollaborators();
  }, [listId]);

  async function loadCollaborators() {
    setLoading(true);
    const { data } = await supabase
      .from('list_collaborators')
      .select('user_id, profile:profiles(username, display_name, avatar_url)')
      .eq('list_id', listId);

    if (data) {
      setCollaborators(
        data
          .filter((r) => r.profile)
          .map((r) => ({
            user_id: r.user_id,
            profile: r.profile as Collaborator['profile'],
          }))
      );
    }
    setLoading(false);
  }

  async function handleInvite() {
    const trimmed = inviteUsername.trim().toLowerCase();
    if (!trimmed) return;
    setInviting(true);
    setInviteError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setInviting(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .eq('username', trimmed)
      .single();

    if (!profile) {
      setInviteError('User not found. Check the username.');
      setInviting(false);
      return;
    }

    if (profile.id === user.id) {
      setInviteError("That's you!");
      setInviting(false);
      return;
    }

    if (collaborators.some((c) => c.user_id === profile.id)) {
      setInviteError('Already a collaborator.');
      setInviting(false);
      return;
    }

    const { error } = await supabase
      .from('list_collaborators')
      .insert({ list_id: listId, user_id: profile.id, invited_by: user.id });

    if (error) {
      setInviteError('Could not add collaborator. Try again.');
      setInviting(false);
      return;
    }

    setCollaborators((prev) => [
      ...prev,
      {
        user_id: profile.id,
        profile: {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
      },
    ]);
    setInviteUsername('');
    setInviting(false);
  }

  async function handleRemove(userId: string) {
    await supabase
      .from('list_collaborators')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', userId);
    setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
  }

  return (
    <View style={{ gap: spacing[3] }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.textSecondary,
          letterSpacing: 0.3,
        }}
      >
        COLLABORATORS
      </Text>

      {/* Invite row */}
      <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="@username"
            value={inviteUsername}
            onChangeText={(t) => {
              setInviteUsername(t);
              setInviteError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Button
          label="Invite"
          variant="secondary"
          size="sm"
          disabled={!inviteUsername.trim() || inviting}
          loading={inviting}
          onPress={handleInvite}
        />
      </View>

      {inviteError && (
        <Text variant="caption" color="negative">
          {inviteError}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={colors.textTertiary} />
      ) : collaborators.length === 0 ? (
        <Text variant="caption" color="tertiary">
          No collaborators yet. Invite someone by their username.
        </Text>
      ) : (
        collaborators.map((c) => (
          <View
            key={c.user_id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}
          >
            <AvatarBubble profile={c.profile} size={32} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyMedium">{c.profile.display_name}</Text>
              <Text variant="caption" color="secondary">
                @{c.profile.username}
              </Text>
            </View>
            <Pressable onPress={() => handleRemove(c.user_id)} hitSlop={8}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.negative }}>
                Remove
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}
