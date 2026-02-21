import { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { spacing } from '@/theme';
import { supabase } from '@/lib/supabase';

export default function SignUpScreen() {
  const { colors } = useTheme();
  // Deep link: vibecheck://signup?code=INVITECODE
  const { code: deepLinkCode } = useLocalSearchParams<{ code?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState(deepLinkCode ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: 'vibecheck://',
        data: {
          username: username.trim(),
          invite_code_used: inviteCode.trim() || null,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // Root layout will redirect based on profile.is_active
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Button
            label="← Back"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            style={{ alignSelf: 'flex-start' }}
          />

          <View style={styles.header}>
            <Text
              style={{
                fontSize: 34,
                fontWeight: '800',
                color: colors.text,
                letterSpacing: -0.8,
              }}
            >
              Create account
            </Text>
            <Text variant="body" color="secondary" style={{ marginTop: spacing[2] }}>
              Build your taste profile, one rating at a time.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Username"
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              value={username}
              onChangeText={setUsername}
            />
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry
              returnKeyType="next"
              value={password}
              onChangeText={setPassword}
            />

            {/* Invite code field */}
            <View>
              <Input
                label="Invite code"
                placeholder="Enter code (required)"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                value={inviteCode}
                onChangeText={setInviteCode}
                error={error ?? undefined}
                iconRight={
                  deepLinkCode ? (
                    <Badge label="Auto-filled" variant="accent" />
                  ) : undefined
                }
              />
            </View>
          </View>

          <Button
            label="Create account"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleSignUp}
          />

          <Text variant="caption" color="tertiary" align="center">
            By signing up you agree to our Terms and Privacy Policy.
          </Text>

          <View style={styles.footer}>
            <Text variant="body" color="secondary">
              Already have an account?{' '}
            </Text>
            <Button
              label="Sign in"
              variant="ghost"
              size="sm"
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: spacing[5],
    gap: spacing[5],
  },
  header: {},
  form: {
    gap: spacing[4],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
