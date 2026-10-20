import { describe, expect, it, beforeEach } from 'vitest';

import { z } from 'zod';
import { loadFromStorage, saveToStorage } from './storage';

// vitest.config.ts가 environment: 'jsdom' 고정이라 SSR guard는 이 파일에서 검증하지 않는다

beforeEach(() => {
  localStorage.clear();
});

describe('loadFromStorage', () => {
  const schema = z.object({ id: z.string() });
  const fallback = { id: 'fallback' };

  it('저장된 값이 없으면 fallback 반환', () => {
    expect(loadFromStorage('missing', schema, fallback)).toBe(fallback);
  });

  it('saveToStorage로 저장한 값을 스키마로 검증해 그대로 읽음', () => {
    saveToStorage('k', { id: '1' });
    expect(loadFromStorage('k', schema, fallback)).toEqual({ id: '1' });
  });

  it('JSON이 깨졌거나 스키마와 맞지 않으면 fallback 반환', () => {
    localStorage.setItem('k', 'not json{');
    expect(loadFromStorage('k', schema, fallback)).toBe(fallback);
    localStorage.setItem('k', JSON.stringify({ wrong: 'shape' }));
    expect(loadFromStorage('k', schema, fallback)).toBe(fallback);
  });
});
