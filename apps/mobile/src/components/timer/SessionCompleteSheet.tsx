import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { router } from 'expo-router';
import { normalizeFocusPeriods, formatDuration, TOAST_MESSAGES } from '@pomoroutine/shared';
import type { FocusRating } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { useTimerStore } from '@/store/StoreProvider';
import { useAuth } from '@/store/AuthProvider';
import { useCurrentTask } from '@/hooks/useCurrentTask';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { Portal } from '@/components/shared/Portal';
import { SheetGrabber } from '@/components/shared/SheetGrabber';
import { FocusRatingPicker } from '@/components/shared/FocusRatingPicker';
import { DistractionTagPicker } from '@/components/shared/DistractionTagPicker';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { toast } from '@/lib/toast';
import { insertSession } from '@/lib/supabase/sessions';
import { createSheetDismissGesture } from '@/lib/sheetDismissGesture';
import { SessionCompleteHeader } from './SessionCompleteHeader';
import { SessionTaskSummary } from './SessionTaskSummary';
import { SessionMemoField } from './SessionMemoField';
import { SessionActionButtons } from './SessionActionButtons';

function SessionCompleteSheetContent() {
  const theme = useThemeTokens();
  const { session } = useAuth();

  const sessionEnded = useTimerStore((s) => s.sessionEnded);
  const dismissSessionRecord = useTimerStore((s) => s.dismissSessionRecord);
  const cycleCount = useTimerStore((s) => s.cycleCount);
  const totalCycles = useTimerStore((s) => s.settings.totalCycles);
  const mode = useTimerStore((s) => s.mode);
  const currentTaskId = useTimerStore((s) => s.currentTaskId);
  const sessionStartedAt = useTimerStore((s) => s.sessionStartedAt);
  const sessionEndedAt = useTimerStore((s) => s.sessionEndedAt);
  const accFocusSeconds = useTimerStore((s) => s.accFocusSeconds);
  const rawFocusPeriods = useTimerStore((s) => s.rawFocusPeriods);

  const { task, category } = useCurrentTask();

  const [note, setNote] = useState('');
  const [focusRating, setFocusRating] = useState<FocusRating | null>(null);
  const [distractionTags, setDistractionTags] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<'skip' | 'save' | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const translateY = useSharedValue(0);
  const sheetHeight = useSharedValue(0);
  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));
  const dismissGesture = createSheetDismissGesture({
    translateY,
    sheetHeight,
    onDismiss: () => setPendingAction('skip'),
    snapBackOnDismiss: true,
  });

  if (!sessionEnded || sessionEndedAt === null) return null;

  function resetForm() {
    setNote('');
    setFocusRating(null);
    setDistractionTags([]);
    setSelectedTaskId(null);
    setPendingAction(null);
  }

  function handleSkip() {
    dismissSessionRecord();
    resetForm();
  }

  if (!session) {
    return (
      <Modal visible={sessionEnded} animationType="fade" transparent onRequestClose={handleSkip}>
        <View style={styles.root}>
          <Pressable style={styles.backdrop} onPress={handleSkip} />
          <View style={styles.sheetWrap} pointerEvents="box-none">
            <View
              style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <SafeAreaView edges={['bottom']}>
                <View style={styles.scrollOuter}>
                  <View style={styles.headerGroup}>
                    <SessionCompleteHeader />
                  </View>

                  <Text
                    style={[
                      styles.summaryText,
                      { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
                    ]}
                  >
                    {mode !== 'free' && `${cycleCount}사이클 동안 `}
                    {formatDuration(accFocusSeconds)} 집중했어요
                  </Text>

                  <View style={styles.guestActions}>
                    <Pressable
                      onPress={() => {
                        resetForm();
                        dismissSessionRecord();
                        router.push('/login');
                      }}
                      style={[styles.cta, { backgroundColor: theme.primary }]}
                    >
                      <Text
                        style={[
                          styles.ctaText,
                          { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
                        ]}
                      >
                        로그인하고 기록 남기기
                      </Text>
                    </Pressable>
                    <Pressable onPress={handleSkip} style={styles.closeButton}>
                      <Text
                        style={[
                          styles.closeText,
                          { color: theme.mutedForeground, fontFamily: FONTS.sansMedium },
                        ]}
                      >
                        닫기
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </SafeAreaView>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const isTaskSession = currentTaskId !== null;
  const now = sessionEndedAt;
  const totalElapsed = sessionStartedAt
    ? Math.floor((now - sessionStartedAt) / 1000)
    : accFocusSeconds;
  const pausedSeconds = Math.max(0, totalElapsed - accFocusSeconds);

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    const taskId = isTaskSession ? currentTaskId : selectedTaskId;
    const focusPeriods = normalizeFocusPeriods(
      rawFocusPeriods.map((p) => ({
        start: new Date(p.start).toISOString(),
        end: new Date(p.end).toISOString(),
      })),
    );
    const { error } = await insertSession({
      taskId,
      title: null,
      mode,
      startedAt: new Date(sessionStartedAt ?? now).toISOString(),
      endedAt: new Date(now).toISOString(),
      completedCycles: mode === 'free' ? 0 : cycleCount,
      totalCycles: mode === 'free' ? 0 : totalCycles,
      focusSeconds: accFocusSeconds,
      pausedSeconds,
      focusPeriods,
      note: note.trim() || null,
      focusRating,
      distractionTags,
    });
    setPendingAction(null);
    setIsSaving(false);
    if (error) {
      toast(TOAST_MESSAGES.sessionSaveFailed);
      return;
    }
    toast(TOAST_MESSAGES.sessionSaved);
    dismissSessionRecord();
    setNote('');
    setFocusRating(null);
    setDistractionTags([]);
    setSelectedTaskId(null);
  }

  return (
    <Modal
      visible={sessionEnded}
      animationType="fade"
      transparent
      onRequestClose={() => setPendingAction('skip')}
    >
      {/* RN <Modal>은 별도 네이티브 루트라 앱 루트의 GestureHandlerRootView가 닿지 않음 */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={styles.backdrop} onPress={() => setPendingAction('skip')} />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <Animated.View
            onLayout={(event) => sheetHeight.set(event.nativeEvent.layout.height)}
            style={[
              styles.sheet,
              { backgroundColor: theme.card, borderColor: theme.border },
              sheetAnimatedStyle,
            ]}
          >
            <GestureDetector gesture={dismissGesture}>
              <View style={styles.grabberArea}>
                <SheetGrabber />
              </View>
            </GestureDetector>
            <SafeAreaView edges={['bottom']}>
              <ScrollView
                contentContainerStyle={styles.scrollOuter}
                keyboardShouldPersistTaps="handled"
              >
                {/* 입력창 바깥(비어있는 영역)을 탭하면 키보드를 내려 blur를 유도한다 —
                      RN ScrollView는 keyboardShouldPersistTaps="handled"만으로는 자식이
                      처리하지 않은 빈 영역 탭에서도 blur가 안정적으로 발동하지 않는다. */}
                <Pressable style={styles.scrollContent} onPress={() => Keyboard.dismiss()}>
                  <View style={styles.headerGroup}>
                    <SessionCompleteHeader />
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  </View>

                  <SessionTaskSummary
                    isTaskSession={isTaskSession}
                    task={task}
                    category={category}
                    selectedTaskId={selectedTaskId}
                    onSelectTask={setSelectedTaskId}
                  />

                  <View style={styles.field}>
                    <Text
                      style={[
                        styles.sectionLabel,
                        { color: theme.mutedForeground, fontFamily: FONTS.sansSemiBold },
                      ]}
                    >
                      집중도 (선택)
                    </Text>
                    <FocusRatingPicker value={focusRating} onChange={setFocusRating} />
                  </View>

                  <View style={styles.field}>
                    <Text
                      style={[
                        styles.sectionLabel,
                        { color: theme.mutedForeground, fontFamily: FONTS.sansSemiBold },
                      ]}
                    >
                      방해요소 (선택)
                    </Text>
                    <DistractionTagPicker value={distractionTags} onChange={setDistractionTags} />
                  </View>

                  <SessionMemoField value={note} onChange={setNote} />

                  <SessionActionButtons
                    onSkip={() => setPendingAction('skip')}
                    onSave={() => setPendingAction('save')}
                  />
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>

        <ConfirmModal
          visible={pendingAction === 'skip'}
          title="기록을 건너뛸까요?"
          description="작성한 메모는 저장되지 않아요"
          confirmLabel="건너뛰기"
          destructive
          onConfirm={handleSkip}
          onCancel={() => setPendingAction(null)}
        />

        <ConfirmModal
          visible={pendingAction === 'save'}
          title="기록을 저장할까요?"
          confirmLabel="저장"
          onConfirm={handleSave}
          onCancel={() => setPendingAction(null)}
          loading={isSaving}
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

export function SessionCompleteSheet() {
  return (
    <Portal>
      <SessionCompleteSheetContent />
    </Portal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  grabberArea: {
    paddingBottom: 4,
  },
  scrollOuter: {
    padding: 20,
    paddingTop: 12,
  },
  scrollContent: {
    gap: 20,
  },
  headerGroup: {
    gap: 10,
  },
  divider: {
    height: 1,
  },
  summaryText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  guestActions: {
    gap: 8,
    marginTop: 12,
  },
  cta: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 14,
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
  },
  field: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
