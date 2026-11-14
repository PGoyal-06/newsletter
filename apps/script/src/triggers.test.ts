import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installTriggers, onTimer, TIMER_HANDLER } from "./triggers";

type FakeTrigger = { handler: string; everyMinutes: number; getHandlerFunction(): string };

// A fake of the slice of ScriptApp that installTriggers uses. It keeps a real list,
// so tests assert on the triggers that end up installed, not on which calls ran.
function fakeScriptApp(existing: Array<[handler: string, minutes: number]> = []) {
  const make = (handler: string, everyMinutes: number): FakeTrigger => ({
    handler,
    everyMinutes,
    getHandlerFunction: () => handler,
  });
  const installed = existing.map(([h, m]) => make(h, m));
  return {
    installed,
    getProjectTriggers: () => [...installed],
    deleteTrigger: (t: FakeTrigger) => {
      const i = installed.indexOf(t);
      if (i >= 0) installed.splice(i, 1);
    },
    newTrigger: (handler: string) => {
      let minutes = 0;
      const builder = {
        timeBased: () => builder,
        everyMinutes: (m: number) => {
          minutes = m;
          return builder;
        },
        create: () => {
          const t = make(handler, minutes);
          installed.push(t);
          return t;
        },
      };
      return builder;
    },
  };
}

const timerTriggers = (app: ReturnType<typeof fakeScriptApp>) =>
  app.installed.filter((t) => t.handler === TIMER_HANDLER);

describe("installTriggers", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("targets the onTimer handler, which the bundle exposes as a global", () => {
    expect(TIMER_HANDLER).toBe("onTimer");
  });

  it("creates one onTimer trigger every 15 minutes when none exists", () => {
    const app = fakeScriptApp();
    vi.stubGlobal("ScriptApp", app);

    installTriggers();

    expect(timerTriggers(app)).toHaveLength(1);
    expect(timerTriggers(app)[0]?.everyMinutes).toBe(15);
  });

  // covers: D-2 (running installTriggers again still leaves exactly one trigger)
  it("leaves exactly one onTimer trigger when run twice", () => {
    const app = fakeScriptApp();
    vi.stubGlobal("ScriptApp", app);

    installTriggers();
    installTriggers();

    expect(timerTriggers(app)).toHaveLength(1);
  });

  it("collapses duplicate onTimer triggers into a single 15 minute one", () => {
    const app = fakeScriptApp([
      [TIMER_HANDLER, 5],
      [TIMER_HANDLER, 30],
    ]);
    vi.stubGlobal("ScriptApp", app);

    installTriggers();

    expect(timerTriggers(app).map((t) => t.everyMinutes)).toEqual([15]);
  });

  it("keeps triggers that point at other handlers", () => {
    const app = fakeScriptApp([["somethingElse", 60]]);
    vi.stubGlobal("ScriptApp", app);

    installTriggers();

    expect(app.installed.map((t) => t.handler).sort()).toEqual(
      [TIMER_HANDLER, "somethingElse"].sort(),
    );
  });
});

// covers: spec 0004 AC-6 (any outcome but success throws from onTimer, so Google's
// failure email fires). The services are faked at the global level the adapters use.
describe("onTimer", () => {
  function stubWorkerServices(search: () => unknown[]) {
    const props: Record<string, string> = {};
    const files = new Map<string, string>();
    let next = 1;
    vi.stubGlobal("GmailApp", { search });
    vi.stubGlobal("PropertiesService", {
      getScriptProperties: () => ({
        getProperty: (k: string) => props[k] ?? null,
        setProperty: (k: string, v: string) => {
          props[k] = v;
        },
      }),
    });
    vi.stubGlobal("Utilities", {
      newBlob: (data: string) => ({ getDataAsString: () => data, data }),
    });
    vi.stubGlobal("Drive", {
      Files: {
        create: (_meta: unknown, blob?: { data: string }) => {
          const id = `id${next++}`;
          if (blob) files.set(id, blob.data);
          return { id };
        },
        // Like the real service: a JSON file comes back already parsed.
        get: (id: string) => JSON.parse(files.get(id) ?? "null"),
      },
    });
    return props;
  }

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws when the run fails, naming only the stage", () => {
    stubWorkerServices(() => {
      throw new Error("Service invoked too many times for one day: gmail.");
    });

    expect(() => onTimer()).toThrow("onTimer failed: run_failed");
  });

  it("returns normally after a successful run, with the pointer set", () => {
    const props = stubWorkerServices(() => []);

    expect(() => onTimer()).not.toThrow();
    expect(props.snapshotFileId).toBeDefined();
  });
});
