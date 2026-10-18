'use client';

import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { NOTICE_MESSAGES } from '@/lib/constants/messages';

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DiscardChangesDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <ConfirmDialog
      open={open}
      title={NOTICE_MESSAGES.discardTitle}
      description={NOTICE_MESSAGES.discardMessage}
      confirmLabel={NOTICE_MESSAGES.discardConfirm}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
