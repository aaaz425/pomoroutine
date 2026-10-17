import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Text } from '@/components/shared/Text';
import { useAuth } from '@/store/AuthProvider';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { KakaoButton } from '@/components/auth/KakaoButton';
import { TextInput } from '@/components/shared/TextInput';
import { PasswordField } from '@/components/auth/PasswordField';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

export default function LoginScreen() {
  const theme = useThemeTokens();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await login(email, password);
    setPending(false);
    if (result.error) setError(result.error);
    // 성공 시엔 AuthProvider의 onAuthStateChange가 세션을 갱신 → 루트 레이아웃이 자동으로 전환
  }

  return (
    <AuthShell>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text
            style={[styles.label, { color: theme.mutedForeground, fontFamily: FONTS.sansMedium }]}
          >
            이메일
          </Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!pending}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <PasswordField
          label="비밀번호"
          autoComplete="current-password"
          editable={!pending}
          value={password}
          onChangeText={setPassword}
        />

        <Link href="/forgot-password" asChild>
          <Pressable style={styles.forgotPassword}>
            <Text
              style={[
                styles.forgotPasswordText,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              비밀번호를 잊으셨나요?
            </Text>
          </Pressable>
        </Link>

        {error && (
          <Text style={[styles.error, { color: theme.destructive, fontFamily: FONTS.sansRegular }]}>
            {error}
          </Text>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={pending}
          style={[styles.submit, { backgroundColor: theme.primary }, pending && styles.disabled]}
        >
          <Text
            style={[
              styles.submitText,
              { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
            ]}
          >
            {pending ? '로그인 중...' : '로그인'}
          </Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text
            style={[styles.footer, { color: theme.mutedForeground, fontFamily: FONTS.sansRegular }]}
          >
            계정이 없으신가요?{' '}
          </Text>
          <Link href="/signup" asChild>
            <Pressable>
              <Text style={[styles.link, { color: theme.primary, fontFamily: FONTS.sansMedium }]}>
                회원가입
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <AuthDivider />
      <KakaoButton onError={setError} />
      <Link href="/" replace asChild>
        <Pressable style={styles.guest}>
          <Text
            style={[
              styles.guestText,
              { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
            ]}
          >
            로그인 없이 타이머 사용하기
          </Text>
        </Pressable>
      </Link>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
  },
  error: {
    fontSize: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 12,
  },
  submit: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footer: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
  },
  guest: {
    alignSelf: 'center',
  },
  guestText: {
    fontSize: 14,
  },
});
