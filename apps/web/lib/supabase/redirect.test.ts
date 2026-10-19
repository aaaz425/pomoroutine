import { describe, expect, it } from 'vitest';
import { toSafeRedirectPath } from '@/lib/supabase/redirect';

describe('toSafeRedirectPath', () => {
  it('앱 내부 경로는 정규화한 경로, 쿼리, 해시로 반환', () => {
    expect(toSafeRedirectPath('/dashboard?embed=1#top', '/')).toBe('/dashboard?embed=1#top');
    expect(toSafeRedirectPath('/a/../journal', '/')).toBe('/journal');
  });

  it('외부 주소와 스킴 상대 경로는 기본 경로로 대체', () => {
    for (const value of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      'journal',
      '',
      null,
    ]) {
      expect(toSafeRedirectPath(value, '/')).toBe('/');
    }
  });
});
