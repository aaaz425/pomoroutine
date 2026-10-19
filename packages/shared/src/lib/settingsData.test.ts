import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  createSettingsQuery,
  getSettingsActions,
  toMessageKeys,
  type SettingsDataApi,
} from './settingsData';
import { QUERY_KEYS } from '../constants/queryKeys';
import { DEFAULT_APP_SETTINGS } from '../constants/defaults';
import { TOAST_MESSAGES } from '../constants/toastMessages';
import type { AppSettings } from '../types/settings';

let api: SettingsDataApi;
let client: QueryClient;

function setup(overrides: Partial<AppSettings> = {}) {
  const settings = { ...DEFAULT_APP_SETTINGS, ...overrides };
  client.setQueryData(QUERY_KEYS.settings, settings);
  vi.mocked(api.fetchSettings).mockResolvedValue(settings);
  return getSettingsActions(client, api);
}

const cached = () => client.getQueryData<AppSettings>(QUERY_KEYS.settings);

beforeEach(() => {
  api = {
    fetchSettings: vi.fn().mockResolvedValue(DEFAULT_APP_SETTINGS),
    saveSettings: vi.fn().mockResolvedValue({ error: false }),
    toast: vi.fn(),
  };
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

describe('getSettingsActions', () => {
  it('저장 전에 화면에 먼저 반영하고 전체 설정을 저장', async () => {
    const actions = setup();
    let resolve: (value: { error: boolean }) => void = () => {};
    vi.mocked(api.saveSettings).mockReturnValue(new Promise((r) => (resolve = r)));

    const pending = actions.setSoundAlert(false);
    await vi.waitFor(() => expect(cached()?.soundAlert).toBe(false));
    resolve({ error: false });
    await pending;

    expect(api.saveSettings).toHaveBeenCalledWith({ ...DEFAULT_APP_SETTINGS, soundAlert: false });
  });

  it('저장 실패면 바꾼 항목만 이전 값으로 되돌려 동시에 성공한 변경은 유지하고 알림', async () => {
    const actions = setup({ nickname: '이전' });
    let failNicknameSave = () => {};
    vi.mocked(api.saveSettings)
      .mockImplementationOnce(
        () => new Promise((resolve) => (failNicknameSave = () => resolve({ error: true }))),
      )
      .mockResolvedValueOnce({ error: false });

    const nicknameSave = actions.setNickname('새 이름');
    await actions.setSoundAlert(false);
    failNicknameSave();
    await nicknameSave;

    expect(cached()?.nickname).toBe('이전');
    expect(cached()?.soundAlert).toBe(false);
    expect(api.toast).toHaveBeenCalledWith(TOAST_MESSAGES.settingsSaveFailed);
  });

  it('음량과 반복 횟수는 허용 범위로 맞춤', async () => {
    const actions = setup();

    await actions.setSoundVolume(150.4);
    await actions.setSoundRepeatCount(0);

    expect(cached()?.soundVolume).toBe(100);
    expect(cached()?.soundRepeatCount).toBe(1);
  });

  it('메시지 추가는 상한 개수에서 멈춤', async () => {
    const actions = setup({ motivationalMessages: Array.from({ length: 20 }, (_, i) => `${i}`) });

    await actions.addMessage('초과');

    expect(api.saveSettings).not.toHaveBeenCalled();
  });

  it('메시지 수정은 trim하고 빈 문자열이면 무시', async () => {
    const actions = setup({ motivationalMessages: ['a', 'b'] });

    await actions.updateMessage(1, '  c  ');
    await actions.updateMessage(0, '   ');

    expect(cached()?.motivationalMessages).toEqual(['a', 'c']);
  });

  it('메시지는 최소 개수 아래로 지울 수 없음', async () => {
    const actions = setup({ motivationalMessages: ['a'] });

    await actions.deleteMessage(0);

    expect(cached()?.motivationalMessages).toEqual(['a']);
  });
});

describe('toMessageKeys', () => {
  it('같은 문구가 있어도 키가 겹치지 않고 순서를 바꾸면 키도 따라감', () => {
    expect(new Set(toMessageKeys(['a', 'b', 'a'])).size).toBe(3);
    const [a, b] = toMessageKeys(['a', 'b']);
    expect(toMessageKeys(['b', 'a'])).toEqual([b, a]);
  });
});
