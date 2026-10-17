import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/server';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { KakaoButton } from '@/components/auth/KakaoButton';
import { LoginForm } from '@/components/auth/LoginForm';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `로그인 — ${siteConfig.name}`,
};

interface Props {
  searchParams: Promise<{ redirectTo?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const user = await getCurrentUser();

  if (user) {
    redirect('/');
  }

  const { redirectTo } = await searchParams;

  return (
    <AuthShell title="로그인">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <AuthDivider />
      <KakaoButton redirectTo={redirectTo} />
      <Link href="/" className="self-center text-sm text-muted-foreground hover:text-foreground">
        로그인 없이 타이머 사용하기
      </Link>
    </AuthShell>
  );
}
