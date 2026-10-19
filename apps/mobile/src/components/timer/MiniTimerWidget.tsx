import { Pressable, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play } from 'lucide-react-native';
import { Text } from '@/components/shared/Text';
import { useTimer } from '@/hooks/useTimer';
import { useTimerStore, useHydrated } from '@/store/StoreProvider';
import { phaseBadge } from '@/constants/timerColors';
import { withAlpha, formatClock } from '@pomoroutine/shared';
import { BOTTOM_NAV_HEIGHT } from '@/constants/navItems';
import { FONTS } from '@/constants/fonts';
import { useThemeScheme, useThemeTokens, useColorTheme } from '@/hooks/use-theme-scheme';

// 타이머 탭이 아닌 다른 탭에 있을 때 하단 탭바 위에 캡슐형 위젯으로 진행 상황을 계속 보여준다
export function MiniTimerWidget() {
  const scheme = useThemeScheme();
  const { colorTheme } = useColorTheme();
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const { displaySeconds, isRunning, phase, mode, cycleCount } = useTimer();
  const totalCycles = useTimerStore((s) => s.settings.totalCycles);
  const sessionStarted = useTimerStore((s) => s.sessionStarted);
  const pause = useTimerStore((s) => s.pause);
  const start = useTimerStore((s) => s.start);

  if (!hydrated || !sessionStarted || pathname === '/') return null;

  const phaseStyles = phaseBadge(phase, scheme, colorTheme);
  const dotColor = isRunning ? phaseStyles.dot : withAlpha(theme.mutedForeground, 0.5);
  const iconColor = isRunning ? phaseStyles.text : theme.mutedForeground;

  return (
    <View
      style={[styles.root, { bottom: BOTTOM_NAV_HEIGHT + insets.bottom + 12 }]}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable style={styles.info} onPress={() => router.push('/')}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[styles.clock, { color: theme.foreground, fontFamily: FONTS.sansSemiBold }]}>
            {formatClock(displaySeconds)}
          </Text>
          <Text
            style={[styles.label, { color: theme.mutedForeground, fontFamily: FONTS.sansRegular }]}
          >
            {mode === 'free'
              ? '자유 집중'
              : `${phase === 'focus' ? '집중' : '휴식'} · ${cycleCount}/${totalCycles}`}
          </Text>
        </Pressable>
        <Pressable
          onPress={isRunning ? pause : start}
          hitSlop={4}
          style={styles.playButton}
          accessibilityLabel={isRunning ? '타이머 일시정지' : '타이머 재생'}
        >
          {isRunning ? (
            <Pause size={14} color={iconColor} fill={iconColor} />
          ) : (
            <Play size={14} color={iconColor} fill={iconColor} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clock: {
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});
