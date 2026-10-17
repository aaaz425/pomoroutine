import { Pressable } from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { withAlpha } from '@/constants/timerColors';
import { DRAG_START_DELAY_MS } from '@/constants/ux';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

const ICON_SIZE = 18;
const ICON_OPACITY = 0.5;
const TOUCH_TARGET_SIZE = 44;
const HIT_SLOP = (TOUCH_TARGET_SIZE - ICON_SIZE) / 2;

interface Props {
  onDrag?: () => void;
}

export function DragHandle({ onDrag }: Props) {
  const theme = useThemeTokens();

  return (
    <Pressable
      onLongPress={onDrag}
      delayLongPress={DRAG_START_DELAY_MS}
      hitSlop={HIT_SLOP}
      accessibilityLabel="순서 조정"
    >
      <GripVertical size={ICON_SIZE} color={withAlpha(theme.mutedForeground, ICON_OPACITY)} />
    </Pressable>
  );
}
