import type { ReactNode } from "react";

export interface StatusRegionProps {
  /** Zero or one `Banner`. */
  children?: ReactNode;
}

/**
 * An always mounted live region. Keep it on screen while the feed is shown and put
 * banners inside it: a region that already exists announces what appears in it, while
 * a region mounted together with its message is often missed by VoiceOver.
 */
export function StatusRegion({ children }: StatusRegionProps) {
  return <div role="status">{children}</div>;
}
