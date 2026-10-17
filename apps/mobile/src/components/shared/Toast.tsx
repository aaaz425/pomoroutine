import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, CircleX, Info } from 'lucide-react-native';
import type { ToastMessage, ToastType } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { FONTS } from '@/constants/fonts';
import type { ThemeTokens } from '@/constants/timerColors';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { subscribeToast } from '@/lib/toast';
import { Portal } from './Portal';

const TOAST_ICONS = { success: CircleCheck, info: Info, error: CircleX };

function toastColor(theme: ThemeTokens, type: ToastType): string {
  if (type === 'success') return theme.success;
  if (type === 'info') return theme.info;
  return theme.destructive;
}

// 화면 상단에 잠깐 떴다 사라짐
export function Toaster() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastMessage | null>(null);

  useEffect(() => subscribeToast(setCurrent), []);

  if (!current) return null;

  const color = toastColor(theme, current.type);
  const Icon = TOAST_ICONS[current.type];

  return (
    <Portal>
      <Animated.View
        entering={FadeInDown}
        exiting={FadeOutUp}
        pointerEvents="none"
        style={[
          styles.container,
          {
            top: insets.top + 12,
            backgroundColor: theme.popover,
            borderColor: color,
            shadowColor: color,
          },
        ]}
      >
        <Icon size={18} color={color} />
        <Text style={[styles.text, { color: theme.foreground, fontFamily: FONTS.sansMedium }]}>
          {current.message}
        </Text>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    flex: 1,
    fontSize: 14,
    textAlign: 'left',
  },
});
