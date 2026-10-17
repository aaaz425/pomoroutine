import { Pressable, StyleSheet, View } from 'react-native';
import { Check, GripVertical, Pencil, Trash2 } from 'lucide-react-native';
import { Text } from '@/components/shared/Text';
import { useTaskStore } from '@/store/StoreProvider';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { withAlpha } from '@/constants/timerColors';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import type { Task } from '@/types/tasks';

interface Props {
  task: Task;
  mode: 'select' | 'manage';
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEdit?: (task: Task) => void;
  onDeleteRequest?: (id: string) => void;
  onDrag?: () => void;
  isDragging?: boolean;
}

export function TaskItem({
  task,
  mode,
  isSelected = false,
  onSelect,
  onEdit,
  onDeleteRequest,
  onDrag,
  isDragging = false,
}: Props) {
  const theme = useThemeTokens();
  const categories = useTaskStore((s) => s.categories);
  const category = categories.find((c) => c.id === task.categoryId);

  return (
    <Pressable
      onPress={mode === 'select' ? () => onSelect?.(task.id) : undefined}
      style={[
        styles.row,
        isSelected && { backgroundColor: withAlpha(theme.primary, 0.1) },
        isDragging && styles.dragging,
      ]}
    >
      {mode === 'manage' && (
        <Pressable
          onLongPress={onDrag}
          delayLongPress={30}
          hitSlop={9}
          style={styles.gripButton}
          accessibilityLabel="순서 조정"
        >
          <GripVertical size={18} color={withAlpha(theme.mutedForeground, 0.5)} />
        </Pressable>
      )}

      {mode === 'select' && (
        <View
          style={[
            styles.selectCircle,
            isSelected
              ? { backgroundColor: theme.primary }
              : { borderWidth: 2, borderColor: theme.border },
          ]}
        >
          {isSelected && <Check size={10} color={theme.primaryForeground} strokeWidth={2.5} />}
        </View>
      )}

      {category && <CategoryBadge category={category} />}

      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: isSelected ? theme.primary : theme.foreground,
            fontFamily: isSelected ? FONTS.sansSemiBold : FONTS.sansRegular,
          },
        ]}
      >
        {task.title}
      </Text>

      {mode === 'select' && isSelected && (
        <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
          <Text
            style={[
              styles.currentBadgeText,
              { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
            ]}
          >
            선택됨
          </Text>
        </View>
      )}

      {mode === 'manage' && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onEdit?.(task)}
            hitSlop={4}
            style={styles.iconButton}
            accessibilityLabel="수정"
          >
            <Pencil size={14} color={theme.mutedForeground} />
          </Pressable>
          <Pressable
            onPress={() => onDeleteRequest?.(task.id)}
            hitSlop={4}
            style={styles.iconButton}
            accessibilityLabel="삭제"
          >
            <Trash2 size={14} color={theme.mutedForeground} />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dragging: {
    opacity: 0.5,
  },
  gripButton: {
    padding: 4,
  },
  selectCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 14,
  },
  currentBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  currentBadgeText: {
    fontSize: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
});
