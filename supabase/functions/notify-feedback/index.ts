import { createClient } from 'npm:@supabase/supabase-js@2';

const SUBJECT_PREVIEW_LENGTH = 30;

interface FeedbackRecord {
  user_id: string;
  message: string;
  platform: string;
  app_version: string;
  created_at: string;
}

function toSubject(message: string): string {
  const oneLine = message.replace(/\s+/g, ' ').trim();
  const preview =
    oneLine.length > SUBJECT_PREVIEW_LENGTH
      ? `${oneLine.slice(0, SUBJECT_PREVIEW_LENGTH)}…`
      : oneLine;
  return `[PomoRoutine 의견] ${preview}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
  }

  if (req.headers.get('x-webhook-secret') !== Deno.env.get('FEEDBACK_WEBHOOK_SECRET')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const record = payload?.record as FeedbackRecord | undefined;
  if (payload?.type !== 'INSERT' || payload?.table !== 'feedback' || !record) {
    return new Response(JSON.stringify({ error: 'invalid payload' }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data } = await supabaseAdmin.auth.admin.getUserById(record.user_id);
  const senderEmail = data.user?.email ?? '알 수 없음';
  const sentAt = new Date(record.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PomoRoutine <noreply@pomoroutine.com>',
      to: Deno.env.get('FEEDBACK_TO_EMAIL'),
      subject: toSubject(record.message),
      text: [
        record.message,
        '',
        '---',
        `보낸 사람: ${senderEmail}`,
        `플랫폼: ${record.platform}`,
        `버전: ${record.app_version}`,
        `시각: ${sentAt}`,
      ].join('\n'),
    }),
  });

  if (!res.ok) {
    console.error('resend failed', res.status, await res.text());
    return new Response(JSON.stringify({ error: 'send failed' }), { status: 502 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
