'use client';

import { toast } from '@/lib/toast';
import { Modal } from '@/components/shared/Modal';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { TOAST_MESSAGES } from '@/lib/constants/messages';

interface Props {
  title: string;
  onClose: () => void;
}

export function PasswordChangeDialog({ title, onClose }: Props) {
  function handleSuccess() {
    toast(TOAST_MESSAGES.passwordUpdated(title));
    onClose();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <ResetPasswordForm onSuccess={handleSuccess} />
    </Modal>
  );
}
