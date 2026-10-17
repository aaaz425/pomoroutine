'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isValidRedirectTarget } from '@/lib/supabase/redirect';
import {
  LoginCredentialsSchema,
  SignupCredentialsSchema,
  ForgotPasswordSchema,
  NewPasswordSchema,
} from '@/types/schemas';
import type { AuthActionResult } from '@/types';

// signUp()은 이미 가입된 이메일이어도 보안상 메타데이터를 안 채워주므로, Edge Function(service_role)으로 직접 조회해야 카카오 가입 여부를 알 수 있다
async function getExistingProvider(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{
    exists: boolean;
    provider: string | null;
  }>('check-email-provider', { body: { email } });
  if (error || !data?.exists) return null;
  return data.provider;
}

export async function login(formData: FormData): Promise<AuthActionResult> {
  const parsed = LoginCredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message === 'Email not confirmed') {
      return { error: '이메일 인증이 필요해요. 받은 메일함을 확인해주세요' };
    }
    if (error.status === 429) {
      return { error: '잠시 후 다시 시도해주세요' };
    }
    if (error.message === 'Invalid login credentials') {
      const provider = await getExistingProvider(supabase, parsed.data.email);
      if (provider === 'kakao') {
        return { error: '카카오로 가입됐어요. 카카오 로그인을 이용해주세요' };
      }
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다' };
    }
    return { error: '로그인에 실패했어요. 잠시 후 다시 시도해주세요' };
  }

  const redirectTarget = formData.get('redirectTo');
  redirect(isValidRedirectTarget(redirectTarget) ? redirectTarget : '/');
}

export async function signup(formData: FormData): Promise<AuthActionResult> {
  const parsed = SignupCredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' };
  }

  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    if (error.status === 429) {
      return { error: '잠시 후 다시 시도해주세요' };
    }
    return { error: '가입에 실패했어요. 잠시 후 다시 시도해주세요' };
  }

  // 이미 가입+인증된 이메일이면 Supabase는 에러 없이 identities가 빈 배열인 응답을 준다
  if (data.user && data.user.identities?.length === 0) {
    const provider = await getExistingProvider(supabase, parsed.data.email);
    if (provider === 'kakao') {
      return { error: '카카오로 가입됐어요. 카카오 로그인을 이용해주세요' };
    }
    return { error: '이미 가입된 이메일이에요. 로그인해주세요' };
  }

  return { pendingConfirmation: true };
}

export async function requestPasswordReset(formData: FormData): Promise<AuthActionResult> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' };
  }

  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/reset-confirm`,
  });

  if (error?.status === 429) {
    return { error: '잠시 후 다시 시도해주세요' };
  }

  // 계정 존재 여부를 흘리지 않기 위해, 실패해도 성공과 동일하게 응답한다(Supabase 자체 동작과 동일)
  return { pendingConfirmation: true };
}

export async function updatePassword(formData: FormData): Promise<AuthActionResult> {
  const parsed = NewPasswordSchema.safeParse({
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: '비밀번호 변경에 실패했어요. 다시 시도해주세요' };
  }

  // 설정 다이얼로그 호출 시엔 리다이렉트 없이 닫기만 해야 해서 hidden 필드로 분기한다
  if (formData.get('redirectOnSuccess') === '1') {
    redirect('/');
  }

  return { success: true };
}

export async function loginWithKakao(formData: FormData): Promise<void> {
  const origin = (await headers()).get('origin') ?? '';
  const redirectTarget = formData.get('redirectTo');
  const next = isValidRedirectTarget(redirectTarget) ? redirectTarget : '/';

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    redirect('/login?error=auth_failed');
  }

  redirect(data.url);
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}

async function callDeleteAccount(
  supabase: SupabaseClient,
  body: { password?: string },
): Promise<AuthActionResult> {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>('delete-account', {
    body,
  });

  if (error || data?.error) {
    return { error: data?.error ?? '탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요' };
  }

  await supabase.auth.signOut();
  redirect('/landing');
}

export async function deleteAccountWithPassword(formData: FormData): Promise<AuthActionResult> {
  const password = formData.get('password');
  if (typeof password !== 'string' || password.length === 0) {
    return { error: '비밀번호를 입력해주세요' };
  }

  const supabase = await createClient();
  return callDeleteAccount(supabase, { password });
}

export async function deleteAccountConfirmed(): Promise<AuthActionResult> {
  const supabase = await createClient();
  return callDeleteAccount(supabase, {});
}
