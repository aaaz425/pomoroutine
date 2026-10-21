import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AuthShell } from '@/components/auth/AuthShell';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `가입 인증 — ${siteConfig.name}`,
};

interface Props {
  searchParams: Promise<{ token_hash?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token_hash: tokenHash } = await searchParams;
  let verified = false;
  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
    verified = !error;
  }

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
          {verified ? (
            <CheckCircle2 className="w-7 h-7 text-primary" />
          ) : (
            <CircleAlert className="w-7 h-7 text-destructive" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">
            {verified ? '가입이 완료됐어요' : '인증 링크를 확인하지 못했어요'}
          </h1>
          <p className="text-sm text-muted-foreground break-keep">
            {verified
              ? '가입한 앱이나 웹에서 로그인해주세요'
              : '이미 인증했다면 로그인해주세요. 안 되면 다시 가입해주세요'}
          </p>
        </div>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full font-semibold')}
        >
          웹에서 로그인하기
        </Link>
      </div>
    </AuthShell>
  );
}
