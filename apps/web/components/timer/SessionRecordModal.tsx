'use client';

import { buildSessionRecord, formatDuration } from '@pomoroutine/shared';
import { INPUT_LIMITS } from '@/lib/constants/limits';
import { useState } from 'react';
import Link from 'next/link';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Check } from 'lucide-react';
import { useTimerStore, useTimerStoreApi, useHydrated } from '@/store/StoreProvider';
import { useSessionMutations } from '@/hooks/useSessionMutations';
import { useCurrentTask } from '@/hooks/useCurrentTask';
import { useResolved } from '@/hooks/useResolved';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { SessionProgressBadge } from '@/components/timer/SessionProgressBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SessionTaskSelector } from '@/components/timer/SessionTaskSelector';
import { Button } from '@/components/ui/button';
import { MemoTextarea } from '@/components/shared/MemoTextarea';
import { FocusRatingPicker } from '@/components/shared/FocusRatingPicker';
import { DistractionTagPicker } from '@/components/shared/DistractionTagPicker';
import type { FocusRating } from '@/types';
import { SheetGrabber } from '@/components/shared/SheetGrabber';
import { useSheetDrag } from '@/hooks/useSheetDrag';

interface Props {
  loggedInPromise: Promise<boolean>;
}

const SHEET_POPUP_CLASS = [
  'fixed z-50 bg-card border border-border shadow-2xl overflow-y-auto outline-none',
  'bottom-0 left-0 right-0 rounded-t-2xl max-h-[82vh] standalone:pb-[env(safe-area-inset-bottom)]',
  'sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:pb-0',
  'sm:w-[600px] sm:rounded-xl sm:max-h-[85vh]',
].join(' ');

function RecordCompleteHeader() {
  return (
    <>
      <div className="flex items-center justify-center w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-full bg-primary/20">
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary">
          <Check className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </div>
      <h2 className="text-[26px] font-bold tracking-tight text-foreground text-center">
        집중 완료!
      </h2>
    </>
  );
}

export function SessionRecordModal({ loggedInPromise }: Props) {
  const hydrated = useHydrated();
  const loggedIn = useResolved(loggedInPromise);
  const sessionEnded = useTimerStore((s) => s.sessionEnded);
  const sessionEndedAt = useTimerStore((s) => s.sessionEndedAt);

  if (!hydrated || !sessionEnded || sessionEndedAt === null || loggedIn === undefined) return null;
  return loggedIn ? <SessionRecordForm sessionEndedAt={sessionEndedAt} /> : <GuestRecordPrompt />;
}

function GuestRecordPrompt() {
  const dismissSessionRecord = useTimerStore((s) => s.dismissSessionRecord);
  const cycleCount = useTimerStore((s) => s.cycleCount);
  const mode = useTimerStore((s) => s.mode);
  const accFocusSeconds = useTimerStore((s) => s.accFocusSeconds);

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && dismissSessionRecord()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="backdrop-enter fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Popup
          aria-label="집중 완료"
          className={`sheet-enter ${SHEET_POPUP_CLASS}`}
        >
          <div className="flex flex-col items-center gap-5 p-5 sm:gap-7 sm:p-10">
            <div className="flex flex-col items-center gap-4">
              <RecordCompleteHeader />
              <p className="text-sm text-muted-foreground text-center">
                {mode !== 'free' && `${cycleCount}사이클 동안 `}
                {formatDuration(accFocusSeconds)} 집중했어요
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                로그인하고 기록 남기기
              </Link>
              <Button onClick={dismissSessionRecord} variant="ghost" size="lg">
                닫기
              </Button>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SessionRecordForm({ sessionEndedAt }: { sessionEndedAt: number }) {
  const timerStore = useTimerStoreApi();
  const dismissSessionRecord = useTimerStore((s) => s.dismissSessionRecord);
  const currentTaskId = useTimerStore((s) => s.currentTaskId);

  const { task, category } = useCurrentTask();
  const { addSession, isAdding } = useSessionMutations();

  const [note, setNote] = useState('');
  const [focusRating, setFocusRating] = useState<FocusRating | null>(null);
  const [distractionTags, setDistractionTags] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<'skip' | 'save' | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { sheetRef, handleProps } = useSheetDrag<HTMLDivElement>({
    onDismiss: () => setPendingAction('skip'),
    snapBackOnDismiss: true,
  });

  const isTaskSession = currentTaskId !== null;

  function handleSave() {
    if (isAdding) return;
    addSession(
      buildSessionRecord(
        { ...timerStore.getState(), sessionEndedAt },
        {
          taskId: isTaskSession ? currentTaskId : selectedTaskId,
          note,
          focusRating,
          distractionTags,
        },
      ),
      {
        onSuccess: dismissSessionRecord,
        onSettled: () => setPendingAction(null),
      },
    );
  }

  return (
    <>
      <DialogPrimitive.Root
        open
        onOpenChange={(open) => {
          if (!open) setPendingAction('skip');
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
          <DialogPrimitive.Popup
            ref={sheetRef}
            aria-label="기록 작성"
            className={SHEET_POPUP_CLASS}
          >
            <SheetGrabber {...handleProps} className="sticky top-0 z-10 bg-card pb-1 touch-none" />
            <div className="flex flex-col gap-5 p-5 pt-3 sm:gap-7 sm:p-10">
              {/* Header */}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col items-center gap-4">
                  <RecordCompleteHeader />
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />
              </div>

              {/* Session Summary */}
              {isTaskSession ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-2 min-w-0">
                    <span className="text-lg font-semibold tracking-tight text-foreground truncate">
                      {task?.title ?? '작업 없음'}
                    </span>
                    {category && task && (
                      <CategoryBadge category={category} className="self-start" />
                    )}
                  </div>
                  <SessionProgressBadge />
                </div>
              ) : (
                <SessionTaskSelector selectedTaskId={selectedTaskId} onSelect={setSelectedTaskId} />
              )}

              {/* Focus Rating Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  집중도 (선택)
                </span>
                <FocusRatingPicker value={focusRating} onChange={setFocusRating} />
              </div>

              {/* Distraction Tags Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  방해요소 (선택)
                </span>
                <DistractionTagPicker value={distractionTags} onChange={setDistractionTags} />
              </div>

              {/* Note Section */}
              <div className="flex flex-col gap-2.5">
                <MemoTextarea
                  aria-label="메모"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="무엇을 집중해서 했나요? 짧게 메모해두면 나중에 돌아볼 수 있어요."
                  className={[
                    'w-full h-[90px] sm:h-[120px] resize-none rounded-md border-border',
                    'bg-card dark:bg-card px-3.5 py-3 text-base text-foreground',
                    'placeholder:text-muted-foreground/50',
                    'outline-none focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring/50',
                  ].join(' ')}
                />
                <div className="flex justify-end">
                  <span className="text-[11px] text-muted-foreground/60">
                    {note.length} / {INPUT_LIMITS.NOTE_MAX_LENGTH}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={() => setPendingAction('skip')}
                  variant="ghost"
                  size="lg"
                  className="px-4 py-2.5"
                >
                  건너뛰기
                </Button>
                <Button
                  onClick={() => setPendingAction('save')}
                  variant="default"
                  size="lg"
                  className="gap-2 px-5 py-2.5 font-semibold hover:bg-primary/90"
                >
                  <Check className="w-4 h-4" strokeWidth={2.5} />
                  기록 완료
                </Button>
              </div>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <ConfirmDialog
        open={pendingAction === 'skip'}
        title="기록을 건너뛸까요?"
        description="작성한 메모는 저장되지 않아요"
        confirmLabel="건너뛰기"
        onConfirm={dismissSessionRecord}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={pendingAction === 'save'}
        title="기록을 저장할까요?"
        confirmLabel="저장"
        onConfirm={handleSave}
        onCancel={() => setPendingAction(null)}
        loading={isAdding}
      />
    </>
  );
}
