"use client";

import { useState, type ReactNode } from "react";
import {
  Banner,
  Button,
  CategoryChips,
  EmptyState,
  IssueRow,
  StatusRegion,
} from "@/features/design-system/ui";

// Fixed sample times in America/New_York (EST in November). The e2e test pins the clock
// to 2026-11-12 7:15 AM in that zone, so these read "6:02 AM" and "Wed 9:40 PM".
export const SAMPLE_TODAY_6_02 = Date.UTC(2026, 10, 12, 11, 2);
export const SAMPLE_YESTERDAY_21_40 = Date.UTC(2026, 10, 12, 2, 40);

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI" },
  { value: "tech", label: "Tech" },
  { value: "business", label: "Business" },
  { value: "design", label: "Design" },
  { value: "culture", label: "Culture" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/\s+/g, "-");
  return (
    <section aria-labelledby={id} className="flex flex-col gap-md border-t border-text pt-md">
      <h2 id={id} className="text-label text-text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Every design-system component in every variant and state, for review and e2e tests. */
export function UiGallery() {
  const [category, setCategory] = useState("all");
  const [showLiveBanner, setShowLiveBanner] = useState(false);
  const [lastAction, setLastAction] = useState("none yet");

  return (
    <main className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col gap-xl px-[max(var(--spacing-gutter),env(safe-area-inset-left))] py-xl">
      <header className="flex flex-col gap-sm">
        <h1 className="font-display text-display">UI gallery</h1>
        <p className="text-meta text-text-muted">
          Development only. Every component in every state, from DESIGN.md tokens.
        </p>
      </header>

      <Section title="Issue rows">
        <div>
          <IssueRow
            sender="Morning Brew"
            subject="The market shrugged off rate fears, plus three charts worth your coffee"
            receivedAt={SAMPLE_TODAY_6_02}
            href="#issue-today"
            destination="reader"
          />
          <IssueRow
            sender="Stratechery"
            subject="An interview about the economics of on device models"
            receivedAt={SAMPLE_YESTERDAY_21_40}
            href="#issue-yesterday"
            destination="reader"
          />
          <IssueRow
            sender="The Weekly Digest of Small Independent Bookshops and Their Readers"
            subject="Autumn picks"
            receivedAt={SAMPLE_TODAY_6_02}
            href="#issue-long-sender"
            destination="reader"
          />
          <IssueRow
            sender="newsletters@averyveryverylongunbrokendomainnameforsendersdigest.example.com"
            subject="An unbroken sender wraps instead of overflowing"
            receivedAt={SAMPLE_TODAY_6_02}
            href="#issue-unbroken-sender"
            destination="reader"
          />
          <IssueRow
            sender="Platformer"
            subject="A very long subject line that keeps going well past the point where any reader would still be paying attention, so that it has to be clamped to three lines with an ellipsis at the end while the full text stays in the accessible name for VoiceOver"
            receivedAt={SAMPLE_TODAY_6_02}
            href="#issue-long-subject"
            destination="reader"
          />
          <IssueRow
            sender="Unknown Sender Weekly"
            subject="Sorted by no category yet"
            receivedAt={SAMPLE_TODAY_6_02}
            href="https://mail.google.com/mail/u/0/#inbox/sample"
            destination="gmail"
          />
        </div>
      </Section>

      <Section title="Category chips">
        <CategoryChips
          label="Category"
          options={CATEGORIES}
          value={category}
          onChange={setCategory}
        />
        <p className="text-meta text-text-muted">Selected: {category}</p>
      </Section>

      <Section title="Banners">
        <StatusRegion>
          <Banner
            variant="stale"
            action={{ label: "Retry", onClick: () => setLastAction("Retry") }}
          >
            Couldn&apos;t refresh since 6:00am
          </Banner>
        </StatusRegion>
        <StatusRegion>
          <Banner variant="stale">Couldn&apos;t refresh since 6:00am</Banner>
        </StatusRegion>
        <StatusRegion>
          <Banner variant="offline">You&apos;re offline. Showing the saved copy.</Banner>
        </StatusRegion>
        <div className="flex flex-col items-start gap-sm" data-testid="live-banner-demo">
          <Button variant="secondary" onClick={() => setShowLiveBanner((shown) => !shown)}>
            {showLiveBanner ? "Hide banner" : "Show banner"}
          </Button>
          <StatusRegion>
            {showLiveBanner && (
              <Banner variant="offline">You&apos;re offline. Showing the saved copy.</Banner>
            )}
          </StatusRegion>
        </div>
      </Section>

      <Section title="Empty states">
        <EmptyState
          message="Nothing new today."
          detail="Everything older is in Gmail under Newsletters."
        />
        <EmptyState
          message="Nothing in AI today."
          action={{ label: "Show all", onClick: () => setLastAction("Show all") }}
        />
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-sm">
          <Button variant="primary" onClick={() => setLastAction("Primary")}>
            Open today&apos;s feed
          </Button>
          <Button variant="secondary" onClick={() => setLastAction("Secondary")}>
            Show all
          </Button>
          <Button variant="primary" disabled onClick={() => setLastAction("Disabled primary")}>
            Disabled primary
          </Button>
          <Button variant="secondary" disabled onClick={() => setLastAction("Disabled secondary")}>
            Disabled secondary
          </Button>
        </div>
        <p className="text-meta text-text-muted" data-testid="last-action">
          Last action: {lastAction}
        </p>
      </Section>
    </main>
  );
}
