import type { MailMessage } from "../mail/domain/message";
import {
  allUnsorted,
  assembleSnapshot,
  serializeSnapshot,
  SnapshotError,
} from "../snapshot/domain/assemble";
import { publishSnapshot, PublishError } from "../snapshot/domain/publish";
import type { PropertyStore, SnapshotStore } from "../snapshot/domain/store";

export interface RunDeps {
  now(): number;
  /** One page of a Gmail search. */
  search(query: string, start: number, max: number): MailMessage[];
  store: SnapshotStore;
  props: PropertyStore;
  log(line: string): void;
}

export interface RunResult {
  outcome: "success" | string;
  items: number;
  bytes: number;
}

/** The thin thread's search (spec 0004 task 1). Task 2 replaces it with the processing plan. */
export const THIN_QUERY = "newer_than:1d";
const PAGE = 100;

function stageOf(error: unknown): string {
  if (error instanceof SnapshotError || error instanceof PublishError) return error.stage;
  return "run_failed";
}

/**
 * One thin run: search the last day, build an all Unsorted snapshot, publish it, and
 * log one line with counts, size, and duration. Logs never carry addresses, subjects,
 * IDs, or URLs. Returns the outcome; the trigger entry throws on anything but success.
 */
export function runThin(deps: RunDeps): RunResult {
  const t0 = deps.now();
  let outcome = "success";
  let items = 0;
  let bytes = 0;
  let candidates = 0;
  let unparseable = 0;

  try {
    const messages = deps.search(THIN_QUERY, 0, PAGE);
    candidates = messages.length;
    const generatedAt = deps.now();
    const assembled = assembleSnapshot(messages, generatedAt, allUnsorted);
    unparseable = assembled.unparseableSenders;
    items = assembled.snapshot.items.length;
    const serialized = serializeSnapshot(assembled.snapshot);
    bytes = serialized.bytes;
    publishSnapshot(deps.store, deps.props, serialized.json, generatedAt);
  } catch (error) {
    outcome = stageOf(error);
  }

  deps.log(
    `run mode=timer outcome=${outcome} candidates=${candidates} items=${items} ` +
      `sender_unparseable=${unparseable} bytes=${bytes} ms=${deps.now() - t0}`,
  );
  return { outcome, items, bytes };
}
