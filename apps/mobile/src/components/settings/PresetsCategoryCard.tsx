import { StyleSheet, View } from 'react-native';
import { ListChecks, MessageSquareQuote, Palette, Tags, Timer } from 'lucide-react-native';
import { COLOR_THEMES } from '@pomoroutine/shared';
import { useTasks, useCategories } from '@/hooks/useTasks';
import { useSettingsStore } from '@/store/StoreProvider';
import { SettingsMenuRow } from '@/components/shared/SettingsMenuRow';
import { SettingsRowGroup } from '@/components/settings/SettingsRowGroup';
import { useThemeMode, type ThemeMode } from '@/hooks/use-theme-scheme';

interface Props {
  onOpenTheme: () => void;
  onOpenTimer: () => void;
  onOpenTask: () => void;
  onOpenCategory: () => void;
  onOpenMotivational: () => void;
}

const THEME_MODE_LABELS: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
};

export function PresetsCategoryCard({
  onOpenTheme,
  onOpenTimer,
  onOpenTask,
  onOpenCategory,
  onOpenMotivational,
}: Props) {
  const { mode, colorTheme } = useThemeMode();
  const taskCount = useTasks().length;
  const categoryCount = useCategories().length;
  const defaultTimerSettings = useSettingsStore((s) => s.defaultTimerSettings);
  const motivationalCount = useSettingsStore((s) => s.motivationalMessages.length);

  return (
    <View style={styles.container}>
      <SettingsRowGroup>
        <SettingsMenuRow
          Icon={Palette}
          label="테마"
          value={`${THEME_MODE_LABELS[mode]} · ${COLOR_THEMES[colorTheme].label}`}
          onPress={onOpenTheme}
        />
        <SettingsMenuRow
          Icon={Timer}
          label="타이머 기본값"
          value={`${defaultTimerSettings.focusMinutes}분 / ${defaultTimerSettings.totalCycles}회 / ${defaultTimerSettings.shortBreakMinutes}분`}
          onPress={onOpenTimer}
        />
        <SettingsMenuRow
          Icon={ListChecks}
          label="작업 관리"
          value={`${taskCount}개`}
          onPress={onOpenTask}
        />
        <SettingsMenuRow
          Icon={Tags}
          label="카테고리 관리"
          value={`${categoryCount}개`}
          onPress={onOpenCategory}
        />
        <SettingsMenuRow
          Icon={MessageSquareQuote}
          label="동기부여 메시지"
          value={`${motivationalCount}개`}
          onPress={onOpenMotivational}
        />
      </SettingsRowGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
});
