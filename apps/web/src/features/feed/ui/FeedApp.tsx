"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { TodayOutcome } from "../domain/feed";
import { fetchToday, UnauthorizedError } from "../adapters/todayClient";
import { readToken } from "../adapters/tokenStore";
import { Feed } from "./Feed";
import { KEY_STOPPED_WORKING, SetupForm } from "./SetupForm";

const TODAY_KEY = ["today"] as const;
const RETRY_DELAY_MS = 2000;

interface FeedScreenProps {
  token: string;
  onChangeKey(): void;
  onSaved(token: string, outcome: TodayOutcome): void;
}

/**
 * Owns the today query. It mounts only once a token exists, so a snapshot the setup test
 * already put in the cache is shown with no second fetch (AC-9).
 */
function FeedScreen({ token, onChangeKey, onSaved }: FeedScreenProps) {
  const [mountedAt] = useState(() => Date.now());
  const query = useQuery({
    queryKey: TODAY_KEY,
    queryFn: () => fetchToday(token),
    staleTime: 0,
    // An open with an empty cache fetches (no persister yet); a mount onto data the setup
    // test just stored does not. Every return to the foreground refetches.
    refetchOnMount: false,
    refetchOnWindowFocus: true,
    retry: (failures, error) => !(error instanceof UnauthorizedError) && failures < 1,
    retryDelay: RETRY_DELAY_MS,
  });

  if (query.error instanceof UnauthorizedError) {
    return <SetupForm initialError={KEY_STOPPED_WORKING} onSaved={onSaved} />;
  }

  return (
    <Feed
      snapshot={query.data}
      // Each fetch, including the one on every return to the foreground, moves the clock.
      now={Math.max(mountedAt, query.dataUpdatedAt, query.errorUpdatedAt)}
      loading={query.isPending}
      failed={query.isError}
      onRetry={() => void query.refetch()}
      onChangeKey={onChangeKey}
    />
  );
}

/** `undefined` while IndexedDB is being read (the `checking` state), `null` for no token. */
type StoredToken = string | null | undefined;

function Shell() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<StoredToken>(undefined);
  const [changing, setChanging] = useState(false);
  // Bumped on every save so the feed remounts with a fresh query observer.
  const [session, setSession] = useState(0);

  useEffect(() => {
    let active = true;
    readToken()
      .catch(() => null)
      .then((stored) => {
        if (active) setToken(stored);
      });
    return () => {
      active = false;
    };
  }, []);

  function saved(next: string, outcome: TodayOutcome) {
    if (outcome.kind === "success") {
      queryClient.setQueryData(TODAY_KEY, outcome.snapshot);
    } else {
      // Drop the old result so the feed fetches again with the new key.
      queryClient.removeQueries({ queryKey: TODAY_KEY });
    }
    setToken(next);
    setChanging(false);
    setSession((n) => n + 1);
  }

  // checking: render nothing, no spinner (spec 0004 AC-10).
  if (token === undefined) return null;
  if (token === null) return <SetupForm onSaved={saved} />;
  if (changing) return <SetupForm onCancel={() => setChanging(false)} onSaved={saved} />;
  return (
    <FeedScreen key={session} token={token} onChangeKey={() => setChanging(true)} onSaved={saved} />
  );
}

/** The client root of the static `/` shell: setup or today's feed. */
export function FeedApp() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <Shell />
    </QueryClientProvider>
  );
}
