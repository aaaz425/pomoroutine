import type { ShareCardPalette } from '@pomoroutine/shared';
import type { ShareCardData } from '@/types';
import { SHARE_CARD_SIZE } from '@/lib/constants/shareCard';
import { formatCount } from '@/lib/sessionUtils';

const SIZE = SHARE_CARD_SIZE;
const PADDING = 80;
const CENTER_X = SIZE / 2;

async function loadFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load('700 160px Pretendard'),
    document.fonts.load('600 40px Pretendard'),
    document.fonts.load('400 28px Pretendard'),
  ]);
}

function drawBackground(ctx: CanvasRenderingContext2D, colors: ShareCardPalette): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, SIZE);
  gradient.addColorStop(0, colors.bgTop);
  gradient.addColorStop(1, colors.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const glow = ctx.createRadialGradient(
    CENTER_X,
    SIZE * 0.35,
    0,
    CENTER_X,
    SIZE * 0.35,
    SIZE * 0.6,
  );
  glow.addColorStop(0, colors.accentSoft);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  colors: ShareCardPalette,
  periodLabel: string,
): void {
  ctx.textBaseline = 'middle';

  ctx.textAlign = 'left';
  ctx.fillStyle = colors.accent;
  ctx.font = '700 40px Pretendard';
  ctx.fillText('PomoRoutine', PADDING, PADDING + 20);

  ctx.font = '600 28px Pretendard';
  const pillText = periodLabel;
  const pillPaddingX = 24;
  const pillWidth = ctx.measureText(pillText).width + pillPaddingX * 2;
  const pillHeight = 52;
  const pillX = SIZE - PADDING - pillWidth;
  const pillY = PADDING + 20 - pillHeight / 2;

  ctx.fillStyle = colors.accentSoft;
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();

  ctx.fillStyle = colors.accent;
  ctx.textAlign = 'center';
  ctx.fillText(pillText, pillX + pillWidth / 2, pillY + pillHeight / 2 + 1);
}

function drawHeadline(
  ctx: CanvasRenderingContext2D,
  colors: ShareCardPalette,
  headline: string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.accent;
  ctx.font = '600 32px Pretendard';
  ctx.fillText(headline, CENTER_X, PADDING + 130);
}

// 순수 장식용 도트 필드 — 기존 70% 고정 아크 링은 실제 진행률처럼 오독될 수 있어 제거함
function drawHeroOrnament(
  ctx: CanvasRenderingContext2D,
  colors: ShareCardPalette,
  centerY: number,
): void {
  const radius = 260;
  const spacing = 28;
  const dotRadius = 1.6;
  ctx.fillStyle = colors.accent;
  for (let dx = -radius; dx <= radius; dx += spacing) {
    for (let dy = -radius; dy <= radius; dy += spacing) {
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const alpha = 0.5 * (1 - dist / radius);
      if (alpha <= 0.02) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(CENTER_X + dx, centerY + dy, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

const HERO_MAX_WIDTH = 420; // 도트 장식 필드(반지름 260) 안쪽에 들어오도록 제한

function fittedHeroFontSize(ctx: CanvasRenderingContext2D, text: string): number {
  const maxSize = 120;
  const minSize = 64;
  for (let size = maxSize; size > minSize; size -= 4) {
    ctx.font = `700 ${size}px Pretendard`;
    if (ctx.measureText(text).width <= HERO_MAX_WIDTH) return size;
  }
  return minSize;
}

function drawHeroStat(
  ctx: CanvasRenderingContext2D,
  colors: ShareCardPalette,
  centerY: number,
  totalFocusLabel: string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = fittedHeroFontSize(ctx, totalFocusLabel);
  ctx.fillStyle = colors.textPrimary;
  ctx.font = `700 ${fontSize}px Pretendard`;
  ctx.fillText(totalFocusLabel, CENTER_X, centerY - 10);

  ctx.fillStyle = colors.textSecondary;
  ctx.font = '400 32px Pretendard';
  ctx.fillText('집중 시간', CENTER_X, centerY + 90);
}

function drawSecondaryStats(
  ctx: CanvasRenderingContext2D,
  colors: ShareCardPalette,
  y: number,
  sessionCount: number,
  streakDays: number,
): void {
  const columnWidth = 260;
  const leftX = CENTER_X - columnWidth / 2;
  const rightX = CENTER_X + columnWidth / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = colors.textMuted;
  ctx.font = '400 26px Pretendard';
  ctx.fillText('기록 수', leftX, y);
  ctx.fillText('연속 집중일', rightX, y);

  ctx.fillStyle = colors.textPrimary;
  ctx.font = '600 48px Pretendard';
  ctx.fillText(formatCount(sessionCount), leftX, y + 60);
  ctx.fillText(`${streakDays}일`, rightX, y + 60);

  ctx.strokeStyle = colors.divider;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CENTER_X, y - 40);
  ctx.lineTo(CENTER_X, y + 90);
  ctx.stroke();
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  colors: ShareCardPalette,
  generatedAtLabel: string,
): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = colors.textMuted;
  ctx.font = '400 26px Pretendard';
  ctx.fillText(generatedAtLabel, CENTER_X, SIZE - PADDING);
}

export async function drawShareCard(
  ctx: CanvasRenderingContext2D,
  data: ShareCardData,
  colors: ShareCardPalette,
): Promise<void> {
  await loadFonts();

  ctx.clearRect(0, 0, SIZE, SIZE);
  drawBackground(ctx, colors);
  drawHeader(ctx, colors, data.periodLabel);
  drawHeadline(ctx, colors, data.headline);

  const heroCenterY = 490;
  drawHeroOrnament(ctx, colors, heroCenterY);
  drawHeroStat(ctx, colors, heroCenterY, data.totalFocusLabel);
  drawSecondaryStats(ctx, colors, 860, data.sessionCount, data.streakDays);
  drawFooter(ctx, colors, data.generatedAtLabel);
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob failed'));
    }, 'image/png');
  });
}

export async function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  // 실제 파일 없이 타입만으로 지원 여부를 확정할 수 없는 브라우저도 있어, 여기서는 API 존재 여부만 확인
  return true;
}

export async function shareCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
  shareText?: string,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canShareFiles()) return 'unsupported';

  const blob = await canvasToBlob(canvas);
  const file = new File([blob], filename, { type: 'image/png' });

  if (!navigator.canShare({ files: [file] })) return 'unsupported';

  try {
    await navigator.share({ files: [file], text: shareText });
    return 'shared';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}
