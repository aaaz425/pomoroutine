import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import {
  buildSessionRecord,
  formatDuration,
  insertSession,
  TOAST_MESSAGES,
} from '@pomoroutine/shared';
import type { FocusRating } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { useTimerStore, useTimerStoreApi } from '@/store/StoreProvider';
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
import { supabase } from '@/lib/supabase/client';
import { createSheetDismissGesture } from '@/lib/sheetDismissGesture';
import { SessionCompleteHeader } from './SessionCompleteHeader';
import { SessionTaskSummary } from './SessionTaskSummary';
import { SessionMemoField } from './SessionMemoField';
import { SessionActionButtons } from './SessionActionButtons';

function SessionCompleteSheetContent() {
  const { session } = useAuth();
  const sessionEnded = useTimerStore((s) => s.sessionEnded);
  const sessionEndedAt = useTimerStore((s) => s.sessionEndedAt);

  if (!sessionEnded || sessionEndedAt === null) return null;
  return session ? <RecordForm sessionEndedAt={sessionEndedAt} /> : <GuestPrompt />;
}

function SheetOverlay({
  onRequestClose,
  children,
}: {
  onRequestClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [onRequestClose]);

  return (
    <Animated.View entering={FadeIn} style={styles.root}>
      {children}
    </Animated.View>
  );
}

function GuestPrompt() {
  const theme = useThemeTokens();
  const dismissSessionRecord = useTimerStore((s) => s.dismissSessionRecord);
  const cycleCount = useTimerStore((s) => s.cycleCount);
  const mode = useTimerStore((s) => s.mode);
  const accFocusSeconds = useTimerStore((s) => s.accFocusSeconds);

  return (
    <SheetOverlay onRequestClose={dismissSessionRecord}>
      <Pressable style={styles.backdrop} onPress={dismissSessionRecord} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
                <Pressable onPress={dismissSessionRecord} style={styles.closeButton}>
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
    </SheetOverlay>
  );
}

function RecordForm({ sessionEndedAt }: { sessionEndedAt: number }) {
  const theme = useThemeTokens();
  const timerStore = useTimerStoreApi();
  const dismissSessionRecord = useTimerStore((s) => s.dismissSessionRecord);
  const currentTaskId = useTimerStore((s) => s.currentTaskId);

  const { task, category } = useCurrentTask();

  const [note, setNote] = useState('');
  const [focusRating, setFocusRating] = useState<FocusRating | null>(null);
  const [distractionTags, setDistractionTags] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<'skip' | 'save' | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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

  const isTaskSession = currentTaskId !== null;

  const save = useMutation({
    mutationFn: () =>
      insertSession(
        supabase,
        buildSessionRecord(
          { ...timerStore.getState(), sessionEndedAt },
          {
            taskId: isTaskSession ? currentTaskId : selectedTaskId,
            note,
            focusRating,
            distractionTags,
          },
        ),
      ),
    onError: () => toast(TOAST_MESSAGES.sessionSaveFailed),
    onSuccess: () => {
      toast(TOAST_MESSAGES.sessionSaved);
      dismissSessionRecord();
    },
    onSettled: () => setPendingAction(null),
  });

  function handleSave() {
    if (!save.isPending) save.mutate();
  }

  return (
    <SheetOverlay onRequestClose={() => setPendingAction('skip')}>
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
        onConfirm={dismissSessionRecord}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmModal
        visible={pendingAction === 'save'}
        title="기록을 저장할까요?"
        confirmLabel="저장"
        onConfirm={handleSave}
        onCancel={() => setPendingAction(null)}
        loading={save.isPending}
      />
    </SheetOverlay>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
