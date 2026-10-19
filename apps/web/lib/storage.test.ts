import { describe, expect, it, beforeEach } from 'vitest';

import { TaskSchema } from '@/types';
import { loadFromStorage, saveToStorage } from './storage';

// vitest.config.ts가 environment: 'jsdom' 고정이라 SSR guard는 이 파일에서 검증하지 않는다

beforeEach(() => {
  localStorage.clear();
});

describe('loadFromStorage', () => {
  const schema = TaskSchema;
  const fallback = {
    id: 'fallback',
    title: 'fallback',
    categoryId: 'c1',
    createdAt: '2024-01-01T00:00:00.000Z',
  };

  it('저장된 값이 없으면 fallback 반환', () => {
    expect(loadFromStorage('missing', schema, fallback)).toBe(fallback);
  });

  it('saveToStorage로 저장한 값을 스키마로 검증해 그대로 읽음', () => {
    const task = {
      id: '1',
      title: 'A',
      categoryId: 'c1',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    saveToStorage('k', task);
    expect(loadFromStorage('k', schema, fallback)).toEqual(task);
  });

  it('JSON 파싱에 실패하면 fallback 반환', () => {
    localStorage.setItem('k', 'not json{');
    expect(loadFromStorage('k', schema, fallback)).toBe(fallback);
  });

  it('JSON은 유효하지만 스키마 검증에 실패하면 fallback 반환', () => {
    localStorage.setItem('k', JSON.stringify({ wrong: 'shape' }));
    expect(loadFromStorage('k', schema, fallback)).toBe(fallback);
  });
});
