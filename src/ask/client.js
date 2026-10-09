import { BY_ID, LINES, fallback } from './actions.js';

export async function requestAsk(text, { signal } = {}) {
  if (!text.trim() || [...text].length > 200) return { action: null, line: LINES.invalid };
  if (navigator.onLine === false) return fallback(text, 'offline');
  try {
    const response = await fetch('/api/ask', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) });
    const result = await response.json();
    const valid = row => row && BY_ID.has(row.action) && row.line === BY_ID.get(row.action).line;
    const authored = Object.values(LINES).includes(result.line);
    if (result.action !== null && !BY_ID.has(result.action)) return fallback(text);
    if (!authored && !valid(result)) return fallback(text);
    if (result.suggestions != null && (!Array.isArray(result.suggestions) || result.suggestions.length !== 3
      || !result.suggestions.every(valid))) return fallback(text);
    return { action: result.action, line: result.line, ...(result.suggestions ? { suggestions: result.suggestions } : {}) };
  } catch {
    if (signal?.aborted) throw new DOMException('Ask cancelled', 'AbortError');
    return fallback(text);
  }
}
