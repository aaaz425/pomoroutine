import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/shared/Text';
import { supabase } from '@/lib/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

// 세션 교환이 끝나면 onAuthStateChange가 반영하고 (app)/_layout이 알아서 앱으로 전환한다
export default function AuthConfirmScreen() {
  const { token_hash: tokenHash } = useLocalSearchParams<{ token_hash?: string }>();
  const theme = useThemeTokens();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (!tokenHash) {
      router.replace('/login');
      return;
    }

    supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash }).then(({ error }) => {
      if (error) {
        setError('인증에 실패했어요. 다시 시도해주세요');
        return;
      }
      router.replace('/');
    });
  }, [tokenHash]);

  return (
    <AuthShell>
      <View style={styles.wrap}>
        {error ? (
          <>
            <Text
              style={[styles.error, { color: theme.destructive, fontFamily: FONTS.sansRegular }]}
            >
              {error}
            </Text>
          </>
        ) : (
          <>
            <ActivityIndicator color={theme.primary} />
            <Text
              style={[
                styles.message,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              인증 처리 중이에요...
            </Text>
          </>
        )}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  message: {
    fontSize: 14,
  },
  error: {
    fontSize: 14,
    textAlign: 'center',
  },
});
