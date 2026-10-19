import { Pressable, StyleSheet, View } from 'react-native';
import { COLOR_THEME_KEYS, COLOR_THEMES, withAlpha } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { FONTS } from '@/constants/fonts';
import { useColorTheme, useThemeScheme, useThemeTokens } from '@/hooks/use-theme-scheme';

export function ColorThemeSection() {
  const scheme = useThemeScheme();
  const theme = useThemeTokens();
  const { colorTheme, setColorTheme } = useColorTheme();

  return (
    <View style={styles.row}>
      {COLOR_THEME_KEYS.map((key) => {
        const themeDef = COLOR_THEMES[key];
        const swatchColor = themeDef.accent[scheme].color;
        const selected = colorTheme === key;
        return (
          <Pressable
            key={key}
            onPress={() => setColorTheme(key)}
            accessibilityLabel={themeDef.label}
            accessibilityState={{ selected }}
            style={styles.item}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: swatchColor },
                selected && [
                  styles.swatchSelected,
                  { outlineColor: withAlpha(theme.foreground, 0.3) },
                ],
              ]}
            />
            <Text
              style={[
                styles.label,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              {themeDef.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  swatchSelected: {
    outlineWidth: 2,
    outlineOffset: 2,
    outlineStyle: 'solid',
    transform: [{ scale: 1.1 }],
  },
  label: {
    fontSize: 12,
  },
});
