// Runs when the server starts: importing env validates it. A bad value is logged and every
// request then fails closed with a 500. The build already refuses a bad env (next.config.ts),
// so this is the second line of defence, for a value changed after the build.
export async function register() {
  await import("./env");
}
