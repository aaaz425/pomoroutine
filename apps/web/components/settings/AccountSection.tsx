'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { KeyRound, LogOut, Mail, Trash2 } from 'lucide-react';
import { logout, deleteAccountWithPassword, loginWithKakao } from '@/lib/supabase/actions';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { SettingsMenuRow } from '@/components/shared/SettingsMenuRow';
import { PasswordField } from '@/components/auth/PasswordField';
import { PasswordChangeDialog } from '@/components/settings/PasswordChangeDialog';
import { cn } from '@/lib/utils';
import { useTimerStore } from '@/store/StoreProvider';
import { STORAGE_KEYS } from '@/types';
import type { AuthActionResult } from '@/types';

interface Props {
  user: { email: string | null; provider: string | null } | null;
}

export function AccountSection({ user }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sessionStarted = useTimerStore((s) => s.sessionStarted);
  const [verifying, setVerifying] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [state, formAction, pending] = useActionState<AuthActionResult, FormData>(
    (_prev, formData) => {
      localStorage.removeItem(STORAGE_KEYS.activeTimer);
      return deleteAccountWithPassword(formData);
    },
    {},
  );

  if (!user) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <p className="text-sm text-muted-foreground">로그인이 필요해요</p>
        <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          로그인
        </Link>
      </div>
    );
  }

  // 카카오 로그인은 이메일 동의 없이 가입될 수 있어 email이 없을 수 있다
  const label = user.email ?? '카카오 계정';
  const isKakao = user.provider === 'kakao';

  async function handleLogout() {
    // activeTimer는 계정과 무관하게 저장되므로, 다음 사용자에게 남의 타이머가 보이지 않도록 로그아웃 시 정리
    localStorage.removeItem(STORAGE_KEYS.activeTimer);
    await logout();
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">이메일</span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{label}</span>
      </div>

      <SettingsMenuRow
        Icon={KeyRound}
        label={isKakao ? '비밀번호 설정' : '비밀번호 변경'}
        value=""
        onClick={() => setShowPasswordDialog(true)}
      />

      {!verifying && (
        <>
          <SettingsMenuRow Icon={LogOut} label="로그아웃" value="" onClick={handleLogout} />
          <SettingsMenuRow
            Icon={Trash2}
            label="회원탈퇴"
            value=""
            destructive
            onClick={() => setConfirmOpen(true)}
          />
        </>
      )}

      {verifying &&
        (isKakao ? (
          <div className="m-4 flex flex-col gap-2 rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">
              카카오 계정 확인이 필요해요. 카카오로 다시 인증하면 탈퇴가 진행돼요.
            </p>
            <div className="flex gap-2">
              <form action={loginWithKakao}>
                <input type="hidden" name="redirectTo" value="/settings?confirmDelete=1" />
                <Button type="submit" variant="destructive" size="sm">
                  카카오로 확인하고 탈퇴
                </Button>
              </form>
              <Button type="button" variant="outline" size="sm" onClick={() => setVerifying(false)}>
                취소
              </Button>
            </div>
          </div>
        ) : (
          <form
            action={formAction}
            className="m-4 flex flex-col gap-3 rounded-lg border border-border p-4"
          >
            <p className="text-sm text-muted-foreground">
              본인 확인을 위해 비밀번호를 입력해주세요.
            </p>
            <PasswordField
              id="delete-account-password"
              name="password"
              label="비밀번호"
              autoComplete="current-password"
              required
              disabled={pending}
            />
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                {pending ? '탈퇴 중...' : '탈퇴하기'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setVerifying(false)}>
                취소
              </Button>
            </div>
          </form>
        ))}

      <ConfirmDialog
        open={confirmOpen}
        title="정말 탈퇴하시겠어요?"
        description={`모든 작업, 기록, 설정이 영구 삭제되며 복구할 수 없어요.${sessionStarted ? ' 진행 중인 타이머도 기록되지 않고 사라져요.' : ''}`}
        confirmLabel="탈퇴 계속하기"
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmOpen(false);
          setVerifying(true);
        }}
        onCancel={() => setConfirmOpen(false)}
      />

      {showPasswordDialog && (
        <PasswordChangeDialog
          title={isKakao ? '비밀번호 설정' : '비밀번호 변경'}
          onClose={() => setShowPasswordDialog(false)}
        />
      )}
    </>
  );
}
