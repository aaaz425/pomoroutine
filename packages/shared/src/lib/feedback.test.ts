import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendFeedback } from './feedback';
import { TOAST_MESSAGES } from '../constants/toastMessages';

function clientReturning(error: { message: string } | null) {
  return { from: () => ({ insert: async () => ({ error }) }) } as unknown as SupabaseClient;
}

const input = { message: ' 의견 ', platform: 'web', appVersion: '1.0.0' } as const;

describe('sendFeedback', () => {
  it('성공, 일일 제한, 기타 실패를 각각 다른 토스트로 돌려줌', async () => {
    expect(await sendFeedback(clientReturning(null), input)).toBe(TOAST_MESSAGES.feedbackSent);
    expect(
      await sendFeedback(clientReturning({ message: 'feedback daily limit exceeded' }), input),
    ).toBe(TOAST_MESSAGES.feedbackLimitExceeded);
    expect(await sendFeedback(clientReturning({ message: 'network' }), input)).toBe(
      TOAST_MESSAGES.feedbackSendFailed,
    );
  });
});
