export const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3000';

export const siteConfig = {
  name: 'PomoRoutine',
  title: 'PomoRoutine — 포모도로 타이머',
  description:
    '포모도로 집중, 공부 기록, 통계 분석을 한 곳에서. 수험생과 취업준비생을 위한 무료 집중 타이머',
  ogDescription: '포모도로 집중, 공부 기록, 통계 분석을 한 곳에서',
  twitterDescription: '수험생과 취업준비생을 위한 무료 집중 타이머',
  keywords: ['포모도로 타이머', '공부 타이머', '집중 타이머', '포모도로 기법', '무료 공부 도구'],
  locale: 'ko_KR',
} as const;
