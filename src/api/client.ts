import 'dotenv/config';

const TOKOPEDIA_GQL = 'https://gql.tokopedia.com/graphql';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers: BASE_HEADERS, body });
  } catch (err) {
    throw new TokopediaAPIError(
      `Network error calling ${operationName}: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      operationName,
    );
  }

  if (!response.ok) {
    throw new TokopediaAPIError(
      `Tokopedia API returned HTTP ${response.status} for ${operationName}`,
      response.status,
      operationName,
    );
  }

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
