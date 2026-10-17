import type { ToastMessage } from '@pomoroutine/shared';

// zustand 스토어 액션처럼 React 트리 바깥에서도 호출 가능해야 해서 간단한 pub/sub으로 구현한다
type Listener = (toast: ToastMessage | null) => void;

const TOAST_DURATION_MS = 3000;

let currentId = 0;
let timeoutId: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

export function toast(message: ToastMessage) {
  const id = ++currentId;
  listeners.forEach((listener) => listener(message));

  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    if (id !== currentId) return;
    listeners.forEach((listener) => listener(null));
  }, TOAST_DURATION_MS);
}

export function subscribeToast(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
