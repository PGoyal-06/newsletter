// covers: AC-6 (the offline banner can never take an action, by type) and the component
// props contracts from spec 0003's API surface. The @ts-expect-error lines are checked by
// `pnpm typecheck`: if a forbidden shape ever starts compiling, the typecheck fails.
import { describe, expectTypeOf, it } from "vitest";
import type { BannerProps, ButtonProps, CategoryChipsProps, IssueRowProps } from "./index";

const noop = () => {};

describe("Banner props", () => {
  it("lets a stale banner carry an optional action", () => {
    const withAction: BannerProps = {
      variant: "stale",
      action: { label: "Retry", onClick: noop },
      children: "Couldn't refresh since 6:00am",
    };
    const withoutAction: BannerProps = { variant: "stale", children: "Couldn't refresh" };

    expectTypeOf(withAction).toMatchTypeOf<BannerProps>();
    expectTypeOf(withoutAction).toMatchTypeOf<BannerProps>();
  });

  it("refuses an action on an offline banner", () => {
    // @ts-expect-error offline banners are information only (AC-6)
    const offline: BannerProps = {
      variant: "offline",
      action: { label: "Retry", onClick: noop },
      children: "You're offline",
    };

    expectTypeOf<
      Extract<BannerProps, { variant: "offline" }>["action"]
    >().toEqualTypeOf<undefined>();
    void offline;
  });
});

describe("Button props", () => {
  it("requires a variant", () => {
    // @ts-expect-error every Button names primary or secondary (AC-8)
    const missing: ButtonProps = { children: "Save" };

    expectTypeOf<ButtonProps["variant"]>().toEqualTypeOf<"primary" | "secondary">();
    void missing;
  });

  // Regression: cva types variants as `value | null`, so `variant={null}` used to compile
  // and render an unstyled button (found by /test, fixed by /debug).
  it("rejects a null variant", () => {
    // @ts-expect-error null is not a Button variant
    const unstyled: ButtonProps = { variant: null, children: "Save" };

    void unstyled;
  });

  it("accepts native button props such as disabled and type", () => {
    const native: ButtonProps = { variant: "secondary", disabled: true, type: "submit" };

    expectTypeOf(native).toMatchTypeOf<ButtonProps>();
  });
});

describe("IssueRow and CategoryChips props", () => {
  it("only knows the reader and gmail destinations, with receivedAt in epoch ms", () => {
    expectTypeOf<IssueRowProps["destination"]>().toEqualTypeOf<"reader" | "gmail">();
    expectTypeOf<IssueRowProps["receivedAt"]>().toEqualTypeOf<number>();
  });

  it("is a controlled group: the caller passes value and onChange", () => {
    expectTypeOf<CategoryChipsProps["value"]>().toEqualTypeOf<string>();
    expectTypeOf<CategoryChipsProps["onChange"]>().parameters.toEqualTypeOf<[string]>();
  });
});
