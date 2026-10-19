import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, User } from 'lucide-react-native';
import { INPUT_LIMITS } from '@pomoroutine/shared';
import { useSettings, useSettingsActions } from '@/hooks/useSettings';
import { Text } from '@/components/shared/Text';
import { TextInput } from '@/components/shared/TextInput';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

export function ProfileSection() {
  const theme = useThemeTokens();

  const nickname = useSettings((s) => s.nickname);
  const { setNickname } = useSettingsActions();

  const [draft, setDraft] = useState(nickname);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(savedTimerRef.current), []);

  function handleSave() {
    void setNickname(draft.trim());
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
  }

  const dirty = draft.trim() !== nickname;

  return (
    <View style={styles.row}>
      <User size={16} color={theme.mutedForeground} />
      <Text style={[styles.label, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}>
        닉네임
      </Text>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={(t) => {
          setDraft(t);
          setSaved(false);
        }}
        onSubmitEditing={handleSave}
        placeholder="닉네임 입력 (선택)"
        maxLength={INPUT_LIMITS.NICKNAME_MAX_LENGTH}
      />
      <Pressable
        onPress={handleSave}
        disabled={!dirty}
        hitSlop={8}
        style={[styles.saveButton, !dirty && styles.disabled]}
      >
        {saved ? (
          <Check size={14} color={theme.primary} />
        ) : (
          <Text
            style={[
              styles.saveText,
              { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
            ]}
          >
            저장
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  label: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 32,
    paddingVertical: 6,
    borderRadius: 8,
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  saveText: {
    fontSize: 12,
  },
});
