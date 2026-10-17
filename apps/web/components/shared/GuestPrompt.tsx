import Link from 'next/link';
import { NOTICE_MESSAGES } from '@/lib/constants/messages';

interface Props {
  title: string;
  description?: string;
}

export function GuestPrompt({ title, description }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Link
        href="/login"
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        {NOTICE_MESSAGES.login}
      </Link>
    </div>
  );
}
