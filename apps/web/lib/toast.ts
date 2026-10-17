import { toast as sonnerToast } from 'sonner';
import type { ToastMessage } from '@pomoroutine/shared';

export function toast({ type, message }: ToastMessage): void {
  sonnerToast[type](message);
}
