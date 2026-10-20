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
import { insertSession } from '@pomoroutine/shared';
import { createClient } from '@/lib/supabase/client';
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

  const add = useMutation({
    mutationFn: (input: Omit<Session, 'id'>) => insertSession(createClient(), input),
    onError: () => toast(TOAST_MESSAGES.sessionSaveFailed),
    onSuccess: () => {
      toast(TOAST_MESSAGES.sessionSaved);
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SessionEditableFields> }) =>
      updateSession(id, patch),
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
    mutationFn: deleteSession,
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

  return {
    addSession: add.mutate,
    isAdding: add.isPending,
    updateSession: update.mutate,
    deleteSession: remove.mutate,
  };
}
