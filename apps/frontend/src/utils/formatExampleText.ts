/**
 * Formats example or test case text (input / output) to ensure newline formatting
 * is preserved accurately.
 *
 * - Preserves literal newline characters ('\n', '\r\n')
 * - Converts escaped literal newlines ("\\n", "\\r\\n") into actual line breaks
 * - Converts escaped literal tabs ("\\t") into actual tabs
 * - Handles primitives and objects (via JSON.stringify)
 */
export function formatExampleText(val: unknown): string {
  if (val === undefined || val === null) {
    return '';
  }

  let text: string;
  if (typeof val === 'string') {
    text = val;
  } else if (typeof val === 'object') {
    text = JSON.stringify(val, null, 2);
  } else {
    text = String(val);
  }

  // Convert escaped literal backslash-n / backslash-r to actual newlines
  text = text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');

  // Normalize CRLF to LF
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return text;
}
