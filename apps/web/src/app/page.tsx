// The app shell. Keep this page statically rendered (no cookies() or headers() reads):
// the service worker precaches "/" so the app opens offline.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Morning Feed</h1>
      <p className="text-base text-muted">Today&apos;s newsletters will show up here.</p>
    </main>
  );
}
