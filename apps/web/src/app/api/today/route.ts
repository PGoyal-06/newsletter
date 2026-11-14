import { env } from "@/env";
import { handleToday } from "@/features/feed/adapters/todayRoute";

// Wiring only: the proxy logic lives in the feed feature.
export async function GET(request: Request): Promise<Response> {
  return handleToday(request, {
    appToken: env.appToken,
    scriptUrl: env.scriptUrl,
    scriptKey: env.scriptKey,
    fetch,
    log: (line) => console.error(line),
  });
}
