import { useState } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/shared/Text';
import { useAuth } from '@/store/AuthProvider';
import { useTimerStore } from '@/store/StoreProvider';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { PasswordField } from '@/components/auth/PasswordField';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// 1단계 확인 후, 이메일 계정은 비밀번호로 카카오 계정은 카카오 재인증으로 본인 확인을 한다
export function DeleteAccountModal({ visible, onClose }: Props) {
  const theme = useThemeTokens();
  const { user, deleteAccount, loginWithKakao } = useAuth();
  const sessionStarted = useTimerStore((s) => s.sessionStarted);

  const [step, setStep] = useState<'confirm' | 'verify'>('confirm');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isKakao = user?.user_metadata?.provider === 'kakao';

  function handleClose() {
    setStep('confirm');
    setPassword('');
    setError(null);
    setPending(false);
    onClose();
  }

  async function handleKakaoReauthAndDelete() {
    setPending(true);
    setError(null);
    const kakaoResult = await loginWithKakao();
    if (kakaoResult.error) {
      setPending(false);
      setError(kakaoResult.error);
      return;
    }
    const result = await deleteAccount();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/login');
  }

  async function handlePasswordDelete() {
    if (!password) return;
    setPending(true);
    setError(null);
    const result = await deleteAccount(password);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/login');
  }

  if (step === 'confirm') {
    return (
      <ConfirmModal
        visible={visible}
        title="정말 탈퇴하시겠어요?"
        description={`모든 작업, 기록, 설정이 영구 삭제되며 복구할 수 없어요.${sessionStarted ? ' 진행 중인 타이머도 기록되지 않고 사라져요.' : ''}`}
        confirmLabel="다음"
        destructive
        onConfirm={() => setStep('verify')}
        onCancel={handleClose}
      />
    );
  }

  if (isKakao) {
    return (
      <ConfirmModal
        visible={visible}
        title="카카오 계정 확인"
        description={error ?? '카카오로 다시 인증하면 탈퇴가 진행돼요.'}
        confirmLabel={pending ? '확인 중...' : '카카오로 확인하고 탈퇴'}
        destructive
        onConfirm={handleKakaoReauthAndDelete}
        onCancel={handleClose}
        loading={pending}
      />
    );
  }

  return (
    <RNModal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.foreground, fontFamily: FONTS.sansSemiBold }]}>
            본인 확인
          </Text>
          <Text
            style={[
              styles.description,
              { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
            ]}
          >
            비밀번호를 입력해주세요.
          </Text>
          <PasswordField
            label="비밀번호"
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
            editable={!pending}
          />
          {error && (
            <Text
              style={[styles.error, { color: theme.destructive, fontFamily: FONTS.sansRegular }]}
            >
              {error}
            </Text>
          )}
          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={[styles.button, { backgroundColor: theme.muted }]}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.foreground, fontFamily: FONTS.sansSemiBold },
                ]}
              >
                취소
              </Text>
            </Pressable>
            <Pressable
              onPress={handlePasswordDelete}
              disabled={pending || !password}
              style={[
                styles.button,
                { backgroundColor: theme.destructive },
                (pending || !password) && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
                ]}
              >
                {pending ? '탈퇴 중...' : '탈퇴하기'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 16,
  },
  description: {
    fontSize: 14,
  },
  error: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 14,
  },
});
