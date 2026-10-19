import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/shared/Text';
import { useTimerStore } from '@/store/StoreProvider';
import { useTimer } from '@/hooks/useTimer';
import { useThemeScheme, useColorTheme } from '@/hooks/use-theme-scheme';
import { phaseHex, PHASE_LABELS, phaseBadge, THEME } from '@/constants/timerColors';
import { withAlpha, formatClock } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { TimerGlow } from './TimerGlow';

const BASE = 240;
const SW = 18;
const R = BASE / 2 - SW / 2;
const CIRC = 2 * Math.PI * R;
const FREE_MODE_RING_CYCLE_SECONDS = 300; // 5분 주기로 링이 채워졌다 비워지며 반복
// 웹은 sm/lg에서 220/240px로 커지지만, 앱은 폰 화면 전용이라 모바일 사이즈(180px)만 사용
const SIZE = 180;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function TimerRing() {
  const scheme = useThemeScheme();
  const { colorTheme } = useColorTheme();
  const { displaySeconds, phase, mode } = useTimer();
  const totalSeconds = useTimerStore((s) =>
    s.phase === 'focus' ? s.settings.focusMinutes * 60 : s.settings.shortBreakMinutes * 60,
  );
  const isRunning = useTimerStore((s) => s.startedAt !== null);
  const sessionStarted = useTimerStore((s) => s.sessionStarted);
  const isPaused = sessionStarted && !isRunning;
  const isIdle = !sessionStarted && !isRunning;
  const isNeutral = isIdle || isPaused;
  const statusLabel = isIdle ? '대기 중' : isPaused ? '일시정지' : PHASE_LABELS[phase];

  // free 모드는 목표치가 없으므로 5분 주기로 링을 채웠다 비우며 반복해 "진행 중"을 애니메이션으로 알림
  const elapsedFraction =
    mode === 'free'
      ? (displaySeconds % FREE_MODE_RING_CYCLE_SECONDS) / FREE_MODE_RING_CYCLE_SECONDS
      : totalSeconds > 0
        ? (totalSeconds - displaySeconds) / totalSeconds
        : 0;
  const dashOffset = CIRC * (1 - elapsedFraction);
  const color = isNeutral ? THEME[scheme].mutedForeground : phaseHex(phase, scheme, colorTheme);
  const badge = phaseBadge(phase, scheme, colorTheme);

  const progress = useSharedValue(dashOffset);
  useEffect(() => {
    progress.value = withTiming(dashOffset, { duration: 1000, easing: Easing.linear });
  }, [dashOffset, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: progress.value,
  }));

  const timeLabel = formatClock(displaySeconds);

  const badgeBg = isNeutral ? withAlpha(THEME[scheme].muted, 0.6) : badge.bg;
  const badgeDot = isNeutral ? withAlpha(THEME[scheme].mutedForeground, 0.5) : badge.dot;
  const badgeText = isNeutral ? THEME[scheme].mutedForeground : badge.text;

  return (
    <View style={styles.container}>
      <TimerGlow phase={phase} isNeutral={isNeutral} />
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${BASE} ${BASE}`} style={styles.ringRotate}>
        <Circle
          cx={BASE / 2}
          cy={BASE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeOpacity={0.1}
          strokeWidth={SW}
        />
        <AnimatedCircle
          cx={BASE / 2}
          cy={BASE / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={SW}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          animatedProps={animatedProps}
        />
      </Svg>

      <View style={styles.center}>
        <Text
          style={[styles.time, { color: THEME[scheme].foreground, fontFamily: FONTS.monoBold }]}
        >
          {timeLabel}
        </Text>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <View style={[styles.badgeDot, { backgroundColor: badgeDot }]} />
          <Text style={[styles.badgeText, { color: badgeText, fontFamily: FONTS.sansSemiBold }]}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringRotate: {
    transform: [{ rotate: '-90deg' }],
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  time: {
    fontSize: 28,
    lineHeight: 28,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
