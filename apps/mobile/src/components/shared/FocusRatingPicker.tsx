import { Pressable, StyleSheet, View } from 'react-native';
import { FOCUS_RATING_OPTIONS, type FocusRating } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  value: FocusRating | null;
  onChange: (value: FocusRating | null) => void;
  disabled?: boolean;
}

export function FocusRatingPicker({ value, onChange, disabled = false }: Props) {
  const theme = useThemeTokens();

  return (
    <View style={styles.row}>
      {FOCUS_RATING_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            onPress={() => onChange(isSelected ? null : option.value)}
            style={[
              styles.button,
              { backgroundColor: isSelected ? theme.primary : theme.muted },
              disabled && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected
                    ? theme.primaryForeground
                    : withAlpha(theme.mutedForeground, 0.9),
                  fontFamily: FONTS.sansMedium,
                },
              ]}
            >
              {option.label}
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
    gap: 6,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
  },
  disabled: {
    opacity: 0.6,
  },
});
