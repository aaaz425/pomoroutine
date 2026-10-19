import { z } from 'zod';
import { INPUT_LIMITS } from '@pomoroutine/shared';

export type { Task, Category } from '@pomoroutine/shared';

// Supabase 응답도 외부 입력이므로 반드시 검증 후 사용 — lib/supabase/{tasks,categories}.ts에서만 사용
export const CategorySchema = z.object({
  id: z.string(),
  // 카테고리 이름도 짧은 라벨이라 닉네임과 동일 기준(NICKNAME_MAX_LENGTH) 재사용
  name: z.string().max(INPUT_LIMITS.NICKNAME_MAX_LENGTH),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().max(INPUT_LIMITS.TITLE_MAX_LENGTH),
  categoryId: z.string(),
  createdAt: z.string(),
});
