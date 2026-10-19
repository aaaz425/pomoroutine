'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, User } from 'lucide-react';
import { useSettings, useSettingsActions } from '@/hooks/useSettings';
import { TextInput } from '@/components/shared/TextInput';
import { INPUT_LIMITS } from '@/lib/constants/limits';

export function ProfileSection() {
  const nickname = useSettings((s) => s.nickname);
  const { setNickname } = useSettingsActions();

  const [draft, setDraft] = useState(nickname);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  function handleSave() {
    setNickname(draft.trim());
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
  }

  const dirty = draft.trim() !== nickname;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <User className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-foreground shrink-0">닉네임</span>

      <TextInput
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        placeholder="닉네임 입력 (선택)"
        maxLength={INPUT_LIMITS.NICKNAME_MAX_LENGTH}
        className="flex-1 min-w-0 h-8 py-1.5 text-sm"
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty}
        className="flex items-center gap-1 shrink-0 px-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saved ? <Check className="w-3.5 h-3.5 text-primary" /> : '저장'}
      </button>
    </div>
  );
}
