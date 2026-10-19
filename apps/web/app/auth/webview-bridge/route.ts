import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toSafeRedirectPath } from '@/lib/supabase/redirect';

const DEFAULT_REDIRECT = '/dashboard?embed=1';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const accessToken = body?.access_token;
  const refreshToken = body?.refresh_token;
  const redirectTo = toSafeRedirectPath(body?.redirect_to, DEFAULT_REDIRECT);

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    return NextResponse.json({ error: 'session_failed' }, { status: 401 });
  }

  return new NextResponse(null, { status: 303, headers: { Location: redirectTo } });
}
