import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Pencil } from 'lucide-react-native';
import { useTaskActions } from '@/hooks/useTasks';
import { Text } from '@/components/shared/Text';
import { Modal } from '@/components/shared/Modal';
import { Portal } from '@/components/shared/Portal';
import { TextInput } from '@/components/shared/TextInput';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { ColorPickerModal } from '@/components/settings/ColorPickerModal';
import { CATEGORY_PRESET_COLORS } from '@/constants/categoryColors';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { INPUT_LIMITS } from '@pomoroutine/shared';
import type { Category } from '@/types/tasks';

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const RAINBOW_COLORS = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff'] as const;

interface Props {
  category: Category | null; // null = 새 카테고리
  onClose: () => void;
}

function CategoryEditModalContent({ category, onClose }: Props) {
  const theme = useThemeTokens();
  const { addCategory, updateCategory } = useTaskActions();

  const [initial] = useState(() => ({
    name: category?.name ?? '',
    color: category?.color ?? CATEGORY_PRESET_COLORS[0].hex,
  }));
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const dirty = name !== initial.name || color !== initial.color;
  const [showPicker, setShowPicker] = useState(false);
  const isValidColor = HEX_PATTERN.test(color);
  const isPreset = CATEGORY_PRESET_COLORS.some(({ hex }) => hex === color.toLowerCase());

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || !isValidColor) return;
    if (category) {
      void updateCategory(category.id, { name: trimmed, color });
    } else {
      void addCategory({ name: trimmed, color });
    }
    onClose();
  }

  return (
    <>
      <Modal
        visible
        title={category ? '카테고리 편집' : '카테고리 추가'}
        onClose={onClose}
        dirty={dirty}
        footer={
          <>
            <CategoryBadge
              style={styles.footerPreview}
              category={{
                id: 'preview',
                name: name.trim() || '미리보기',
                color: isValidColor ? color : CATEGORY_PRESET_COLORS[0].hex,
              }}
            />
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
              onPress={handleSave}
              disabled={!name.trim() || !isValidColor}
              style={[
                styles.footerButton,
                { backgroundColor: theme.primary },
                (!name.trim() || !isValidColor) && styles.disabled,
              ]}
            >
              <Text
                style={[
                  styles.footerButtonText,
                  { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
                ]}
              >
                저장
              </Text>
            </Pressable>
          </>
        }
      >
        <View style={styles.field}>
          <Text
            style={[styles.label, { color: theme.mutedForeground, fontFamily: FONTS.sansMedium }]}
          >
            이름
          </Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleSave}
            placeholder="카테고리 이름"
            maxLength={INPUT_LIMITS.NICKNAME_MAX_LENGTH}
          />
        </View>

        <View style={styles.field}>
          <Text
            style={[styles.label, { color: theme.mutedForeground, fontFamily: FONTS.sansMedium }]}
          >
            색상
          </Text>

          <View style={styles.swatchRow}>
            {CATEGORY_PRESET_COLORS.map(({ hex, label }) => {
              const selected = color.toLowerCase() === hex;
              return (
                <Pressable
                  key={hex}
                  onPress={() => setColor(hex)}
                  accessibilityLabel={label}
                  style={[
                    styles.swatch,
                    { backgroundColor: hex },
                    selected && [styles.swatchSelected, { borderColor: theme.foreground }],
                  ]}
                />
              );
            })}
            <Pressable
              onPress={() => setShowPicker(true)}
              accessibilityLabel="색상 직접 선택"
              style={[
                styles.swatch,
                !isPreset && [styles.swatchSelected, { borderColor: theme.foreground }],
              ]}
            >
              <LinearGradient
                colors={RAINBOW_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.rainbowFill}
              />
              <Pencil size={14} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>

      <ColorPickerModal
        visible={showPicker}
        initialHex={isValidColor ? color : CATEGORY_PRESET_COLORS[0].hex}
        onCancel={() => setShowPicker(false)}
        onConfirm={(hex) => {
          setColor(hex);
          setShowPicker(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    fontSize: 12,
  },
  footerPreview: {
    marginRight: 'auto',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  swatchSelected: {
    borderWidth: 2,
    transform: [{ scale: 1.1 }],
  },
  rainbowFill: {
    ...StyleSheet.absoluteFill,
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

export function CategoryEditModal(props: Props) {
  return (
    <Portal>
      <CategoryEditModalContent {...props} />
    </Portal>
  );
}
