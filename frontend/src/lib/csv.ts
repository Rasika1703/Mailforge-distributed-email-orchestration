import Papa from 'papaparse';


const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface ParsedRecipients {
  valid: string[];
  invalid: string[];
  duplicates: number;
  /** Every address-like token found, before de-duplication. */
  detected: number;
}


export function parseRecipients(text: string): ParsedRecipients {
  const rows = Papa.parse<string[]>(text, { skipEmptyLines: true }).data;
  const tokens = rows
    .flat()
    .flatMap((cell) => String(cell).split(/[\s;,]+/))
    .map((t) => t.trim().replace(/^["'<]+|["'>]+$/g, ''))
    .filter((t) => t.includes('@'));

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;

  for (const token of tokens) {
    const email = token.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      if (!invalid.includes(token)) invalid.push(token);
      continue;
    }
    if (seen.has(email)) {
      duplicates += 1;
      continue;
    }
    seen.add(email);
    valid.push(email);
  }

  return { valid, invalid, duplicates, detected: tokens.length };
}
