import { FeedApp } from "@/features/feed/ui/FeedApp";

// The app shell. Keep this page statically rendered (no cookies() or headers() reads):
// the service worker precaches "/" so the app opens offline. Setup and the feed are
// client states inside it.
export default function Home() {
  return <FeedApp />;
}
