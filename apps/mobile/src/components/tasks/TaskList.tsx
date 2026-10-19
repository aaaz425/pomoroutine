import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { Plus } from 'lucide-react-native';
import { useTasks, useTaskActions } from '@/hooks/useTasks';
import { Text } from '@/components/shared/Text';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { TaskItem } from './TaskItem';
import { TaskFormModal } from './TaskFormModal';
import type { Task } from '@/types/tasks';

interface Props {
  mode: 'select' | 'manage';
  selectedTaskId?: string | null;
  onSelect?: (id: string) => void;
  maxHeight?: number;
  emptyStatePaddingVertical?: number;
}

export function TaskList({
  mode,
  selectedTaskId = null,
  onSelect,
  maxHeight,
  emptyStatePaddingVertical = 16,
}: Props) {
  const theme = useThemeTokens();
  const tasks = useTasks();
  const { reorderTasks, deleteTask } = useTaskActions();

  const [editTarget, setEditTarget] = useState<Task | 'new' | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  function handleDelete() {
    if (!deleteTargetId) return;
    void deleteTask(deleteTargetId);
    setDeleteTargetId(null);
  }

  function handleCreated(id: string) {
    if (mode === 'select') onSelect?.(id);
  }

  function renderRow(task: Task, dragProps?: { drag: () => void; isActive: boolean }) {
    return (
      <TaskItem
        key={task.id}
        task={task}
        mode={mode}
        isSelected={task.id === selectedTaskId}
        onSelect={onSelect}
        onEdit={setEditTarget}
        onDeleteRequest={setDeleteTargetId}
        onDrag={dragProps?.drag}
        isDragging={dragProps?.isActive}
      />
    );
  }

  return (
    <View>
      {tasks.length === 0 ? (
        <EmptyState message="작업이 없습니다" paddingVertical={emptyStatePaddingVertical} />
      ) : mode === 'manage' ? (
        <DraggableFlatList
          data={tasks}
          keyExtractor={(t) => t.id}
          style={styles.scrollList}
          onDragEnd={({ from, to }) => void reorderTasks(from, to)}
          renderItem={({ item, drag, isActive }: RenderItemParams<Task>) =>
            renderRow(item, { drag, isActive })
          }
          contentContainerStyle={styles.list}
        />
      ) : (
        <ScrollView style={maxHeight ? { maxHeight } : undefined} nestedScrollEnabled>
          <View style={styles.list}>{tasks.map((t) => renderRow(t))}</View>
        </ScrollView>
      )}

      <Pressable
        onPress={() => setEditTarget('new')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 24 }}
        style={styles.addButton}
      >
        <Plus size={14} color={theme.mutedForeground} />
        <Text
          style={[styles.addLabel, { color: theme.mutedForeground, fontFamily: FONTS.sansRegular }]}
        >
          새 작업 추가
        </Text>
      </Pressable>

      {editTarget !== null && (
        <TaskFormModal
          task={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onCreated={handleCreated}
        />
      )}

      <ConfirmModal
        visible={deleteTargetId !== null}
        title="작업 삭제"
        description="삭제한 작업은 복구할 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollList: {
    maxHeight: 308, // 행(48px) 6개 + gap(4px) 5개 근사값
  },
  list: {
    gap: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  addLabel: {
    fontSize: 14,
  },
});
