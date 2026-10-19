import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/shared/Text';
import { withAlpha } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import type { Category } from '@/types/tasks';

interface Props {
  categories: Category[];
  selectedId: string;
  onChange: (id: string) => void;
}

export function CategoryPills({ categories, selectedId, onChange }: Props) {
  const theme = useThemeTokens();

  return (
    <View style={styles.row}>
      {categories.map((cat) => {
        const hex = cat.color;
        const active = cat.id === selectedId;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onChange(cat.id)}
            style={[
              styles.pill,
              active
                ? { backgroundColor: withAlpha(hex, 0.2), borderColor: hex }
                : { backgroundColor: theme.muted, borderColor: 'transparent' },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: hex }]} />
            <Text
              style={[
                styles.label,
                { color: active ? hex : theme.mutedForeground, fontFamily: FONTS.sansMedium },
              ]}
            >
              {cat.name}
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
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 14,
  },
});
