"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/features/design-system/ui";
import type { TodayOutcome } from "../domain/feed";
import { requestPersistentStorage, saveToken } from "../adapters/tokenStore";
import { requestToday } from "../adapters/todayClient";

export const WRONG_KEY = "That key doesn't open the feed. Check it and paste it again.";
export const KEY_STOPPED_WORKING = "That key stopped working. Paste the current one.";
export const SAVE_FAILED = "Couldn't save the key on this phone. Try again.";

export interface SetupFormProps {
  /** Shown under the field on open, e.g. after a 401 from the feed. */
  initialError?: string;
  /** Present only when a working key is already stored ("Change secret key"). */
  onCancel?: () => void;
  /** Called after the key is stored, with the outcome of its test call. */
  onSaved(token: string, outcome: TodayOutcome): void;
}

/**
 * Setup (spec 0004 AC-9): test the pasted key against /api/today. A 401 saves nothing;
 * any other outcome stores the key, asks for persistent storage, and opens the feed.
 */
export function SetupForm({ initialError, onCancel, onSaved }: SetupFormProps) {
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = value.trim();
    if (token.length === 0 || checking) return;

    setChecking(true);
    const outcome = await requestToday(token);
    if (outcome.kind === "unauthorized") {
      setError(WRONG_KEY);
      setChecking(false);
      return;
    }
    try {
      await saveToken(token);
    } catch {
      setError(SAVE_FAILED);
      setChecking(false);
      return;
    }
    void requestPersistentStorage();
    onSaved(token, outcome);
  }

  return (
    <main className="flex flex-1 flex-col gap-lg px-gutter py-2xl">
      <header className="flex flex-col gap-sm">
        <h1 className="font-display text-display">Morning Feed</h1>
        <p className="text-body text-text-muted">
          Paste your secret key once. It stays on this phone.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-md" noValidate>
        <div className="flex flex-col gap-xs">
          <label htmlFor={inputId} className="text-label">
            Secret key
          </label>
          <input
            id={inputId}
            name="secret-key"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`min-h-[48px] w-full rounded-sm bg-surface px-md font-mono text-body ${
              error ? "border-2 border-error" : "border border-control"
            }`}
          />
          {error && (
            <p id={errorId} className="text-body text-error">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-sm">
          <Button type="submit" variant="primary" disabled={checking}>
            {checking ? "Checking…" : "Open today's feed"}
          </Button>
          {onCancel && (
            <Button variant="secondary" onClick={onCancel} disabled={checking}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
