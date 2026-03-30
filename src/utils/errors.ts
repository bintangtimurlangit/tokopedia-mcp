import { TokopediaAPIError } from '../api/client.js';

/**
 * Wraps a tool handler to return a clean MCP error content block
 * instead of throwing and crashing the server.
 */
export async function withErrorHandling(
  fn: () => Promise<{ content: Array<{ type: 'text'; text: string }> }>
): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
  try {
    return await fn();
  } catch (err) {
    let message: string;

    if (err instanceof TokopediaAPIError) {
      message = `❌ Tokopedia API Error: ${err.message}`;
      if (err.statusCode === 401 || err.statusCode === 403) {
        message += '\n\n💡 Tip: Your TOKO_SID (session) cookie may be expired or invalid. Please refresh it from your browser.';
      } else if (err.statusCode === 429) {
        message += '\n\n💡 Tip: Rate limited by Tokopedia. Please wait a moment before retrying.';
      }
    } else if (err instanceof Error) {
      if (err.message.includes('TOKO_SID')) {
        message = `🔒 Authentication Required\n\n${err.message}`;
      } else {
        message = `❌ Error: ${err.message}`;
      }
    } else {
      message = `❌ Unknown error occurred`;
    }

    return { content: [{ type: 'text', text: message }] };
  }
}

/** Format Indonesian Rupiah */
export function formatIDR(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
}

/** Truncate text to max chars */
export function truncate(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}
