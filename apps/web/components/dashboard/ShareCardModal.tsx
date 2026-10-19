'use client';

import { useRef, useState } from 'react';
import { COLOR_THEMES, type ShareCardAction } from '@pomoroutine/shared';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/ui/button';
import { SHARE_CARD_SIZE } from '@/lib/constants/shareCard';
import { useAccentTheme } from '@/hooks/useAccentTheme';
import {
  canShareFiles,
  downloadCanvasAsPng,
  drawShareCard,
  shareCanvasAsPng,
} from '@/lib/shareCardCanvas';
import { isInNativeApp, postToNativeApp } from '@/lib/nativeApp';
import type { ShareCardData } from '@/types';

interface Props {
  data: ShareCardData;
  onClose: () => void;
}

export function ShareCardModal({ data, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const { colorTheme } = useAccentTheme();
  const palette = COLOR_THEMES[colorTheme].shareCard;
  const inNativeApp = isInNativeApp();
  const shareSupported = inNativeApp || canShareFiles();
  const filename = `pomoroutine-share-${data.generatedAtLabel.replaceAll('.', '')}.png`;

  // Popup 콘텐츠는 마운트보다 한 틱 늦게 DOM에 붙어 useEffect([data])로는 canvasRef가 아직 null일 수 있어, 콜백 ref로 실제 부착 시점에 맞춰 그린다
  const setCanvasRef = (node: HTMLCanvasElement | null) => {
    canvasRef.current = node;
    const ctx = node?.getContext('2d');
    if (ctx) void drawShareCard(ctx, data, palette);
  };

  const sendToNativeApp = (action: ShareCardAction) => {
    if (!canvasRef.current) return;
    postToNativeApp({
      type: 'share-card',
      action,
      dataUrl: canvasRef.current.toDataURL('image/png'),
    });
  };

  const handleDownload = async () => {
    if (inNativeApp) return sendToNativeApp('save');
    if (!canvasRef.current) return;
    setIsBusy(true);
    try {
      await downloadCanvasAsPng(canvasRef.current, filename);
    } finally {
      setIsBusy(false);
    }
  };

  const handleShare = async () => {
    if (inNativeApp) return sendToNativeApp('share');
    if (!canvasRef.current) return;
    setIsBusy(true);
    try {
      await shareCanvasAsPng(canvasRef.current, filename, '오늘의 집중 기록 — PomoRoutine');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Modal
      title="공유 카드"
      onClose={onClose}
      widthClassName="sm:w-[480px]"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            닫기
          </Button>
          {shareSupported && (
            <Button variant="outline" onClick={handleShare} disabled={isBusy}>
              공유
            </Button>
          )}
          <Button onClick={handleDownload} disabled={isBusy}>
            다운로드
          </Button>
        </>
      }
    >
      <canvas
        ref={setCanvasRef}
        width={SHARE_CARD_SIZE}
        height={SHARE_CARD_SIZE}
        role="img"
        aria-label="오늘의 집중 기록 공유 카드"
        className="w-full h-auto rounded-lg"
      />
    </Modal>
  );
}
