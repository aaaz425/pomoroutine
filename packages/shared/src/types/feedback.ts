export type FeedbackPlatform = 'web' | 'ios' | 'android';

export interface FeedbackInput {
  message: string;
  platform: FeedbackPlatform;
  appVersion: string;
}
