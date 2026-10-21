import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toSafeRedirectPath } from '@/lib/supabase/redirect';

// 카카오 첫 가입 판별용 — last_sign_in_at은 기존 계정에 카카오가 새로 연결될 때 오판할 수 있어,
// auth.users 행이 방금(이 오차 이내) 생성됐는지만 본다. 이메일 인증은 next 유무로 따로 걸러낸다.
const FIRST_SIGN_IN_TOLERANCE_MS = 5000;

function isFirstSignIn(user: { created_at: string }): boolean {
  const createdAt = new Date(user.created_at).getTime();
  return Date.now() - createdAt < FIRST_SIGN_IN_TOLERANCE_MS;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  const tokenHash = searchParams.get('token_hash');

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}/welcome`);
    }
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // next 없으면 이메일 인증(코드 1회용 = 교환 성공 자체가 첫 가입 확정) → 무조건 /welcome.
      // next 있으면 카카오 공용 라우트 — 첫 가입일 때만 /welcome, 재로그인은 next로.
      const destination = !next
        ? '/welcome'
        : isFirstSignIn(data.user)
          ? '/welcome'
          : toSafeRedirectPath(next, '/');
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
