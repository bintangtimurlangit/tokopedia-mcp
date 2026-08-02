/**
 * Shared HTTP plumbing: the error type, retry/backoff, HTML page fetching, and
 * the cache + in-flight coalescing wrapper that every page-scraping loader uses.
 *
 * Lives below `client.ts` in the import graph (client re-exports the error type)
 * so both the GraphQL path and the page-scraping path share one retry policy
 * without a circular import.
 */
import { cache } from '../utils/cache.js';

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const PAGE_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 300;

export class TokopediaAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string,
  ) {
    super(message);
    this.name = 'TokopediaAPIError';
  }
}

/** 429 and 5xx are transient; every other 4xx is our fault and won't improve. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function backoffMs(attempt: number, retryAfter?: string | null): number {
  // Honour Retry-After when it's a sane number of seconds, else exponential.
  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0 && seconds <= 10) return seconds * 1000;
  const exponential = BASE_BACKOFF_MS * 2 ** attempt;
  return exponential + Math.floor(Math.random() * 100); // jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a fetch with retry on transient failures (network errors, 429, 5xx).
 * `label` is used for the endpoint field on thrown errors.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  timeoutMs = PAGE_TIMEOUT_MS,
): Promise<Response> {
  let lastError: Error | undefined;
  // Local, not module-level: concurrent callers must not share backoff state.
  let retryAfter: string | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt - 1, retryAfter));

    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        lastError = new TokopediaAPIError(
          `Timed out after ${Math.round(timeoutMs / 1000)}s calling ${label}. Tokopedia may be slow or unreachable.`,
          undefined,
          label,
        );
      } else {
        lastError = new TokopediaAPIError(
          `Network error calling ${label}: ${err instanceof Error ? err.message : String(err)}`,
          undefined,
          label,
        );
      }
      retryAfter = null;
      continue; // network-level failures are always worth one more try
    }

    if (res.ok) return res;

    if (isRetryableStatus(res.status) && attempt < MAX_ATTEMPTS - 1) {
      retryAfter = res.headers.get('retry-after');
      lastError = new TokopediaAPIError(
        `Tokopedia returned HTTP ${res.status} for ${label}`,
        res.status,
        label,
      );
      continue;
    }

    throw new TokopediaAPIError(
      `Tokopedia returned HTTP ${res.status} for ${label}`,
      res.status,
      label,
    );
  }

  throw lastError ?? new TokopediaAPIError(`Failed calling ${label}`, undefined, label);
}

/** Fetch a server-rendered Tokopedia HTML page. */
export async function fetchHtml(url: string, label: string): Promise<string> {
  const res = await fetchWithRetry(
    url,
    {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    },
    label,
  );
  return res.text();
}

/**
 * Per-namespace in-flight loads. The TTL cache only dedupes *sequential* calls;
 * without this, two tools hitting the same URL in parallel each fetch it,
 * because neither has populated the cache when the other starts.
 */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Fetch-and-parse a page through the TTL cache, coalescing concurrent loads of
 * the same URL. The parsed object is cached, not the rendered text, so several
 * tools can read different parts of one response.
 */
export async function loadCachedPage<T>(
  namespace: string,
  url: string,
  parse: (html: string) => T,
): Promise<T> {
  const cacheKey = cache.key(namespace, url);
  const cached = cache.get<T>(cacheKey);
  if (cached) return cached;

  const pending = inFlight.get(cacheKey) as Promise<T> | undefined;
  if (pending) return pending;

  const load = (async (): Promise<T> => {
    const html = await fetchHtml(url, namespace);
    const result = parse(html);
    cache.set(cacheKey, result);
    return result;
  })();

  // Cleared on failure too, so a transient error doesn't pin a rejected promise
  // and poison every later call for this URL.
  inFlight.set(cacheKey, load);
  try {
    return await load;
  } finally {
    inFlight.delete(cacheKey);
  }
}
