// The app shell. Keep this page statically rendered (no cookies() or headers() reads):
// the service worker precaches "/" so the app opens offline.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-md px-gutter py-2xl">
      <h1 className="font-display text-display">Morning Feed</h1>
      <p className="text-body text-text-muted">Today&apos;s newsletters will show up here.</p>
    </main>
  );
}
