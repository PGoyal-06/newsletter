import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

export interface BannerAction {
  label: string;
  onClick(): void;
}

/**
 * `stale` asks you to do something, so it may carry an action. `offline` is information
 * only; the type forbids an action on it.
 */
export type BannerProps =
  | { variant: "stale"; action?: BannerAction; children: ReactNode }
  | { variant: "offline"; action?: never; children: ReactNode };

const banner = cva(
  "flex flex-wrap items-center justify-between gap-x-md gap-y-xs rounded-sm px-md py-xs text-body",
  {
    variants: {
      variant: {
        stale: "bg-warning-bg text-warning",
        offline: "border border-rule text-text-muted",
      },
    },
  },
);

/**
 * A status message about the feed. Render it inside a `StatusRegion` so VoiceOver
 * announces it when it appears. The words carry the meaning; color only supports them.
 */
export function Banner({ variant, action, children }: BannerProps) {
  return (
    <div className={banner({ variant })}>
      <p className="py-sm">{children}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="min-h-[44px] min-w-[44px] px-xs text-label text-primary underline underline-offset-2 active:opacity-70"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
