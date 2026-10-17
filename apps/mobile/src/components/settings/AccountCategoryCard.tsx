import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { KeyRound, LogOut, Mail, Trash2 } from 'lucide-react-native';
import { Text } from '@/components/shared/Text';
import { useAuth } from '@/store/AuthProvider';
import { SettingsMenuRow } from '@/components/shared/SettingsMenuRow';
import { SettingsRowGroup } from '@/components/settings/SettingsRowGroup';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  onPasswordChangePress: () => void;
  onDeleteAccountPress: () => void;
}

export function AccountCategoryCard({ onPasswordChangePress, onDeleteAccountPress }: Props) {
  const theme = useThemeTokens();
  const { user, logout } = useAuth();
  const isKakao = user?.user_metadata?.provider === 'kakao';

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <SettingsRowGroup>
      <ProfileSection />

      <View style={styles.emailRow}>
        <View style={styles.left}>
          <Mail size={16} color={theme.mutedForeground} />
          <Text style={[styles.label, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}>
            이메일
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.email, { color: theme.mutedForeground, fontFamily: FONTS.sansRegular }]}
        >
          {user?.email ?? '카카오 계정'}
        </Text>
      </View>

      <SettingsMenuRow
        Icon={KeyRound}
        label={isKakao ? '비밀번호 설정' : '비밀번호 변경'}
        value=""
        onPress={onPasswordChangePress}
      />
      <SettingsMenuRow
        Icon={LogOut}
        label="로그아웃"
        value=""
        onPress={() => void handleLogout()}
      />
      <SettingsMenuRow
        Icon={Trash2}
        label="회원탈퇴"
        value=""
        destructive
        onPress={onDeleteAccountPress}
      />
    </SettingsRowGroup>
  );
}

const styles = StyleSheet.create({
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 14,
  },
  email: {
    flexShrink: 1,
    fontSize: 12,
  },
});
