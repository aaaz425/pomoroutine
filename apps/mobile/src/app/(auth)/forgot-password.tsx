import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { Text } from '@/components/shared/Text';
import { useAuth } from '@/store/AuthProvider';
import { AuthShell } from '@/components/auth/AuthShell';
import { TextInput } from '@/components/shared/TextInput';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

export default function ForgotPasswordScreen() {
  const theme = useThemeTokens();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);

  async function handleSubmit() {
    if (pending) return;
    setPending(true);
    setError(null);
    const result = await requestPasswordReset(email);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.pendingConfirmation) setPendingConfirmation(true);
  }

  if (pendingConfirmation) {
    return (
      <AuthShell>
        <View style={styles.confirmPanel}>
          <View style={[styles.iconCircle, { backgroundColor: withAlpha(theme.primary, 0.1) }]}>
            <Mail size={28} color={theme.primary} />
          </View>
          <View style={styles.confirmTextGroup}>
            <Text
              style={[
                styles.confirmTitle,
                { color: theme.foreground, fontFamily: FONTS.sansSemiBold },
              ]}
            >
              이메일을 확인해주세요
            </Text>
            <Text
              style={[
                styles.confirmBody,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              {email}로 비밀번호 재설정 링크를 보냈어요.{'\n'}메일함(스팸함 포함)에서 링크를
              눌러주세요.
            </Text>
          </View>
          <Link href="/login" asChild>
            <Pressable>
              <Text style={[styles.link, { color: theme.primary, fontFamily: FONTS.sansMedium }]}>
                로그인 페이지로
              </Text>
            </Pressable>
          </Link>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="비밀번호 찾기">
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
            {pending ? '전송 중...' : '재설정 링크 보내기'}
          </Text>
        </Pressable>

        <Link href="/login" asChild>
          <Pressable>
            <Text
              style={[
                styles.footer,
                { color: theme.primary, fontFamily: FONTS.sansMedium, textAlign: 'center' },
              ]}
            >
              로그인 페이지로 돌아가기
            </Text>
          </Pressable>
        </Link>
      </View>
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
  footer: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
  },
  confirmPanel: {
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTextGroup: {
    alignItems: 'center',
    gap: 4,
  },
  confirmTitle: {
    fontSize: 16,
  },
  confirmBody: {
    fontSize: 14,
    textAlign: 'center',
  },
});
