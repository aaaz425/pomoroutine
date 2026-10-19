import { useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import type { SoundType } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { Portal } from '@/components/shared/Portal';
import { SOUND_TYPE_LABELS } from '@pomoroutine/shared';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

interface Props {
  value: SoundType;
  onChange: (value: SoundType) => void;
  disabled?: boolean;
}

const DROPDOWN_WIDTH = 128;
const OPTION_HEIGHT = 36;
const VIEWPORT_MARGIN = 8;

const OPTIONS = Object.keys(SOUND_TYPE_LABELS) as SoundType[];

export function SoundTypeSelect({ value, onChange, disabled }: Props) {
  const theme = useThemeTokens();
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  function handleOpen() {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const windowHeight = Dimensions.get('window').height;
      const windowWidth = Dimensions.get('window').width;
      const dropdownHeight = OPTIONS.length * OPTION_HEIGHT + 8;
      const spaceBelow = windowHeight - (y + height);
      const top =
        spaceBelow >= dropdownHeight + VIEWPORT_MARGIN
          ? y + height + 4
          : Math.max(VIEWPORT_MARGIN, y - dropdownHeight - 4);
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, x + width - DROPDOWN_WIDTH),
        windowWidth - DROPDOWN_WIDTH - VIEWPORT_MARGIN,
      );
      setCoords({ top, left });
      setOpen(true);
    });
  }

  return (
    <View>
      <Pressable
        ref={triggerRef}
        onPress={handleOpen}
        disabled={disabled}
        style={[
          styles.trigger,
          { backgroundColor: theme.muted, borderColor: open ? theme.primary : theme.border },
        ]}
      >
        <Text
          style={[styles.triggerLabel, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}
        >
          {SOUND_TYPE_LABELS[value]}
        </Text>
        <ChevronDown size={14} color={theme.mutedForeground} />
      </Pressable>

      {open && coords && (
        <Portal>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityLabel="닫기"
          />
          <View
            style={[
              styles.dropdown,
              {
                top: coords.top,
                left: coords.left,
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            {OPTIONS.map((key) => {
              const selected = key === value;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color: selected ? theme.primary : theme.foreground,
                        fontFamily: FONTS.sansRegular,
                      },
                    ]}
                  >
                    {SOUND_TYPE_LABELS[key]}
                  </Text>
                  {selected && <Check size={14} color={theme.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    width: 96,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  triggerLabel: {
    fontSize: 14,
  },
  dropdown: {
    position: 'absolute',
    width: DROPDOWN_WIDTH,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionLabel: {
    fontSize: 14,
  },
});
