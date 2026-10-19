import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import {
  Bell,
  ChevronLeft,
  Info,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { useSettings } from '@/hooks/useSettings';
import { Text } from '@/components/shared/Text';
import { useHydrated } from '@/store/StoreProvider';
import { useAuth } from '@/store/AuthProvider';
import { SettingsMenuRow } from '@/components/shared/SettingsMenuRow';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SettingsRowGroup } from '@/components/settings/SettingsRowGroup';
import { AccountCategoryCard } from '@/components/settings/AccountCategoryCard';
import { PresetsCategoryCard } from '@/components/settings/PresetsCategoryCard';
import { PasswordChangeModal } from '@/components/settings/PasswordChangeModal';
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal';
import { AboutSection } from '@/components/settings/AboutSection';
import { NotificationSection } from '@/components/settings/NotificationSection';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';
import { ThemeModal } from '@/components/settings/ThemeModal';
import { TimerDefaultsModal } from '@/components/settings/TimerDefaultsModal';
import { TaskModal } from '@/components/tasks/TaskModal';
import { CategoryModal } from '@/components/settings/CategoryModal';
import { MotivationalModal } from '@/components/settings/MotivationalModal';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { NOTICE_MESSAGES } from '@pomoroutine/shared';

type CategoryKey = 'account' | 'presets' | 'notifications' | 'about';

const CATEGORIES: { key: CategoryKey; label: string; Icon: LucideIcon }[] = [
  { key: 'account', label: '계정', Icon: User },
  { key: 'presets', label: '환경설정', Icon: SlidersHorizontal },
  { key: 'notifications', label: '알림', Icon: Bell },
  { key: 'about', label: '앱 정보', Icon: Info },
];

const TRANSITION_MS = 200;
const EASING = Easing.out(Easing.cubic);

const listEnter = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: -16 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASING },
}).duration(TRANSITION_MS);

const listExit = new Keyframe({
  0: { opacity: 1, transform: [{ translateX: 0 }] },
  100: { opacity: 0, transform: [{ translateX: -16 }], easing: EASING },
}).duration(TRANSITION_MS);

const detailEnter = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: 16 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASING },
}).duration(TRANSITION_MS);

const detailExit = new Keyframe({
  0: { opacity: 1, transform: [{ translateX: 0 }] },
  100: { opacity: 0, transform: [{ translateX: 16 }], easing: EASING },
}).duration(TRANSITION_MS);

export default function SettingsScreen() {
  const theme = useThemeTokens();
  const { user } = useAuth();
  const hydrated = useHydrated();

  const browserNotification = useSettings((s) => s.browserNotification);
  const soundAlert = useSettings((s) => s.soundAlert);

  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);

  const [openMenu, setOpenMenu] = useState<
    'theme' | 'timer' | 'task' | 'category' | 'motivational' | null
  >(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const isKakao = user?.user_metadata?.provider === 'kakao';

  // 탭 화면은 언마운트되지 않으므로, 벗어날 때 상세 화면 상태를 직접 초기화해야 함
  useFocusEffect(() => {
    return () => setActiveCategory(null);
  });

  function goTo(next: CategoryKey | null) {
    setActiveCategory(next);
  }

  if (!user)
    return (
      <NoticeScreen
        title={NOTICE_MESSAGES.guestSettings}
        actionLabel={NOTICE_MESSAGES.login}
        onAction={() => router.push('/login')}
      />
    );

  if (!hydrated) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <SettingsSkeleton />
        </SafeAreaView>
      </View>
    );
  }

  const activeLabel = CATEGORIES.find((c) => c.key === activeCategory)?.label;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.foreground, fontFamily: FONTS.sansBold }]}>
              설정
            </Text>
          </View>

          {activeCategory === null ? (
            <Animated.View key="list" entering={listEnter} exiting={listExit}>
              <SettingsRowGroup>
                {CATEGORIES.map(({ key, label, Icon }) => (
                  <SettingsMenuRow
                    key={key}
                    Icon={Icon}
                    label={label}
                    value={
                      key === 'account'
                        ? (user?.email ?? '카카오 계정')
                        : key === 'notifications'
                          ? browserNotification || soundAlert
                            ? '켜짐'
                            : '꺼짐'
                          : ''
                    }
                    onPress={() => goTo(key)}
                  />
                ))}
              </SettingsRowGroup>
            </Animated.View>
          ) : (
            <Animated.View key="detail" entering={detailEnter} exiting={detailExit}>
              <View style={styles.detail}>
                <Pressable onPress={() => goTo(null)} style={styles.backRow} hitSlop={8}>
                  <ChevronLeft size={16} color={theme.mutedForeground} />
                  <Text
                    style={[
                      styles.backLabel,
                      { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
                    ]}
                  >
                    {activeLabel}
                  </Text>
                </Pressable>

                {activeCategory === 'account' && (
                  <AccountCategoryCard
                    onPasswordChangePress={() => setShowPasswordChange(true)}
                    onDeleteAccountPress={() => setShowDeleteAccount(true)}
                  />
                )}

                {activeCategory === 'presets' && (
                  <PresetsCategoryCard
                    onOpenTheme={() => setOpenMenu('theme')}
                    onOpenTimer={() => setOpenMenu('timer')}
                    onOpenTask={() => setOpenMenu('task')}
                    onOpenCategory={() => setOpenMenu('category')}
                    onOpenMotivational={() => setOpenMenu('motivational')}
                  />
                )}

                {activeCategory === 'notifications' && (
                  <SettingsCard>
                    <NotificationSection />
                  </SettingsCard>
                )}

                {activeCategory === 'about' && (
                  <SettingsCard>
                    <AboutSection />
                  </SettingsCard>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>

      <ThemeModal visible={openMenu === 'theme'} onClose={() => setOpenMenu(null)} />
      <TimerDefaultsModal visible={openMenu === 'timer'} onClose={() => setOpenMenu(null)} />
      <TaskModal visible={openMenu === 'task'} onClose={() => setOpenMenu(null)} />
      <CategoryModal visible={openMenu === 'category'} onClose={() => setOpenMenu(null)} />
      <MotivationalModal visible={openMenu === 'motivational'} onClose={() => setOpenMenu(null)} />
      <DeleteAccountModal visible={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} />
      <PasswordChangeModal
        visible={showPasswordChange}
        title={isKakao ? '비밀번호 설정' : '비밀번호 변경'}
        onClose={() => setShowPasswordChange(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 20,
  },
  detail: {
    gap: 24,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backLabel: {
    fontSize: 14,
  },
});
