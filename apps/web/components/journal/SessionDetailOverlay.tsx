'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { JournalDetailPanel } from '@/components/journal/JournalDetailPanel';
import type { Category, Session, Task } from '@/types';
import { useCloseOnNativeTabBlur } from '@/hooks/useCloseOnNativeTabBlur';
import { SheetGrabber } from '@/components/shared/SheetGrabber';
import { useSheetDrag } from '@/hooks/useSheetDrag';

interface Props {
  session: Session | null;
  sessionIndex: number;
  task: Task | null;
  category: Category | null;
  onClose: () => void;
  onUpdated: (patch: Partial<Session>) => void;
  onDeleted: () => void;
}

export function SessionDetailOverlay({
  session,
  sessionIndex,
  task,
  category,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  useCloseOnNativeTabBlur(onClose);
  const { sheetRef, handleProps } = useSheetDrag<HTMLDivElement>({ onDismiss: onClose });

  if (!session) return null;

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
          aria-label="기록 상세"
          className={[
            'sheet-enter fixed z-50 bg-card border border-border shadow-2xl overflow-y-auto outline-none',
            'bottom-0 left-0 right-0 rounded-t-2xl max-h-[82vh] standalone:pb-[env(safe-area-inset-bottom)]',
            'sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:pb-0',
            'sm:w-[600px] sm:rounded-xl sm:max-h-[85vh]',
          ].join(' ')}
        >
          <SheetGrabber {...handleProps} className="sticky top-0 z-10 bg-card pb-1 touch-none" />
          <div className="p-5 pt-3 sm:p-6">
            <JournalDetailPanel
              session={session}
              sessionIndex={sessionIndex}
              task={task}
              category={category}
              onBack={onClose}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
