'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { toSafeRedirectPath } from '@/lib/supabase/redirect';
import {
  LoginCredentialsSchema,
  SignupCredentialsSchema,
  ForgotPasswordSchema,
  NewPasswordSchema,
} from '@/types/schemas';
import { AUTH_ERROR_MESSAGES } from '@/lib/constants/messages';
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
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_MESSAGES.invalidInput };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.message === 'Email not confirmed') {
      return { error: AUTH_ERROR_MESSAGES.emailNotConfirmed };
    }
    if (error.status === 429) {
      return { error: AUTH_ERROR_MESSAGES.tooManyRequests };
    }
    if (error.message === 'Invalid login credentials') {
      const provider = await getExistingProvider(supabase, parsed.data.email);
      if (provider === 'kakao') {
        return { error: AUTH_ERROR_MESSAGES.kakaoAccount };
      }
      return { error: AUTH_ERROR_MESSAGES.invalidCredentials };
    }
    return { error: AUTH_ERROR_MESSAGES.loginFailed };
  }

  redirect(toSafeRedirectPath(formData.get('redirectTo'), '/'));
}

export async function signup(formData: FormData): Promise<AuthActionResult> {
  const parsed = SignupCredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_MESSAGES.invalidInput };
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
      return { error: AUTH_ERROR_MESSAGES.tooManyRequests };
    }
    return { error: AUTH_ERROR_MESSAGES.signupFailed };
  }

  // 이미 가입+인증된 이메일이면 Supabase는 에러 없이 identities가 빈 배열인 응답을 준다
  if (data.user && data.user.identities?.length === 0) {
    const provider = await getExistingProvider(supabase, parsed.data.email);
    if (provider === 'kakao') {
      return { error: AUTH_ERROR_MESSAGES.kakaoAccount };
    }
    return { error: AUTH_ERROR_MESSAGES.emailAlreadyRegistered };
  }

  return { pendingConfirmation: true };
}

export async function requestPasswordReset(formData: FormData): Promise<AuthActionResult> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_MESSAGES.invalidInput };
  }

  const origin = (await headers()).get('origin') ?? '';
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/reset-confirm`,
  });

  if (error?.status === 429) {
    return { error: AUTH_ERROR_MESSAGES.tooManyRequests };
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
    return { error: parsed.error.issues[0]?.message ?? AUTH_ERROR_MESSAGES.invalidInput };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    if (error.code === 'same_password') {
      return { error: AUTH_ERROR_MESSAGES.samePassword };
    }
    return { error: AUTH_ERROR_MESSAGES.passwordUpdateFailed };
  }

  // 설정 다이얼로그 호출 시엔 리다이렉트 없이 닫기만 해야 해서 hidden 필드로 분기한다
  if (formData.get('redirectOnSuccess') === '1') {
    redirect('/');
  }

  return { success: true };
}

export async function loginWithKakao(formData: FormData): Promise<void> {
  const origin = (await headers()).get('origin') ?? '';
  const next = toSafeRedirectPath(formData.get('redirectTo'), '/');

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
    return { error: data?.error ?? AUTH_ERROR_MESSAGES.deleteAccountFailed };
  }

  await supabase.auth.signOut();
  redirect('/landing');
}

export async function deleteAccountWithPassword(formData: FormData): Promise<AuthActionResult> {
  const password = formData.get('password');
  if (typeof password !== 'string' || password.length === 0) {
    return { error: AUTH_ERROR_MESSAGES.passwordRequired };
  }

  const supabase = await createClient();
  return callDeleteAccount(supabase, { password });
}

export async function deleteAccountConfirmed(): Promise<AuthActionResult> {
  const supabase = await createClient();
  return callDeleteAccount(supabase, {});
}
