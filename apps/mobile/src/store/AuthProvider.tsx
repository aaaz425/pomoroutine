import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EmailOtpType, Session, User } from '@supabase/supabase-js';
import { login as kakaoLogin } from '@react-native-seoul/kakao-login';
import { AUTH_LIMITS } from '@pomoroutine/shared';
import { supabase } from '@/lib/supabase/client';
import { ACTIVE_TIMER_STORAGE_KEY } from '@/store/timerStore';
import {
  LoginCredentialsSchema,
  SignupCredentialsSchema,
  ForgotPasswordSchema,
  type AuthActionResult,
} from '@/types/auth';

// 비밀번호 재설정은 웹 페이지로 보내야 해서 유지 — 이메일 인증은 커스텀 스킴(pomoroutine://auth/confirm)으로 앱이 직접 처리
export const WEB_APP_URL = 'https://pomoroutine.com';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  loginWithKakao: () => Promise<AuthActionResult>;
  signup: (email: string, password: string, passwordConfirm: string) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  deleteAccount: (password?: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// signUp()은 이미 가입된 이메일이어도 보안상 메타데이터를 안 채워주므로, Edge Function(service_role)으로 직접 조회해야 카카오 가입 여부를 알 수 있다
async function getExistingProvider(email: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{
    exists: boolean;
    provider: string | null;
  }>('check-email-provider', { body: { email } });
  if (error || !data?.exists) return null;
  return data.provider;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string): Promise<AuthActionResult> {
    const parsed = LoginCredentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' };
    }

    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      if (error.message === 'Email not confirmed') {
        return { error: '이메일 인증이 필요해요. 받은 메일함을 확인해주세요' };
      }
      if (error.status === 429) {
        return { error: '잠시 후 다시 시도해주세요' };
      }
      if (error.message === 'Invalid login credentials') {
        const provider = await getExistingProvider(parsed.data.email);
        if (provider === 'kakao') {
          return { error: '카카오로 가입됐어요. 카카오 로그인을 이용해주세요' };
        }
        return { error: '이메일 또는 비밀번호가 올바르지 않습니다' };
      }
      return { error: '로그인에 실패했어요. 잠시 후 다시 시도해주세요' };
    }

    return {};
  }

  async function loginWithKakao(): Promise<AuthActionResult> {
    let accessToken: string;
    try {
      const token = await kakaoLogin();
      accessToken = token.accessToken;
    } catch (err) {
      // 사용자가 로그인 취소 시(카카오톡 앱 전환 후 뒤로가기 등) 에러로 던져지므로 조용히 무시
      if (err instanceof Error && err.message.includes('CANCEL')) {
        return {};
      }
      console.error('[kakao] login() failed', err);
      return { error: '카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요' };
    }

    const { data, error: invokeError } = await supabase.functions.invoke<{
      tokenHash?: string;
      verificationType?: EmailOtpType;
      error?: string;
    }>('kakao-login', { body: { accessToken } });

    if (invokeError || !data?.tokenHash || !data.verificationType) {
      console.error('[kakao] edge function failed', invokeError, data);
      return { error: '카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요' };
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: data.verificationType,
    });

    if (verifyError) {
      console.error('[kakao] verifyOtp failed', verifyError);
      return { error: '카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요' };
    }

    return {};
  }

  async function signup(
    email: string,
    password: string,
    passwordConfirm: string,
  ): Promise<AuthActionResult> {
    const parsed = SignupCredentialsSchema.safeParse({ email, password, passwordConfirm });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' };
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: 'pomoroutine://auth/confirm' },
    });

    if (error) {
      if (error.status === 429) {
        return { error: '잠시 후 다시 시도해주세요' };
      }
      return { error: '가입에 실패했어요. 잠시 후 다시 시도해주세요' };
    }

    // 이미 가입+인증된 이메일이면 Supabase는 에러 없이 identities가 빈 배열인 응답을 준다
    if (data.user && data.user.identities?.length === 0) {
      const provider = await getExistingProvider(parsed.data.email);
      if (provider === 'kakao') {
        return { error: '카카오로 가입됐어요. 카카오 로그인을 이용해주세요' };
      }
      return { error: '이미 가입된 이메일이에요. 로그인해주세요' };
    }

    return { pendingConfirmation: true };
  }

  async function requestPasswordReset(email: string): Promise<AuthActionResult> {
    const parsed = ForgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해주세요' };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${WEB_APP_URL}/auth/reset-confirm`,
    });

    if (error?.status === 429) {
      return { error: '잠시 후 다시 시도해주세요' };
    }

    // 계정 존재 여부를 흘리지 않기 위해, 실패해도 성공과 동일하게 응답한다
    return { pendingConfirmation: true };
  }

  async function updatePassword(password: string): Promise<AuthActionResult> {
    if (password.length < AUTH_LIMITS.PASSWORD_MIN_LENGTH) {
      return { error: `비밀번호는 ${AUTH_LIMITS.PASSWORD_MIN_LENGTH}자 이상이어야 해요` };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: '비밀번호 변경에 실패했어요. 다시 시도해주세요' };
    }

    return {};
  }

  async function deleteAccount(password?: string): Promise<AuthActionResult> {
    const { data, error } = await supabase.functions.invoke<{ error?: string }>('delete-account', {
      body: password ? { password } : {},
    });

    if (error || data?.error) {
      return { error: data?.error ?? '탈퇴 처리에 실패했어요. 잠시 후 다시 시도해주세요' };
    }

    await supabase.auth.signOut();
    void AsyncStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);
    return {};
  }

  // activeTimer는 계정과 무관하게 저장되므로, 다음 사용자에게 이전 진행 중 타이머가 보이지 않도록 로그아웃 시 정리
  async function logout(): Promise<void> {
    await supabase.auth.signOut({ scope: 'local' });
    void AsyncStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    login,
    loginWithKakao,
    signup,
    requestPasswordReset,
    updatePassword,
    deleteAccount,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
