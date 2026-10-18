'use client';

import { useActionState, useEffect, type FormEvent } from 'react';
import { updatePassword } from '@/lib/supabase/actions';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/auth/PasswordField';
import { AUTH_LIMITS } from '@/lib/constants/limits';
import type { AuthActionResult } from '@/types';

interface Props {
  // 설정 다이얼로그에서만 넘김 — 있으면 서버 액션이 리다이렉트 대신 success를 반환해 이 신호로 다이얼로그를 닫는다
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function ResetPasswordForm({ onSuccess, onDirtyChange }: Props = {}) {
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(
    (_prev, formData) => updatePassword(formData),
    {},
  );

  useEffect(() => {
    if (state.success) onSuccess?.();
  }, [state.success, onSuccess]);

  function handleInput(event: FormEvent<HTMLFormElement>) {
    const data = new FormData(event.currentTarget);
    onDirtyChange?.(Boolean(data.get('password') || data.get('passwordConfirm')));
  }

  return (
    <form action={formAction} onInput={handleInput} className="flex flex-col gap-4">
      <input type="hidden" name="redirectOnSuccess" value={onSuccess ? '0' : '1'} />

      <PasswordField
        id="reset-password"
        name="password"
        label={`새 비밀번호 (${AUTH_LIMITS.PASSWORD_MIN_LENGTH}자 이상)`}
        autoComplete="new-password"
        minLength={AUTH_LIMITS.PASSWORD_MIN_LENGTH}
        required
        disabled={pending}
      />

      <PasswordField
        id="reset-password-confirm"
        name="passwordConfirm"
        label="새 비밀번호 확인"
        autoComplete="new-password"
        required
        disabled={pending}
      />

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button
        type="submit"
        disabled={pending}
        variant="default"
        size="lg"
        className="w-full font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {pending ? '변경 중...' : '비밀번호 변경'}
      </Button>
    </form>
  );
}
