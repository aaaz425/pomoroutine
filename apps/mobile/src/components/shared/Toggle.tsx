import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { withAlpha } from '@pomoroutine/shared';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function Toggle({ checked, onChange }: Props) {
  const theme = useThemeTokens();

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(checked ? 24 : 4, { duration: 150 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      style={[
        styles.track,
        { backgroundColor: checked ? theme.primary : withAlpha(theme.mutedForeground, 0.3) },
      ]}
    >
      <Animated.View style={[styles.knob, knobStyle]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.1)',
  },
});
