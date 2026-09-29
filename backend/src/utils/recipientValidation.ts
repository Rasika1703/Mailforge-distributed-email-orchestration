
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface RecipientValidationResult {
  valid: string[];
  invalid: string[];
  duplicatesRemoved: number;
  totalDetected: number;
}


export function validateAndNormalizeRecipients(rawRecipients: string[]): RecipientValidationResult {
  const totalDetected = rawRecipients.length;
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicatesRemoved = 0;

  for (const raw of rawRecipients) {
    const normalized = raw.trim().toLowerCase();
    if (!normalized) continue;

    if (!EMAIL_REGEX.test(normalized)) {
      invalid.push(raw);
      continue;
    }

    if (seen.has(normalized)) {
      duplicatesRemoved += 1;
      continue;
    }

    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, invalid, duplicatesRemoved, totalDetected };
}
