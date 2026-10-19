import { Pressable, StyleSheet, View } from 'react-native';
import { Bell, Eye, Pause, Play, Volume2 } from 'lucide-react-native';
import { SOUND_LIMITS, type SoundType } from '@pomoroutine/shared';
import { useSettings, useSettingsActions } from '@/hooks/useSettings';
import { Text } from '@/components/shared/Text';
import { SoundTypeSelect } from '@/components/settings/SoundTypeSelect';
import { StepperInput } from '@/components/shared/StepperInput';
import { Toggle } from '@/components/shared/Toggle';
import { requestNotificationPermissionAsync } from '@/lib/notifications';
import { useSoundPreview } from '@/hooks/useSoundPreview';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';

export function NotificationSection() {
  const theme = useThemeTokens();

  const browserNotification = useSettings((s) => s.browserNotification);
  const keepScreenAwake = useSettings((s) => s.keepScreenAwake);
  const soundAlert = useSettings((s) => s.soundAlert);
  const soundType = useSettings((s) => s.soundType);
  const soundVolume = useSettings((s) => s.soundVolume);
  const soundRepeatCount = useSettings((s) => s.soundRepeatCount);
  const {
    setBrowserNotification,
    setKeepScreenAwake,
    setSoundAlert,
    setSoundType,
    setSoundVolume,
    setSoundRepeatCount,
  } = useSettingsActions();

  const {
    isPlaying,
    toggle: togglePreview,
    stop: stopPreview,
  } = useSoundPreview(soundType, soundVolume, soundRepeatCount);

  async function handlePushNotificationChange(enabled: boolean) {
    if (enabled) {
      const granted = await requestNotificationPermissionAsync();
      if (!granted) return;
    }
    void setBrowserNotification(enabled);
  }

  function handleSoundAlertToggle(enabled: boolean) {
    if (!enabled && isPlaying) stopPreview();
    void setSoundAlert(enabled);
  }

  function handleSoundTypeChange(type: SoundType) {
    if (isPlaying && type !== soundType) stopPreview();
    setSoundType(type);
  }

  return (
    <View style={styles.container}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Bell size={16} color={theme.mutedForeground} />
          <View>
            <Text
              style={[styles.title, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}
            >
              푸시 알림
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              타이머 종료 시 알림 표시
            </Text>
          </View>
        </View>
        <Toggle
          checked={browserNotification}
          onChange={(v) => void handlePushNotificationChange(v)}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Eye size={16} color={theme.mutedForeground} />
          <View>
            <Text
              style={[styles.title, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}
            >
              화면 꺼짐 방지
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              타이머 실행 중 화면이 꺼지지 않아요
            </Text>
          </View>
        </View>
        <Toggle checked={keepScreenAwake} onChange={(v) => void setKeepScreenAwake(v)} />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleLeft}>
          <Volume2 size={16} color={theme.mutedForeground} />
          <View>
            <Text
              style={[styles.title, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}
            >
              소리 알림
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: theme.mutedForeground, fontFamily: FONTS.sansRegular },
              ]}
            >
              타이머 종료 시 소리 재생
            </Text>
          </View>
        </View>
        <Toggle checked={soundAlert} onChange={handleSoundAlertToggle} />
      </View>

      <View
        style={[styles.fieldset, { backgroundColor: theme.muted }, !soundAlert && styles.disabled]}
        pointerEvents={soundAlert ? 'auto' : 'none'}
      >
        <View style={styles.fieldRow}>
          <Text
            style={[styles.fieldLabel, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}
          >
            소리 종류
          </Text>
          <View style={styles.soundTypeControls}>
            <SoundTypeSelect
              value={soundType}
              onChange={handleSoundTypeChange}
              disabled={!soundAlert}
            />
            <Pressable
              onPress={togglePreview}
              disabled={!soundAlert}
              hitSlop={8}
              style={styles.previewButton}
            >
              {isPlaying ? (
                <Pause size={14} color={theme.mutedForeground} fill={theme.mutedForeground} />
              ) : (
                <Play size={14} color={theme.mutedForeground} fill={theme.mutedForeground} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldRow}>
          <Text
            style={[styles.fieldLabel, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}
          >
            음량
          </Text>
          <StepperInput
            value={soundVolume}
            onChange={(v) => void setSoundVolume(v)}
            min={SOUND_LIMITS.VOLUME_MIN}
            max={SOUND_LIMITS.VOLUME_MAX}
            step={5}
            unit="%"
            disabled={!soundAlert}
          />
        </View>

        <View style={styles.fieldRow}>
          <Text
            style={[styles.fieldLabel, { color: theme.foreground, fontFamily: FONTS.sansRegular }]}
          >
            반복 횟수
          </Text>
          <StepperInput
            value={soundRepeatCount}
            onChange={(v) => void setSoundRepeatCount(v)}
            min={SOUND_LIMITS.REPEAT_MIN}
            max={SOUND_LIMITS.REPEAT_MAX}
            unit="회"
            disabled={!soundAlert}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  fieldset: {
    gap: 14,
    padding: 14,
    borderRadius: 12,
  },
  disabled: {
    opacity: 0.4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
  },
  soundTypeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
