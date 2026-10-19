import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { DISTRACTION_TAGS, INPUT_LIMITS, withAlpha } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { TextInput } from '@/components/shared/TextInput';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function DistractionTagPicker({ value, onChange, disabled = false }: Props) {
  const theme = useThemeTokens();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const skipBlurCommitRef = useRef(false);

  function toggle(tagId: string) {
    onChange(value.includes(tagId) ? value.filter((id) => id !== tagId) : [...value, tagId]);
  }

  function removeCustom(text: string) {
    onChange(value.filter((v) => v !== text));
  }

  function handleAdd() {
    const trimmed = draft.trim();
    if (trimmed) {
      // 프리셋 라벨과 같은 텍스트면 커스텀 추가 대신 프리셋 선택으로 처리 — 똑같이 생긴 칩 중복 방지
      const matchedPreset = DISTRACTION_TAGS.find(
        (tag) => tag.label.toLowerCase() === trimmed.toLowerCase(),
      );
      if (matchedPreset) {
        if (!value.includes(matchedPreset.id)) onChange([...value, matchedPreset.id]);
      } else if (!value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
        onChange([...value, trimmed]);
      }
    }
    // 빈 채로 블러/제출해도 입력창은 닫혀야 한다 — 그냥 두면 트리거 칩으로 안 돌아옴.
    setDraft('');
    setAdding(false);
  }

  function handleCancel() {
    setDraft('');
    setAdding(false);
  }

  function handleBlur() {
    // 취소 버튼의 onPressIn에서 세운 플래그 — blur가 먼저 발동해 입력값이 그대로 추가되는 것을 막음
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    handleAdd();
  }

  const customTags = value.filter((v) => !DISTRACTION_TAGS.some((tag) => tag.id === v));

  return (
    <View style={styles.row}>
      {DISTRACTION_TAGS.map((tag) => {
        const isSelected = value.includes(tag.id);
        return (
          <Pressable
            key={tag.id}
            disabled={disabled}
            onPress={() => toggle(tag.id)}
            style={[
              styles.chip,
              isSelected
                ? { backgroundColor: withAlpha(theme.primary, 0.1), borderColor: theme.primary }
                : { backgroundColor: theme.card, borderColor: theme.border },
              disabled && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? theme.primary : theme.mutedForeground,
                  fontFamily: FONTS.sansMedium,
                },
              ]}
            >
              {tag.label}
            </Text>
          </Pressable>
        );
      })}

      {customTags.map((text) => (
        <Pressable
          key={text}
          disabled={disabled}
          onPress={() => removeCustom(text)}
          accessibilityLabel={`${text} 삭제`}
          style={[
            styles.chip,
            { backgroundColor: withAlpha(theme.primary, 0.1), borderColor: theme.primary },
            disabled && styles.disabled,
          ]}
        >
          <Text style={[styles.label, { color: theme.primary, fontFamily: FONTS.sansMedium }]}>
            {text}
          </Text>
        </Pressable>
      ))}

      {disabled ? null : adding ? (
        <View style={styles.addRow}>
          <TextInput
            autoFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleAdd}
            onBlur={handleBlur}
            maxLength={INPUT_LIMITS.DISTRACTION_TAG_MAX_LENGTH}
            placeholder="직접입력"
            style={styles.addInput}
          />
          <Pressable
            onPressIn={() => {
              skipBlurCommitRef.current = true;
            }}
            onPress={handleCancel}
            accessibilityLabel="직접입력 취소"
            hitSlop={4}
            style={styles.iconButton}
          >
            <X size={14} color={theme.mutedForeground} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setAdding(true)}
          style={[styles.chip, styles.addChip, { borderColor: theme.border }]}
        >
          <Plus size={12} color={theme.mutedForeground} />
          <Text
            style={[styles.label, { color: theme.mutedForeground, fontFamily: FONTS.sansMedium }]}
          >
            직접입력
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderStyle: 'dashed',
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addInput: {
    width: 96,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontSize: 12,
  },
  iconButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
