'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { TOAST_MESSAGES } from '@/lib/constants/messages';
import { sessionKeys } from '@/lib/query/keys';
import {
  patchSessionInList,
  patchSessionInPages,
  removeSessionFromList,
  removeSessionFromPages,
  type SessionPages,
} from '@/lib/query/sessionCache';
import { deleteSession, updateSession } from '@/lib/supabase/sessions';
import type { Session, SessionEditableFields } from '@/types';

type Snapshot = [QueryKey, unknown][];

const LIST_KEY = sessionKeys.lists;
const MONTH_KEY = sessionKeys.months;
const LOCALLY_PATCHED = [LIST_KEY[1], MONTH_KEY[1]] as string[];

export function useSessionMutations() {
  const queryClient = useQueryClient();

  async function prepare(): Promise<Snapshot> {
    await queryClient.cancelQueries({ queryKey: sessionKeys.all });
    return [
      ...queryClient.getQueriesData({ queryKey: LIST_KEY }),
      ...queryClient.getQueriesData({ queryKey: MONTH_KEY }),
    ];
  }

  function restore(snapshot: Snapshot | undefined) {
    snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
  }

  function invalidateAggregates() {
    void queryClient.invalidateQueries({
      queryKey: sessionKeys.all,
      predicate: (query) => !LOCALLY_PATCHED.includes(String(query.queryKey[1])),
    });
  }

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SessionEditableFields> }) => {
      const { error } = await updateSession(id, patch);
      if (error) throw new Error('session update failed');
    },
    onMutate: async ({ id, patch }) => {
      const snapshot = await prepare();
      queryClient.setQueriesData<SessionPages>({ queryKey: LIST_KEY }, (data) =>
        patchSessionInPages(data, id, patch),
      );
      queryClient.setQueriesData<Session[]>({ queryKey: MONTH_KEY }, (data) =>
        patchSessionInList(data, id, patch),
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restore(context?.snapshot);
      toast(TOAST_MESSAGES.sessionSaveFailed);
    },
    onSuccess: () => toast(TOAST_MESSAGES.sessionUpdated),
    onSettled: invalidateAggregates,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteSession(id);
      if (error) throw new Error('session delete failed');
    },
    onMutate: async (id) => {
      const snapshot = await prepare();
      queryClient.setQueriesData<SessionPages>({ queryKey: LIST_KEY }, (data) =>
        removeSessionFromPages(data, id),
      );
      queryClient.setQueriesData<Session[]>({ queryKey: MONTH_KEY }, (data) =>
        removeSessionFromList(data, id),
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) => {
      restore(context?.snapshot);
      toast(TOAST_MESSAGES.sessionDeleteFailed);
    },
    onSuccess: () => toast(TOAST_MESSAGES.sessionDeleted),
    onSettled: invalidateAggregates,
  });

  return { updateSession: update.mutate, deleteSession: remove.mutate };
}
