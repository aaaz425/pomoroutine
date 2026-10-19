'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTasks, useCategories } from '@/hooks/useTasks';
import { toast } from '@/lib/toast';
import { NOTICE_MESSAGES, TOAST_MESSAGES } from '@/lib/constants/messages';
import {
  Bell,
  ChevronLeft,
  Info,
  ListChecks,
  MessageSquareQuote,
  Palette,
  SlidersHorizontal,
  Tags,
  Timer,
  User,
  type LucideIcon,
} from 'lucide-react';
import { COLOR_THEMES } from '@pomoroutine/shared';
import { deleteAccountConfirmed } from '@/lib/supabase/actions';
import { AccountSection } from '@/components/settings/AccountSection';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { ThemeModal } from '@/components/settings/ThemeModal';
import { InstallSection } from '@/components/settings/InstallSection';
import { AboutSection } from '@/components/settings/AboutSection';
import { NotificationSection } from '@/components/settings/notification/NotificationSection';
import { TimerDefaultsModal } from '@/components/settings/timer-defaults/TimerDefaultsModal';
import { CategoryModal } from '@/components/settings/category/CategoryModal';
import { TaskManageModal } from '@/components/settings/task/TaskManageModal';
import { MotivationalModal } from '@/components/settings/motivational/MotivationalModal';
import { SettingsMenuRow } from '@/components/shared/SettingsMenuRow';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';
import { GuestPrompt } from '@/components/shared/GuestPrompt';
import { useSettingsStore } from '@/store/StoreProvider';
import { useDelayedHydration } from '@/hooks/useDelayedHydration';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { useAccentTheme } from '@/hooks/useAccentTheme';
import { withReducedMotion } from '@/lib/motion';
import type { SettingsUser } from '@/types';

type CategoryKey = 'account' | 'presets' | 'notifications' | 'about';
type MenuKey = 'timer' | 'task' | 'category' | 'motivational' | 'theme';

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
};

const CATEGORIES: { key: CategoryKey; label: string; Icon: LucideIcon }[] = [
  { key: 'account', label: '계정', Icon: User },
  { key: 'presets', label: '환경설정', Icon: SlidersHorizontal },
  { key: 'notifications', label: '알림', Icon: Bell },
  { key: 'about', label: '앱 정보', Icon: Info },
];

function SettingCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      {title && (
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

interface Props {
  userPromise: Promise<SettingsUser | null>;
}

export function SettingsView({ userPromise }: Props) {
  const { hydrated, showSkeleton } = useDelayedHydration();
  const reducedMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [user, setUser] = useState<SettingsUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const searchParams = useSearchParams();
  const deletingRef = useRef(false);

  const { mode } = useTheme();
  const { colorTheme } = useAccentTheme();
  const defaultTimerSettings = useSettingsStore((s) => s.defaultTimerSettings);
  const taskCount = useTasks().length;
  const categoryCount = useCategories().length;
  const motivationalCount = useSettingsStore((s) => s.motivationalMessages.length);
  const browserNotification = useSettingsStore((s) => s.browserNotification);
  const soundAlert = useSettingsStore((s) => s.soundAlert);

  useEffect(() => {
    let active = true;
    userPromise.then((u) => {
      if (!active) return;
      setUser(u);
      setUserLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [userPromise]);

  // 카카오 재인증(회원탈퇴 확인) 라운드트립 자체가 본인 확인이므로 추가 확인 없이 탈퇴를 마무리한다
  useEffect(() => {
    if (searchParams.get('confirmDelete') !== '1' || deletingRef.current) return;
    deletingRef.current = true;
    // 성공 시 redirect()로 응답이 끝나 .then이 실행되지 않음 — 실패 시에만 결과를 확인해 토스트로 알림
    deleteAccountConfirmed().then((result) => {
      if (result.error) toast(TOAST_MESSAGES.errorMessage(result.error));
    });
  }, [searchParams]);

  if (!hydrated || !userLoaded) return showSkeleton ? <SettingsSkeleton /> : null;
  if (!user) return <GuestPrompt title={NOTICE_MESSAGES.guestSettings} />;

  const activeLabel = CATEGORIES.find((c) => c.key === activeCategory)?.label;

  return (
    <>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8 lg:p-10 lg:px-0 flex flex-col gap-6 overflow-hidden">
        <header>
          <h1 className="text-xl font-bold text-foreground">설정</h1>
        </header>

        <AnimatePresence mode="popLayout" initial={false}>
          {activeCategory === null ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={withReducedMotion(!!reducedMotion, { duration: 0.2, ease: 'easeOut' })}
              className="rounded-xl border border-border bg-card divide-y divide-border"
            >
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
                  onClick={() => setActiveCategory(key)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={withReducedMotion(!!reducedMotion, { duration: 0.2, ease: 'easeOut' })}
              className="flex flex-col gap-6"
            >
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
              >
                <ChevronLeft className="w-4 h-4" />
                {activeLabel}
              </button>

              {activeCategory === 'account' && (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  <ProfileSection />
                  <AccountSection user={user} />
                </div>
              )}

              {activeCategory === 'presets' && (
                <div className="rounded-xl border border-border bg-card divide-y divide-border">
                  <SettingsMenuRow
                    Icon={Palette}
                    label="테마"
                    value={`${THEME_MODE_LABELS[mode]} · ${COLOR_THEMES[colorTheme].label}`}
                    onClick={() => setOpenMenu('theme')}
                  />
                  <SettingsMenuRow
                    Icon={Timer}
                    label="타이머 기본값"
                    value={`${defaultTimerSettings.focusMinutes}분 / ${defaultTimerSettings.totalCycles}회 / ${defaultTimerSettings.shortBreakMinutes}분`}
                    onClick={() => setOpenMenu('timer')}
                  />
                  <SettingsMenuRow
                    Icon={ListChecks}
                    label="작업 관리"
                    value={`${taskCount}개`}
                    onClick={() => setOpenMenu('task')}
                  />
                  <SettingsMenuRow
                    Icon={Tags}
                    label="카테고리 관리"
                    value={`${categoryCount}개`}
                    onClick={() => setOpenMenu('category')}
                  />
                  <SettingsMenuRow
                    Icon={MessageSquareQuote}
                    label="동기부여 메시지"
                    value={`${motivationalCount}개`}
                    onClick={() => setOpenMenu('motivational')}
                  />
                </div>
              )}

              {activeCategory === 'notifications' && (
                <SettingCard>
                  <NotificationSection />
                </SettingCard>
              )}

              {activeCategory === 'about' && (
                <div className="flex flex-col gap-6">
                  <SettingCard title="앱 설치">
                    <InstallSection />
                  </SettingCard>
                  <SettingCard>
                    <AboutSection />
                  </SettingCard>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {openMenu === 'theme' && <ThemeModal onClose={() => setOpenMenu(null)} />}
      {openMenu === 'timer' && <TimerDefaultsModal onClose={() => setOpenMenu(null)} />}
      {openMenu === 'task' && <TaskManageModal onClose={() => setOpenMenu(null)} />}
      {openMenu === 'category' && <CategoryModal onClose={() => setOpenMenu(null)} />}
      {openMenu === 'motivational' && <MotivationalModal onClose={() => setOpenMenu(null)} />}
    </>
  );
}
