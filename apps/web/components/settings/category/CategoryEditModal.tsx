'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useTaskStore } from '@/store/StoreProvider';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/shared/TextInput';
import { CategoryBadge } from '@/components/shared/CategoryBadge';
import { ColorPickerModal } from '@/components/settings/category/ColorPickerModal';
import type { Category } from '@/types';

import { CATEGORY_PRESET_COLORS } from '@/lib/constants/categoryColors';
import { INPUT_LIMITS } from '@/lib/constants/limits';

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const RAINBOW_GRADIENT =
  'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';

interface Props {
  category: Category | null; // null = 새 카테고리
  onClose: () => void;
}

export function CategoryEditModal({ category, onClose }: Props) {
  const addCategory = useTaskStore((s) => s.addCategory);
  const updateCategory = useTaskStore((s) => s.updateCategory);

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

  const title = category ? '카테고리 편집' : '카테고리 추가';

  return (
    <>
      <Modal
        title={title}
        onClose={onClose}
        dirty={dirty}
        widthClassName="sm:w-[360px]"
        footer={
          <>
            <CategoryBadge
              className="mr-auto"
              category={{
                id: 'preview',
                name: name.trim() || '미리보기',
                color: isValidColor ? color : CATEGORY_PRESET_COLORS[0].hex,
              }}
            />
            <Button onClick={onClose} variant="secondary" size="lg" className="px-4">
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !isValidColor}
              variant="default"
              size="lg"
              className="px-4 font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              저장
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-name" className="text-xs font-medium text-muted-foreground">
            이름
          </label>
          <TextInput
            id="category-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="카테고리 이름"
            className="w-full"
            maxLength={INPUT_LIMITS.NICKNAME_MAX_LENGTH}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span id="category-color-label" className="text-xs font-medium text-muted-foreground">
            색상
          </span>
          <div className="flex gap-2 flex-wrap" role="group" aria-labelledby="category-color-label">
            {CATEGORY_PRESET_COLORS.map(({ hex, label }) => (
              <button
                key={hex}
                type="button"
                onClick={() => setColor(hex)}
                aria-label={label}
                aria-pressed={color.toLowerCase() === hex}
                style={{ backgroundColor: hex }}
                className={`w-8 h-8 rounded-full transition-all ${
                  color.toLowerCase() === hex
                    ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground/30 scale-110'
                    : 'hover:scale-110'
                }`}
              />
            ))}
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              aria-label="색상 직접 선택"
              aria-pressed={!isPreset}
              style={{ background: RAINBOW_GRADIENT }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                !isPreset
                  ? 'ring-2 ring-offset-2 ring-offset-card ring-foreground/30 scale-110'
                  : 'hover:scale-110'
              }`}
            >
              <Pencil className="w-3.5 h-3.5 text-white drop-shadow" />
            </button>
          </div>
        </div>
      </Modal>

      {showPicker && (
        <ColorPickerModal
          initialHex={isValidColor ? color : CATEGORY_PRESET_COLORS[0].hex}
          onCancel={() => setShowPicker(false)}
          onConfirm={(hex) => {
            setColor(hex);
            setShowPicker(false);
          }}
        />
      )}
    </>
  );
}
