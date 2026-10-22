import type { SupabaseClient } from '@supabase/supabase-js';
import { TOAST_MESSAGES, type ToastMessage } from '../constants/toastMessages';
import type { FeedbackInput } from '../types/feedback';

const DAILY_LIMIT_ERROR = 'feedback daily limit exceeded';

export async function sendFeedback(
  client: SupabaseClient,
  input: FeedbackInput,
): Promise<ToastMessage> {
  const { error } = await client.from('feedback').insert({
    message: input.message.trim(),
    platform: input.platform,
    app_version: input.appVersion,
  });
  if (!error) return TOAST_MESSAGES.feedbackSent;
  return error.message.includes(DAILY_LIMIT_ERROR)
    ? TOAST_MESSAGES.feedbackLimitExceeded
    : TOAST_MESSAGES.feedbackSendFailed;
}
