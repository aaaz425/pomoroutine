import { TextInput as RNTextInput, StyleSheet, type TextInputProps } from 'react-native';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS, MAX_FONT_SIZE_MULTIPLIER } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

export function TextInput({
  style,
  maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER,
  ...props
}: TextInputProps) {
  const theme = useThemeTokens();

  return (
    <RNTextInput
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      placeholderTextColor={withAlpha(theme.mutedForeground, 0.6)}
      style={[
        styles.input,
        { backgroundColor: theme.muted, color: theme.foreground, fontFamily: FONTS.sansRegular },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
