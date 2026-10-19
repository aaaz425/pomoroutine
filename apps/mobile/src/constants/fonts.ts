// _layout.tsx의 useFonts()로 로드되는 폰트 이름과 반드시 일치해야 한다.
export const FONTS = {
  sansRegular: 'Pretendard-Regular',
  sansMedium: 'Pretendard-Medium',
  sansSemiBold: 'Pretendard-SemiBold',
  sansBold: 'Pretendard-Bold',
  monoBold: 'GeistMono-Bold',
} as const;

// 시스템 글자 크기를 최대로 키우면 약 2배까지 커져 레이아웃이 깨짐 — 접근성은 유지하되 상한만 둔다
export const MAX_FONT_SIZE_MULTIPLIER = 1.2;
