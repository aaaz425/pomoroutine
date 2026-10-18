'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { SessionListItem } from '@/components/journal/SessionListItem';
import { Button } from '@/components/ui/button';
import type { Category, Session, Task } from '@/types';
import { useCloseOnNativeTabBlur } from '@/hooks/useCloseOnNativeTabBlur';
import { SheetGrabber } from '@/components/shared/SheetGrabber';
import { useSheetDrag } from '@/hooks/useSheetDrag';

interface Props {
  date: Date | null;
  sessions: Session[];
  tasks: Task[];
  categories: Category[];
  selectedId: string | null;
  onSelectSession: (session: Session, sessionIndex: number) => void;
  onClose: () => void;
}

export function CalendarDayModal({
  date,
  sessions,
  tasks,
  categories,
  selectedId,
  onSelectSession,
  onClose,
}: Props) {
  useCloseOnNativeTabBlur(onClose);
  const { sheetRef, handleProps } = useSheetDrag<HTMLDivElement>({ onDismiss: onClose });

  if (!date) return null;

  const label = date.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="backdrop-enter fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Popup
          ref={sheetRef}
          aria-label="날짜별 기록"
          className={[
            'sheet-enter fixed z-50 bg-card border border-border shadow-2xl overflow-y-auto outline-none',
            'bottom-0 left-0 right-0 rounded-t-2xl max-h-[82vh] standalone:pb-[env(safe-area-inset-bottom)]',
            'sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:pb-0',
            'sm:w-[480px] sm:rounded-xl sm:max-h-[85vh]',
          ].join(' ')}
        >
          <SheetGrabber {...handleProps} className="sticky top-0 z-10 bg-card pb-1 touch-none" />
          <div className="flex flex-col gap-3 p-5 pt-3 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">{label}</h2>
              <DialogPrimitive.Close
                aria-label="닫기"
                render={<Button variant="ghost" size="icon" />}
              >
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>

            {sessions.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                이 날은 기록이 없어요
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {sessions.map((session, displayIdx) => {
                  const task = tasks.find((t) => t.id === session.taskId) ?? null;
                  const category = task
                    ? (categories.find((c) => c.id === task.categoryId) ?? null)
                    : null;
                  return (
                    <SessionListItem
                      key={session.id}
                      session={session}
                      task={task}
                      category={category}
                      sessionIndex={sessions.length - 1 - displayIdx}
                      isSelected={selectedId === session.id}
                      onSelect={() => onSelectSession(session, sessions.length - 1 - displayIdx)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
