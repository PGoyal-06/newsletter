// Runs once when the server starts: importing env validates it, so a bad value fails
// the boot instead of the first request.
export async function register() {
  await import("./env");
}
