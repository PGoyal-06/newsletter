// Test fakes for the worker's facades. Not imported by production code.
import type { MailMessage } from "../mail/domain/message";
import type { PropertyStore, SnapshotStore } from "../snapshot/domain/store";

export interface FakeMessageInput {
  id: string;
  threadId?: string;
  receivedAt: number;
  subject?: string;
  headers?: Record<string, string>;
  inTrash?: boolean;
  html?: string;
  plain?: string;
}

export function fakeMessage(input: FakeMessageInput): MailMessage & { bodyReads: number } {
  const headers = {
    "List-Unsubscribe": "<mailto:unsubscribe@example.com>",
    From: "Morning Notes <notes@example.com>",
    ...input.headers,
  };
  const message = {
    id: input.id,
    threadId: input.threadId ?? `${input.id}0`,
    receivedAt: input.receivedAt,
    subject: input.subject ?? "A quieter morning",
    bodyReads: 0,
    header: (name: string) => headers[name as keyof typeof headers] ?? "",
    isInTrash: () => input.inTrash ?? false,
    htmlBody: () => {
      message.bodyReads += 1;
      return input.html ?? "";
    },
    plainBody: () => {
      message.bodyReads += 1;
      return input.plain ?? "";
    },
  };
  return message;
}

export function fakeProps(initial: Record<string, string> = {}): PropertyStore & {
  values: Record<string, string>;
} {
  const values = { ...initial };
  return {
    values,
    get: (name) => values[name] ?? null,
    set: (name, value) => {
      values[name] = value;
    },
  };
}

export function fakeStore(): SnapshotStore & {
  files: Map<string, { parent: string; name: string; content: string }>;
  folders: Set<string>;
  corruptReads: boolean;
} {
  let next = 1;
  const files = new Map<string, { parent: string; name: string; content: string }>();
  const folders = new Set<string>();
  const store = {
    files,
    folders,
    corruptReads: false,
    folderUsable: (id: string) => folders.has(id),
    createFolder: () => {
      const id = `folder${next++}`;
      folders.add(id);
      return id;
    },
    createFile: (parent: string, name: string, content: string) => {
      const id = `file${next++}`;
      files.set(id, { parent, name, content });
      return id;
    },
    readFile: (id: string) => {
      const file = files.get(id);
      if (!file) throw new Error("not found");
      return store.corruptReads ? "{not json" : file.content;
    },
  };
  return store;
}
