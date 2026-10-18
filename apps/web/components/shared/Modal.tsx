'use client';

import type { ReactNode } from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetGrabber } from '@/components/shared/SheetGrabber';
import { DiscardChangesDialog } from '@/components/shared/DiscardChangesDialog';
import { useCloseOnNativeTabBlur } from '@/hooks/useCloseOnNativeTabBlur';
import { useDiscardConfirm } from '@/hooks/useDiscardConfirm';
import { useSheetDrag } from '@/hooks/useSheetDrag';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
  backdropClassName?: string;
  maxHeightClassName?: string;
  bodyClassName?: string;
  dirty?: boolean;
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  widthClassName = 'sm:w-[400px]',
  backdropClassName = 'bg-black/50 backdrop-blur-sm',
  maxHeightClassName = 'max-h-[85vh]',
  bodyClassName = 'flex flex-col gap-5 p-5 overflow-y-auto min-h-0',
  dirty = false,
}: Props) {
  const { requestClose, confirmProps } = useDiscardConfirm(onClose, dirty);
  useCloseOnNativeTabBlur(onClose);
  const { sheetRef, handleProps } = useSheetDrag<HTMLDivElement>({
    onDismiss: requestClose,
    snapBackOnDismiss: dirty,
  });

  return (
    <>
      <DialogPrimitive.Root
        open
        onOpenChange={(open) => {
          if (!open) requestClose();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            forceRender
            className={`backdrop-enter fixed inset-0 z-50 ${backdropClassName}`}
          />
          <DialogPrimitive.Popup
            ref={sheetRef}
            aria-label={title}
            className={[
              'sheet-enter fixed z-50 flex flex-col bg-card border border-border shadow-2xl outline-none',
              `bottom-0 left-0 right-0 rounded-t-2xl standalone:pb-[env(safe-area-inset-bottom)] ${maxHeightClassName}`,
              'sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-0',
              widthClassName,
            ].join(' ')}
          >
            {/* 본문 스크롤과 경합하지 않도록 그래버+헤더만 드래그 영역으로 둔다 */}
            <div {...handleProps} className="touch-none shrink-0 sm:touch-auto">
              <SheetGrabber />
              <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-border sm:py-4">
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label="닫기"
                  render={<Button variant="ghost" size="icon" />}
                >
                  <X className="w-4 h-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className={bodyClassName}>{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0">
                {footer}
              </div>
            )}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <DiscardChangesDialog {...confirmProps} />
    </>
  );
}
