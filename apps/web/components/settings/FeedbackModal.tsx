'use client';

import { useState } from 'react';
import { sendFeedback } from '@pomoroutine/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Modal } from '@/components/shared/Modal';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';
import { FEEDBACK_LIMITS } from '@/lib/constants/limits';

interface Props {
  onClose: () => void;
}

export function FeedbackModal({ onClose }: Props) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = message.trim() !== '' && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const result = await sendFeedback(createClient(), {
      message,
      platform: 'web',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    });
    toast(result);
    if (result.type === 'success') onClose();
    else setIsSubmitting(false);
  }

  return (
    <Modal
      title="의견 보내기"
      onClose={onClose}
      dirty={message !== ''}
      footer={
        <>
          <Button onClick={onClose} variant="secondary" size="lg" className="px-4">
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            variant="default"
            size="lg"
            className="px-4 font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '보내는 중...' : '보내기'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <Textarea
          aria-label="의견"
          autoFocus
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={FEEDBACK_LIMITS.MESSAGE_MAX_LENGTH}
          placeholder="불편한 점이나 바라는 기능을 자유롭게 적어주세요"
          className={[
            'field-sizing-fixed w-full h-[160px] resize-none rounded-md border-border',
            'bg-card dark:bg-card px-3.5 py-3 text-base text-foreground',
            'placeholder:text-muted-foreground/50',
            'outline-none focus-visible:border-border focus-visible:ring-2 focus-visible:ring-ring/50',
          ].join(' ')}
        />
        <div className="flex justify-end">
          <span className="text-[11px] text-muted-foreground/60">
            {message.length} / {FEEDBACK_LIMITS.MESSAGE_MAX_LENGTH}
          </span>
        </div>
      </div>
    </Modal>
  );
}
