import { describe, expect, it } from 'vitest';
import { isValidRedirectTarget } from '@/lib/supabase/redirect';

describe('isValidRedirectTarget', () => {
  it('앱 내부 경로만 허용', () => {
    expect(isValidRedirectTarget('/journal')).toBe(true);
    expect(isValidRedirectTarget('/')).toBe(true);
  });

  it('외부 주소와 스킴 상대 경로는 차단', () => {
    for (const value of ['https://evil.com', '//evil.com', '/\\evil.com', 'journal', '', null]) {
      expect(isValidRedirectTarget(value)).toBe(false);
    }
  });
});
