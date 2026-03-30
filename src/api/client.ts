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

/** Assembles the Cookie header from individual env vars. */
function buildCookieString(): string {
  const parts: string[] = [];

  const add = (name: string, value: string | undefined) => {
    if (value) parts.push(`${name}=${value}`);
  };

  add('_SID_Tokopedia_', process.env.TOKO_SID);
  add('_UUID_CAS_',      process.env.TOKO_UUID_CAS);
  add('tuid',            process.env.TOKO_USER_ID);
  add('DID',             process.env.TOKO_DID);
  add('DID_JS',          process.env.TOKO_DID_JS);

  return parts.join('; ');
}

export function getHeaders(requiresAuth = false): Record<string, string> {
  const cookie = buildCookieString();

  if (requiresAuth && !process.env.TOKO_SID) {
    throw new Error(
      'TOKO_SID is required for this operation. ' +
        'Log into tokopedia.com, open DevTools (F12) → Application → Cookies → www.tokopedia.com, ' +
        'find the cookie named "_SID_Tokopedia_", and copy its value into TOKO_SID in your .env file.'
    );
  }

  return {
    ...BASE_HEADERS,
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

export class TokopediaAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = 'TokopediaAPIError';
  }
}

export async function gqlRequest<T>(
  operationName: string,
  query: string,
  variables?: Record<string, unknown>,
  requiresAuth = false
): Promise<T> {
  const url = `${TOKOPEDIA_GQL}/${operationName}`;
  const headers = getHeaders(requiresAuth);

  const body = JSON.stringify({ operationName, query, variables: variables ?? {} });

  let response: Response;
  try {
    response = await fetch(url, { method: 'POST', headers, body });
  } catch (err) {
    throw new TokopediaAPIError(
      `Network error calling ${operationName}: ${err instanceof Error ? err.message : String(err)}`,
      undefined,
      operationName
    );
  }

  if (!response.ok) {
    throw new TokopediaAPIError(
      `Tokopedia API returned HTTP ${response.status} for ${operationName}`,
      response.status,
      operationName
    );
  }

  const json = (await response.json()) as { errors?: Array<{ message: string }> } & T;

  if (json.errors && json.errors.length > 0) {
    const msg = json.errors.map((e) => e.message).join('; ');
    throw new TokopediaAPIError(`GraphQL error in ${operationName}: ${msg}`, undefined, operationName);
  }

  return json;
}
