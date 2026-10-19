import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { PhaseEndAlert } from '@pomoroutine/shared';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const TIMER_COMPLETE_CHANNEL_ID = 'timer-complete';

// 채널을 명시적으로 안 만들면 기본 중요도로 생성되어 헤드업 배너/사운드가 안 뜰 수 있음
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync(TIMER_COMPLETE_CHANNEL_ID, {
    name: '타이머 완료 알림',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function requestNotificationPermissionAsync(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

const TIMER_NOTIFICATION_ID_PREFIX = 'timer-phase-end-';

let syncQueue: Promise<void> = Promise.resolve();

export function syncTimerNotifications(alerts: PhaseEndAlert[], sound: boolean): Promise<void> {
  syncQueue = syncQueue.then(() => applyTimerNotifications(alerts, sound)).catch(() => {});
  return syncQueue;
}

function notificationId(alert: PhaseEndAlert, sound: boolean): string {
  return `${TIMER_NOTIFICATION_ID_PREFIX}${alert.at}-${sound ? 'sound' : 'silent'}`;
}

async function applyTimerNotifications(alerts: PhaseEndAlert[], sound: boolean): Promise<void> {
  const now = Date.now();
  const wanted = new Map(
    alerts.filter((alert) => alert.at > now).map((alert) => [notificationId(alert, sound), alert]),
  );
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const kept = new Set<string>();
  for (const request of scheduled) {
    const alert = wanted.get(request.identifier);
    if (alert && request.content.title === alert.title && request.content.body === alert.body) {
      kept.add(request.identifier);
    } else {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }

  const missing = [...wanted].filter(([id]) => !kept.has(id));
  if (missing.length === 0) return;
  if (!(await requestNotificationPermissionAsync())) return;
  for (const [identifier, alert] of missing) {
    if (alert.at <= Date.now()) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: alert.title,
        body: alert.body,
        sound: sound ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: alert.at,
        ...(Platform.OS === 'android' && { channelId: TIMER_COMPLETE_CHANNEL_ID }),
      },
    });
  }
}
