import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 이전 실행에서 남은 테스트 데이터 정리 — 매 CI 실행마다 tasks/sessions가 쌓이는 것 방지
  // (Node 프로세스라 브라우저 전용인 @supabase/ssr 대신 순정 supabase-js 클라이언트 사용)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_TEST_EMAIL!,
    password: process.env.E2E_TEST_PASSWORD!,
  });
  if (authData.user) {
    // 순서 중요 — tasks.category_id가 on delete restrict라 카테고리보다 먼저 지워야 함
    await supabase.from('sessions').delete().eq('user_id', authData.user.id);
    await supabase.from('tasks').delete().eq('user_id', authData.user.id);
    await supabase.from('categories').delete().eq('user_id', authData.user.id).like('name', 'E2E%');

    // 동기부여 메시지는 별도 테이블이 아니라 settings의 배열 컬럼이라 필터링 후 다시 씀
    const { data: settingsRow } = await supabase
      .from('settings')
      .select('motivational_messages')
      .eq('user_id', authData.user.id)
      .single();
    const cleanedMessages = (settingsRow?.motivational_messages ?? []).filter(
      (m: string) => !m.includes('E2E'),
    );
    if (cleanedMessages.length > 0) {
      await supabase
        .from('settings')
        .update({ motivational_messages: cleanedMessages })
        .eq('user_id', authData.user.id);
    }
  }
  await supabase.auth.signOut({ scope: 'local' });

  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill(process.env.E2E_TEST_EMAIL!);
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_TEST_PASSWORD!);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForURL('/');
  await page.context().storageState({ path: authFile });
});
