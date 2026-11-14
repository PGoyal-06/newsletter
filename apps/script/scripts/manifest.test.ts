// The Apps Script manifest is pinned by spec 0001. These lock the security relevant fields.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../appsscript.json"), "utf8"),
);

describe("appsscript.json", () => {
  it("pins exactly the three minimum scopes, with no full Gmail or full Drive access", () => {
    expect([...manifest.oauthScopes].sort()).toEqual(
      [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/script.scriptapp",
      ].sort(),
    );
  });

  it("runs the web app as the deploying user, reachable without a Google login", () => {
    expect(manifest.webapp).toEqual({ access: "ANYONE_ANONYMOUS", executeAs: "USER_DEPLOYING" });
  });

  it("uses the V8 runtime and the America/New_York timezone", () => {
    expect(manifest.runtimeVersion).toBe("V8");
    expect(manifest.timeZone).toBe("America/New_York");
  });
});

describe("appsscript.json advanced services", () => {
  // Spec 0004: Drive goes through the advanced service (v3), with no new scope.
  it("enables only the Drive advanced service, version v3", () => {
    expect(manifest.dependencies).toEqual({
      enabledAdvancedServices: [{ userSymbol: "Drive", serviceId: "drive", version: "v3" }],
    });
  });
});
