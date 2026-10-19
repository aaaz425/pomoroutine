import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/store/AuthProvider';
import { ThemeModeProvider, useThemeScheme } from '@/hooks/use-theme-scheme';
import { THEME } from '@/constants/timerColors';

SplashScreen.preventAutoHideAsync();

// React Navigation 기본 테마의 background가 우리 THEME 토큰과 미묘하게 달라 앱 배경색으로 맞춤
const NAV_LIGHT_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: THEME.light.background },
};
const NAV_DARK_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: THEME.dark.background },
};

// 시스템 설정이 아니라 앱에서 고른 테마(useThemeScheme)를 따라야 화면 전환 중 배경이 안 깜빡임
function NavigationThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useThemeScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? NAV_DARK_THEME : NAV_LIGHT_THEME}>
      {children}
    </ThemeProvider>
  );
}

function RootContent() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.ttf'),
    'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.ttf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.ttf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.ttf'),
    'GeistMono-Bold': require('@/assets/fonts/GeistMono-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* expo-router가 자동으로 감싸는 SafeAreaProvider는 네이티브에서 initialMetrics를
          안 넘겨서 콜드 스타트 시 insets가 0으로 시작했다가 비동기로 갱신됨 — 그 갱신
          타이밍이 앱 켜고 첫 모달을 열고 닫는 시점과 겹치면 시트 padding이 한 번 더 튀어
          깜빡이는 문제가 있었음(실측 확인). initialWindowMetrics(네이티브 부트스트랩 시점
          스냅샷)로 한 번 더 감싸서 첫 렌더부터 정확한 값이 잡히게 한다. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeModeProvider>
          <NavigationThemeProvider>
            <AuthProvider>
              <RootContent />
            </AuthProvider>
          </NavigationThemeProvider>
        </ThemeModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
