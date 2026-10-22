import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { FEEDBACK_LIMITS, sendFeedback, withAlpha } from '@pomoroutine/shared';
import { Text } from '@/components/shared/Text';
import { Modal } from '@/components/shared/Modal';
import { Portal } from '@/components/shared/Portal';
import { TextInput } from '@/components/shared/TextInput';
import { FONTS } from '@/constants/fonts';
import { useThemeTokens } from '@/hooks/use-theme-scheme';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function FeedbackModalContent({ visible, onClose }: Props) {
  const theme = useThemeTokens();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = message.trim() !== '' && !isSubmitting;

  function handleClose() {
    setMessage('');
    setIsSubmitting(false);
    onClose();
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const result = await sendFeedback(supabase, {
      message,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: Constants.expoConfig?.version ?? 'unknown',
    });
    toast(result);
    if (result.type === 'success') handleClose();
    else setIsSubmitting(false);
  }

  return (
    <Modal
      visible={visible}
      title="의견 보내기"
      onClose={handleClose}
      dirty={message !== ''}
      keyboardShouldPersistTaps="handled"
      footer={
        <>
          <Pressable
            onPress={handleClose}
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
            disabled={!canSubmit}
            style={[
              styles.footerButton,
              { backgroundColor: theme.primary },
              !canSubmit && styles.disabled,
            ]}
          >
            <Text
              style={[
                styles.footerButtonText,
                { color: theme.primaryForeground, fontFamily: FONTS.sansSemiBold },
              ]}
            >
              {isSubmitting ? '보내는 중...' : '보내기'}
            </Text>
          </Pressable>
        </>
      }
    >
      <View style={styles.field}>
        <TextInput
          autoFocus
          multiline
          value={message}
          onChangeText={setMessage}
          maxLength={FEEDBACK_LIMITS.MESSAGE_MAX_LENGTH}
          placeholder="불편한 점이나 바라는 기능을 자유롭게 적어주세요"
          style={styles.input}
        />
        <Text
          style={[
            styles.counter,
            { color: withAlpha(theme.mutedForeground, 0.6), fontFamily: FONTS.sansRegular },
          ]}
        >
          {message.length} / {FEEDBACK_LIMITS.MESSAGE_MAX_LENGTH}
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  input: {
    height: 160,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 11,
    textAlign: 'right',
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

export function FeedbackModal(props: Props) {
  return (
    <Portal>
      <FeedbackModalContent {...props} />
    </Portal>
  );
}
