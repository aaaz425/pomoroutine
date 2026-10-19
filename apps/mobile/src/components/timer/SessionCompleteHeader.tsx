import { StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '@/components/shared/Text';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

export function SessionCompleteHeader() {
  const theme = useThemeTokens();

  return (
    <View style={styles.header}>
      <View style={[styles.iconOuter, { backgroundColor: withAlpha(theme.primary, 0.2) }]}>
        <View style={[styles.iconInner, { backgroundColor: theme.primary }]}>
          <Check size={20} color={theme.primaryForeground} strokeWidth={2.5} />
        </View>
      </View>
      <Text style={[styles.headline, { color: theme.foreground, fontFamily: FONTS.sansBold }]}>
        집중 완료!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: 12,
  },
  iconOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 26,
  },
});
