import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Tag } from 'lucide-react-native';
import { Text } from '@/components/shared/Text';
import { useTaskStore } from '@/store/StoreProvider';
import { Modal } from '@/components/shared/Modal';
import { Portal } from '@/components/shared/Portal';
import { TextInput } from '@/components/shared/TextInput';
import { CategoryPills } from '@/components/shared/CategoryPills';
import { CategoryModal } from '@/components/settings/CategoryModal';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { INPUT_LIMITS } from '@pomoroutine/shared';
import type { Task } from '@/types/tasks';

interface Props {
  task: Task | null; // null = 새 작업
  onClose: () => void;
  onCreated?: (id: string) => void;
}

function TaskFormModalContent({ task, onClose, onCreated }: Props) {
  const theme = useThemeTokens();

  const categories = useTaskStore((s) => s.categories);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);

  const [initial] = useState(() => ({
    title: task?.title ?? '',
    categoryId: task?.categoryId ?? categories[0]?.id ?? '',
  }));
  const [title, setTitle] = useState(initial.title);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const dirty = title !== initial.title || categoryId !== initial.categoryId;
  // 저장이 비동기(Supabase 왕복)라 이게 없으면 응답 오기 전에 다시 눌러 중복 생성될 수 있음
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  async function handleSubmit() {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);

    if (task === null) {
      const newId = await addTask({ title: trimmed, categoryId });
      if (newId) onCreated?.(newId);
    } else {
      await updateTask(task.id, { title: trimmed, categoryId });
    }
    onClose();
  }

  return (
    <>
      <Modal
        visible
        title={task ? '작업 수정' : '새 작업 추가'}
        onClose={onClose}
        dirty={dirty}
        footer={
          <>
            <Pressable
              onPress={onClose}
              style={[styles.footerButton, { backgroundColor: theme.muted }]}
            >
              <Text
                style={[
                  styles.footerButtonText,
                  { color: theme.foreground, fontFamily: FONTS.sansSemiBold },
                ]}
              >
                취소
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              style={[
                styles.footerButton,
                { backgroundColor: theme.primary },
                (!title.trim() || isSubmitting) && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.footerButtonText,
                  { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
                ]}
              >
                {task ? '저장' : '추가'}
              </Text>
            </Pressable>
          </>
        }
      >
        <View style={styles.field}>
          <Text
            style={[styles.label, { color: theme.mutedForeground, fontFamily: FONTS.sansMedium }]}
          >
            작업 제목
          </Text>
          <TextInput
            autoFocus
            value={title}
            onChangeText={setTitle}
            onSubmitEditing={handleSubmit}
            placeholder="예) 알고리즘 문제 풀기"
            maxLength={INPUT_LIMITS.TITLE_MAX_LENGTH}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.categoryHeaderRow}>
            <Text
              style={[styles.label, { color: theme.mutedForeground, fontFamily: FONTS.sansMedium }]}
            >
              카테고리
            </Text>
            <Pressable
              onPress={() => setShowCategoryModal(true)}
              style={styles.categoryManageButton}
            >
              <Tag size={12} color={theme.mutedForeground} />
              <Text
                style={[
                  styles.label,
                  { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
                ]}
              >
                편집
              </Text>
            </Pressable>
          </View>
          <CategoryPills categories={categories} selectedId={categoryId} onChange={setCategoryId} />
        </View>
      </Modal>

      <CategoryModal visible={showCategoryModal} onClose={() => setShowCategoryModal(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryManageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
  },
  footerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  footerButtonText: {
    fontSize: 14,
  },
  disabled: {
    opacity: 0.4,
  },
});

export function TaskFormModal(props: Props) {
  return (
    <Portal>
      <TaskFormModalContent {...props} />
    </Portal>
  );
}
