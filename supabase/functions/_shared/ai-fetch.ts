// Shared OpenAI-compatible fetch with bounded retry on 429 / 5xx.
// Honors Retry-After when present, otherwise exponential backoff with jitter.
export async function fetchAIWithRetry(
  url: string,
  init: RequestInit,
  opts: { maxRetries?: number; baseDelayMs?: number } = {},
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 800;

  let resp = await fetch(url, init);
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (resp.status !== 429 && resp.status < 500) return resp;

    const retryAfter = Number(resp.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 6000)
      : baseDelayMs * Math.pow(2, attempt) + Math.random() * 250;

    await new Promise((r) => setTimeout(r, wait));
    resp = await fetch(url, init);
  }
  return resp;
}
