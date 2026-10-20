import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library/legacy';
import type { ShareCardAction } from '@pomoroutine/shared';
import { PNG_DATA_URL_PREFIX, WebviewBridgeMessageSchema } from '@/types/webviewBridge';
import { toast } from '@/lib/toast';
import { TOAST_MESSAGES } from '@pomoroutine/shared';

function writeTempPng(dataUrl: string): string {
  const file = new File(Paths.cache, `pomoroutine-share-${Date.now()}.png`);
  file.write(dataUrl.slice(PNG_DATA_URL_PREFIX.length), { encoding: 'base64' });
  return file.uri;
}

async function handleShareCard(action: ShareCardAction, dataUrl: string) {
  const uri = writeTempPng(dataUrl);

  if (action === 'share') {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('공유를 사용할 수 없어요', '이 기기에서는 공유 기능을 지원하지 않아요.');
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: '오늘의 집중 기록 — PomoRoutine',
      UTI: 'public.png',
    });
    return;
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    Alert.alert('저장 권한이 필요해요', '설정에서 사진 접근 권한을 허용해주세요.');
    return;
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  toast(TOAST_MESSAGES.shareCardSaved);
}

export function handleWebviewMessage(
  { url, data }: { url: string; data: string },
  webAppUrl: string,
) {
  if (new URL(url).origin !== new URL(webAppUrl).origin) return;

  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }

  const result = WebviewBridgeMessageSchema.safeParse(payload);
  if (!result.success) return;

  handleShareCard(result.data.action, result.data.dataUrl).catch(() => {
    Alert.alert('처리하지 못했어요', '잠시 후 다시 시도해주세요.');
  });
}
