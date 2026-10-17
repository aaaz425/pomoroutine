import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, PixelRatio, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { type WebViewNavigation } from 'react-native-webview';
import { router, useFocusEffect } from 'expo-router';
import {
  NOTICE_MESSAGES,
  WEBVIEW_TAB_BLUR_EVENT,
  WEBVIEW_TAB_FOCUS_EVENT,
} from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { NoticeScreen } from '@/components/shared/NoticeScreen';
import { FONTS, MAX_FONT_SIZE_MULTIPLIER } from '@/constants/fonts';
import { useThemeScheme, useThemeTokens } from '@/hooks/use-theme-scheme';
import { useAuth } from '@/store/AuthProvider';
import { buildWebviewAuthBridgeSource } from '@/lib/webviewAuthBridge';
import { handleWebviewMessage } from '@/lib/webviewBridge';

interface Props {
  path: string;
}

export function EmbeddedWebScreen({ path }: Props) {
  const scheme = useThemeScheme();
  const theme = useThemeTokens();
  const { session, logout } = useAuth();
  const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL;
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const focusedOnceRef = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => sub.remove();
  }, [canGoBack]);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnceRef.current) {
        webViewRef.current?.injectJavaScript(
          `window.dispatchEvent(new Event('${WEBVIEW_TAB_FOCUS_EVENT}')); true;`,
        );
      }
      focusedOnceRef.current = true;
      return () => {
        webViewRef.current?.injectJavaScript(
          `window.dispatchEvent(new Event('${WEBVIEW_TAB_BLUR_EVENT}')); true;`,
        );
      };
    }, []),
  );

  async function handleRelogin() {
    await logout();
    router.push('/login');
  }

  if (authFailed) {
    return (
      <NoticeScreen
        title={NOTICE_MESSAGES.sessionExpiredTitle}
        message={NOTICE_MESSAGES.sessionExpiredMessage}
        actionLabel={NOTICE_MESSAGES.relogin}
        onAction={() => void handleRelogin()}
      />
    );
  }

  if (!webAppUrl || !session) {
    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={[styles.center, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.message, { color: theme.destructive, fontFamily: FONTS.sansRegular }]}>
          {!webAppUrl ? 'EXPO_PUBLIC_WEB_APP_URL이 설정되지 않았어요' : '로그인 세션이 없어요'}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.flex, { backgroundColor: theme.background }]}
    >
      <WebView
        ref={webViewRef}
        source={buildWebviewAuthBridgeSource(webAppUrl, session, `${path}?embed=1`)}
        style={{ backgroundColor: theme.background }}
        textZoom={Math.round(Math.min(PixelRatio.getFontScale(), MAX_FONT_SIZE_MULTIPLIER) * 100)}
        injectedJavaScriptBeforeContentLoaded={`
          localStorage.setItem('theme', '${scheme}');
          if (window.navigator && window.navigator.serviceWorker) {
            window.navigator.serviceWorker.register = function () { return Promise.resolve(); };
          }
          true;
        `}
        onMessage={(event) => handleWebviewMessage(event.nativeEvent, webAppUrl)}
        onNavigationStateChange={(event: WebViewNavigation) => setCanGoBack(event.canGoBack)}
        onHttpError={(event) => {
          if (event.nativeEvent.url.includes('/auth/webview-bridge')) setAuthFailed(true);
        }}
        startInLoadingState
        renderLoading={() => (
          <View
            style={[styles.center, styles.loadingOverlay, { backgroundColor: theme.background }]}
          >
            <ActivityIndicator color={theme.primary} />
          </View>
        )}
        renderError={() => (
          <View style={[styles.center, { backgroundColor: theme.background }]}>
            <Text
              style={[styles.message, { color: theme.destructive, fontFamily: FONTS.sansRegular }]}
            >
              페이지를 불러오지 못했어요
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
});
