import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/shared/Text';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  title: string;
  message?: string;
  actionLabel: string;
  onAction: () => void;
}

export function NoticeScreen({ title, message, actionLabel, onAction }: Props) {
  const theme = useThemeTokens();

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.foreground, fontFamily: FONTS.sansMedium }]}>
            {title}
          </Text>
          {message && (
            <Text
              style={[
                styles.message,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              {message}
            </Text>
          )}
          <Pressable onPress={onAction} style={[styles.cta, { backgroundColor: theme.primary }]}>
            <Text
              style={[
                styles.ctaText,
                { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
              ]}
            >
              {actionLabel}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
  },
  cta: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 14,
  },
});
