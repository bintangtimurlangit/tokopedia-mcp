import 'dotenv/config';
import { TokopediaAPIError, USER_AGENT, fetchWithRetry } from './http.js';

// Re-exported so existing imports of the error type keep working.
export { TokopediaAPIError };

const TOKOPEDIA_GQL = 'https://gql.tokopedia.com/graphql';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept: '*/*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Content-Type': 'application/json',
  Origin: 'https://www.tokopedia.com',
  Referer: 'https://www.tokopedia.com/',
  'X-Source': 'tokopedia-lite',
  'X-Version': '1.0',
};

/**
 * Issues a GraphQL request against Tokopedia's public gateway.
 *
 * Only public, unauthenticated discovery operations are used — there are no
 * cookies or session tokens involved.
 */
export async function gqlRequest<T>(
  operationName: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = `${TOKOPEDIA_GQL}/${operationName}`;
  const body = JSON.stringify({ operationName, query, variables: variables ?? {} });

  // Retries transient failures (network error, 429, 5xx) with backoff.
  const response = await fetchWithRetry(
    url,
    { method: 'POST', headers: BASE_HEADERS, body },
    operationName,
  );

  const json = (await response.json()) as { errors?: Array<{ message: string }> } & T;

  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new TokopediaAPIError(
      `GraphQL error in ${operationName}: ${msg}`,
      undefined,
      operationName,
    );
  }

  return json;
}
