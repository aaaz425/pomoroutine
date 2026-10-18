import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BackHandler,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { NOTICE_MESSAGES } from '@pomoroutine/shared';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { SheetGrabber } from '@/components/shared/SheetGrabber';
import { Text } from '@/components/shared/Text';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { useKeyboardTop } from '@/hooks/useKeyboardTop';
import { createSheetDismissGesture } from '@/lib/sheetDismissGesture';

// 네이티브 RN <Modal>은 react-native-screens 환경에서 하단 커스텀 탭바를 못 덮어, 절대위치 View 오버레이를 <Portal>로 렌더링한다.
// sheet 높이는 고정 px 필수 — '85%' 같은 퍼센트는 부모 높이가 불확정이라 내용이 잘리는 버그가 있었음(실측 확인)
const SCREEN_HEIGHT = Dimensions.get('window').height;
const OPEN_DURATION_MS = 220;
const CLOSE_DURATION_MS = 180;

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  // DraggableFlatList처럼 자체 pan 제스처를 쓰는 콘텐츠는 바깥 ScrollView와 경합해 드래그가 안 먹으므로 false로 넘겨 뺀다(실측 확인)
  scrollable?: boolean;
  // 기본값 'never'는 빈 영역 첫 탭이 키보드만 내리고 그 아래 터치는 버림 — 입력창+버튼이 같이 있으면 'handled' 필요
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  dirty?: boolean;
}

// 백드롭과 시트를 형제로 분리(부모-자식 아님) — 감싸는 구조였을 때 ScrollView가 Pressable 두 겹과 경합해 스크롤이 안 먹혔음.
export function Modal({
  visible,
  title,
  onClose,
  children,
  footer,
  scrollable = true,
  keyboardShouldPersistTaps = 'never',
  dirty = false,
}: Props) {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const keyboardTop = useKeyboardTop();
  const rootRef = useRef<View>(null);
  const [rootBottom, setRootBottom] = useState(SCREEN_HEIGHT);
  const keyboardHeight = keyboardTop === null ? 0 : Math.max(0, rootBottom - keyboardTop);

  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const sheetHeight = useSharedValue(SCREEN_HEIGHT);
  // <Portal> 경유 마운트라 Portal 등록 + PortalProvider 재렌더 사이클이 끼어, requestAnimationFrame 추측 방식은 타이밍이 안 맞아 깜빡였음(실측)
  // — 대신 시트가 실제로 레이아웃된 순간(onLayout)을 신호로 애니메이션을 시작한다
  const openAnimationStartedRef = useRef(false);
  const closeAnimationStarted = useSharedValue(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useEffect(() => {
    if (visible) {
      // 열릴 때는 즉시 마운트해야 애니메이션이 보임(닫힐 때만 비동기 콜백에서 처리) — 동기 호출 불가피
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      translateY.set(SCREEN_HEIGHT);
      openAnimationStartedRef.current = false;
      closeAnimationStarted.set(false);
    } else {
      if (closeAnimationStarted.get()) return;
      const config = { duration: CLOSE_DURATION_MS, easing: Easing.in(Easing.cubic) };
      translateY.set(
        withTiming(sheetHeight.get(), config, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, translateY, sheetHeight, closeAnimationStarted]);

  function handleSheetLayout(event: LayoutChangeEvent) {
    const height = event.nativeEvent.layout.height;
    sheetHeight.set(height);
    if (!visible || openAnimationStartedRef.current) return;
    openAnimationStartedRef.current = true;
    // 화면 높이가 아닌 시트 높이만큼만 이동해야 시작 직후부터 시트가 보임
    translateY.set(
      withSequence(
        withTiming(height, { duration: 0 }),
        withTiming(0, { duration: OPEN_DURATION_MS, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() - keyboardHeight }],
  }));
  // 열기/닫기/드래그 모두 시트 위치에서 파생시켜 백드롭이 손가락을 그대로 따라오게 한다
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, 1 - translateY.get() / sheetHeight.get())),
  }));

  // 부모 렌더를 거쳐 visible=false가 올 때까지 기다리면 그만큼 시트가 멈칫하므로 닫기 애니메이션을 여기서 먼저 시작
  function handleClose() {
    closeAnimationStarted.set(true);
    translateY.set(
      withTiming(
        sheetHeight.get(),
        { duration: CLOSE_DURATION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        },
      ),
    );
    onClose();
  }

  function requestClose() {
    if (dirty) setConfirmingDiscard(true);
    else handleClose();
  }

  function handleConfirmDiscard() {
    setConfirmingDiscard(false);
    handleClose();
  }

  const dismissGesture = createSheetDismissGesture({
    translateY,
    sheetHeight,
    onDismiss: requestClose,
    snapBackOnDismiss: dirty,
  });
  const onHardwareBackPress = useEffectEvent(requestClose);

  // 네이티브 <Modal>이 없으니 안드로이드 물리 뒤로가기를 직접 처리
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onHardwareBackPress();
      return true;
    });
    return () => sub.remove();
  }, [visible]);

  if (!mounted) return null;

  return (
    <View
      ref={rootRef}
      style={styles.root}
      pointerEvents="box-none"
      onLayout={() =>
        rootRef.current?.measureInWindow((_x, y, _w, height) => setRootBottom(y + height))
      }
    >
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={keyboardHeight > 0 ? Keyboard.dismiss : requestClose}
        />
      </Animated.View>
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <Animated.View style={[styles.sheetPosition, sheetAnimatedStyle]}>
          <View
            onLayout={handleSheetLayout}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom,
                maxHeight: Math.min(
                  SCREEN_HEIGHT * 0.85,
                  SCREEN_HEIGHT - keyboardHeight - insets.top - 16,
                ),
              },
            ]}
          >
            {/* 본문 ScrollView, DraggableFlatList와 제스처가 경합하지 않도록 그래버+헤더만 드래그 영역으로 둔다 */}
            <GestureDetector gesture={dismissGesture}>
              <View>
                <SheetGrabber />
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                  <Text
                    style={[
                      styles.title,
                      { color: theme.foreground, fontFamily: FONTS.sansSemiBold },
                    ]}
                  >
                    {title}
                  </Text>
                  <Pressable onPress={requestClose} hitSlop={8} accessibilityLabel="닫기">
                    <X size={18} color={theme.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>

            {scrollable ? (
              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps={keyboardShouldPersistTaps}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.bodyContent}>{children}</View>
            )}

            {footer && (
              <View
                style={[
                  styles.footer,
                  { backgroundColor: theme.card, borderTopColor: theme.border },
                ]}
              >
                {footer}
              </View>
            )}
          </View>
        </Animated.View>
      </View>
      <ConfirmModal
        visible={confirmingDiscard}
        title={NOTICE_MESSAGES.discardTitle}
        description={NOTICE_MESSAGES.discardMessage}
        confirmLabel={NOTICE_MESSAGES.discardConfirm}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setConfirmingDiscard(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetPosition: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
  },
  body: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    flexDirection: 'column',
    gap: 20,
    padding: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
});
