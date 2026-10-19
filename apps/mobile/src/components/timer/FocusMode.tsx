import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play, Square, X } from 'lucide-react-native';
import { Text } from '@/components/shared/Text';
import { useTimerStore } from '@/store/StoreProvider';
import { useRotatingMessage } from '@/hooks/useRotatingMessage';
import { useCurrentTask } from '@/hooks/useCurrentTask';
import { useSessionEndFlow } from '@/hooks/useSessionEndFlow';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { withAlpha, MESSAGE_ROTATE_INTERVAL_MS } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { MOTIVATIONAL_MESSAGES } from '@/constants/messages';
import { TimerRing } from './TimerRing';
import { CycleIndicator } from './CycleIndicator';

export function FocusMode() {
  const theme = useThemeTokens();
  const isFocusMode = useTimerStore((s) => s.isFocusMode);
  const isRunning = useTimerStore((s) => s.startedAt !== null);
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const exitFocusMode = useTimerStore((s) => s.exitFocusMode);
  const { task, category } = useCurrentTask();
  const { showEndConfirm, requestEnd, confirmEnd, cancelEnd } = useSessionEndFlow();
  const insets = useSafeAreaInsets();

  const message = useRotatingMessage(
    MOTIVATIONAL_MESSAGES,
    MESSAGE_ROTATE_INTERVAL_MS,
    isFocusMode,
  );

  return (
    <Modal visible={isFocusMode} animationType="fade" onRequestClose={exitFocusMode}>
      <>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <Pressable onPress={exitFocusMode} style={[styles.exitButton, { top: insets.top + 12 }]}>
            <X size={14} color={theme.mutedForeground} />
            <Text
              style={[
                styles.exitText,
                { color: theme.mutedForeground, fontFamily: FONTS.sansMedium },
              ]}
            >
              나가기
            </Text>
          </Pressable>

          <View style={styles.taskSection}>
            {task ? (
              <View style={styles.taskTitleRow}>
                <Text
                  style={[
                    styles.taskTitle,
                    { color: theme.foreground, fontFamily: FONTS.sansSemiBold },
                  ]}
                >
                  {task.title}
                </Text>
                {category && <CategoryBadge category={category} />}
              </View>
            ) : (
              <Text
                style={[
                  styles.taskTitle,
                  {
                    color: withAlpha(theme.mutedForeground, 0.5),
                    fontFamily: FONTS.sansSemiBold,
                  },
                ]}
              >
                작업 없음
              </Text>
            )}
          </View>

          <Text
            style={[
              styles.message,
              { color: withAlpha(theme.mutedForeground, 0.8), fontFamily: FONTS.sansRegular },
            ]}
          >
            {message}
          </Text>

          <TimerRing />
          <CycleIndicator />

          <View style={styles.controls}>
            <Pressable
              onPress={isRunning ? pause : start}
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            >
              {isRunning ? (
                <Pause size={14} color={theme.primaryForeground} fill={theme.primaryForeground} />
              ) : (
                <Play size={14} color={theme.primaryForeground} fill={theme.primaryForeground} />
              )}
              <Text
                style={[
                  styles.primaryText,
                  { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
                ]}
              >
                {isRunning ? '정지' : '시작'}
              </Text>
            </Pressable>

            <Pressable
              onPress={requestEnd}
              style={[styles.outlineButton, { borderColor: theme.border }]}
            >
              <Square size={14} color={theme.mutedForeground} fill={theme.mutedForeground} />
              <Text
                style={[
                  styles.outlineText,
                  { color: theme.mutedForeground, fontFamily: FONTS.sansMedium },
                ]}
              >
                종료
              </Text>
            </Pressable>
          </View>
        </View>

        {/* 바깥 자체가 이미 Modal이라 여기서 또 RN Modal을 중첩하면 타이머 종료로 둘 다
              동시에 닫힐 때 iOS에서 화면이 검게 남거나 안 뜨는 문제가 있어 inline으로 렌더링 */}
        <ConfirmModal
          inline
          visible={showEndConfirm}
          title="타이머를 종료할까요?"
          onConfirm={confirmEnd}
          onCancel={cancelEnd}
          closeOnBackdropClick
        />
      </>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 16,
  },
  exitButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  exitText: {
    fontSize: 14,
  },
  taskSection: {
    alignItems: 'center',
    gap: 8,
  },
  taskTitle: {
    fontSize: 20,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 320,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 14,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  outlineText: {
    fontSize: 14,
  },
});
