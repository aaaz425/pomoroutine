import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/shared/Text';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  message: string;
  subMessage?: string;
  paddingVertical?: number;
}

export function EmptyState({ message, subMessage, paddingVertical = 40 }: Props) {
  const theme = useThemeTokens();

  return (
    <View style={[styles.container, { paddingVertical }]}>
      <Text
        style={[styles.message, { color: theme.mutedForeground, fontFamily: FONTS.sansRegular }]}
      >
        {message}
      </Text>
      {subMessage && (
        <Text
          style={[
            styles.subMessage,
            { color: withAlpha(theme.mutedForeground, 0.6), fontFamily: FONTS.sansRegular },
          ]}
        >
          {subMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  message: {
    fontSize: 14,
  },
  subMessage: {
    fontSize: 12,
  },
});
