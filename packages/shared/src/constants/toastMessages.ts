import { FEEDBACK_LIMITS } from './limits';

export type ToastType = 'success' | 'info' | 'error';

export interface ToastMessage {
  type: ToastType;
  message: string;
}

const success = (message: string): ToastMessage => ({ type: 'success', message });
const info = (message: string): ToastMessage => ({ type: 'info', message });
const error = (message: string): ToastMessage => ({ type: 'error', message });

export const TOAST_MESSAGES = {
  sessionSaved: success('기록을 저장했어요'),
  sessionUpdated: success('기록을 수정했어요'),
  sessionDeleted: success('기록을 삭제했어요'),
  sessionTooShort: info('30초 미만은 기록되지 않아요'),
  phaseEnded: ({ title, body }: { title: string; body: string }) => info(`${title} ${body}`),
  sessionSaveFailed: error('기록 저장에 실패했어요'),
  sessionDeleteFailed: error('기록 삭제에 실패했어요'),
  dataRefreshFailed: error('최신 데이터를 불러오지 못했어요'),
  itemsInvalid: (count: number) => info(`형식이 맞지 않아 불러오지 못한 항목이 ${count}개 있어요`),
  passwordUpdated: (title: string) => success(`${title}이 완료됐어요`),
  taskAddFailed: error('작업 추가에 실패했어요. 다시 시도해주세요'),
  taskSaveFailed: error('작업 저장에 실패했어요. 다시 시도해주세요'),
  taskDeleteFailed: error('작업 삭제에 실패했어요. 다시 시도해주세요'),
  categoryAddFailed: error('카테고리 추가에 실패했어요. 다시 시도해주세요'),
  categorySaveFailed: error('카테고리 저장에 실패했어요. 다시 시도해주세요'),
  categoryDeleteFailed: error('카테고리 삭제에 실패했어요. 다시 시도해주세요'),
  categoryInUse: info('이 카테고리를 쓰는 작업이 있어요. 작업을 먼저 옮기거나 삭제해주세요'),
  reorderFailed: error('순서 저장에 실패했어요'),
  settingsSaveFailed: error('설정 저장에 실패했어요. 다시 시도해주세요'),
  soundPlayFailed: error('소리를 재생하지 못했어요'),
  shareCardSaved: success('사진 앱에 공유 카드를 저장했어요'),
  feedbackSent: success('의견을 보냈어요'),
  feedbackSendFailed: error('의견 전송에 실패했어요. 다시 시도해주세요'),
  feedbackLimitExceeded: info(`의견은 하루에 ${FEEDBACK_LIMITS.DAILY_MAX}번까지 보낼 수 있어요`),
  errorMessage: error,
} as const;
