'use client';

import { GripVertical } from 'lucide-react';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';

interface Props {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

export function DragHandle({ attributes, listeners }: Props) {
  return (
    <button
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
      aria-label="순서 조정"
      className="shrink-0 -m-[13px] p-[13px] text-muted-foreground/50 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors touch-none"
    >
      <GripVertical className="w-4.5 h-4.5" />
    </button>
  );
}
