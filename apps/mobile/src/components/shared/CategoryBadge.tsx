import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/components/shared/Text';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import type { Category } from '@/types/tasks';

interface Props {
  category: Category;
  style?: ViewStyle;
}

export function CategoryBadge({ category, style }: Props) {
  const hex = category.color;

  return (
    <View style={[styles.badge, { backgroundColor: withAlpha(hex, 0.15) }, style]}>
      <Text numberOfLines={1} style={[styles.text, { color: hex, fontFamily: FONTS.sansSemiBold }]}>
        {category.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: 110,
  },
  text: {
    fontSize: 12,
  },
});
