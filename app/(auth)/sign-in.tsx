import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { spacing } from '@/theme';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // Navigation handled by root layout listening to auth state
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
          {/* Back */}
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
              Welcome back
            </Text>
            <Text variant="body" color="secondary" style={{ marginTop: spacing[2] }}>
              Sign in to your Vibecheck account.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="current-password"
              returnKeyType="done"
              value={password}
              onChangeText={setPassword}
              error={error ?? undefined}
              onSubmitEditing={handleSignIn}
            />
          </View>

          <Button
            label="Sign in"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleSignIn}
          />

          <View style={styles.footer}>
            <Text variant="body" color="secondary" align="center">
              No account?{' '}
            </Text>
            <Button
              label="Sign up"
              variant="ghost"
              size="sm"
              onPress={() => router.replace('/(auth)/sign-up')}
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
    gap: spacing[6],
    justifyContent: 'center',
  },
  header: {
    gap: 0,
  },
  form: {
    gap: spacing[4],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
});
