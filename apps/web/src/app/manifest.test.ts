// covers: D-4 (the app installs to the iPhone home screen as a standalone app)
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  const m = manifest();

  it("opens standalone, so the home screen app has no Safari toolbar", () => {
    expect(m.display).toBe("standalone");
  });

  it("starts at the precached shell and scopes the whole origin", () => {
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
  });

  it("lists 192 and 512 pixel PNG icons served by the icon route", () => {
    expect(m.icons).toEqual([
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ]);
  });

  // covers: spec 0003 AC-1 (splash and status bar match the DESIGN.md ground color)
  it("uses the DESIGN.md ground color for the theme and the splash background", () => {
    expect(m.theme_color).toBe("#F5F7F8");
    expect(m.background_color).toBe("#F5F7F8");
  });

  it("has a short name that fits under a home screen icon", () => {
    expect(m.short_name?.length ?? 0).toBeGreaterThan(0);
    expect(m.short_name!.length).toBeLessThanOrEqual(12);
  });
});
