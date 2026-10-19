import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/shared/Text';
import { TextInput } from '@/components/shared/TextInput';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

const NOTE_MAX_LENGTH = 500;

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SessionMemoField({ value, onChange }: Props) {
  const theme = useThemeTokens();

  return (
    <View style={styles.field}>
      <TextInput
        multiline
        numberOfLines={4}
        maxLength={NOTE_MAX_LENGTH}
        value={value}
        onChangeText={onChange}
        placeholder="무엇을 집중해서 했나요? 짧게 메모해두면 나중에 돌아볼 수 있어요."
        style={styles.memoInput}
      />
      <Text
        style={[
          styles.counter,
          { color: withAlpha(theme.mutedForeground, 0.6), fontFamily: FONTS.sansRegular },
        ]}
      >
        {value.length} / {NOTE_MAX_LENGTH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  memoInput: {
    height: 90,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 11,
    textAlign: 'right',
  },
});
