/** Parse only for validation, review or submission; never write the result back into input state. */
export function nurseryQuantityValue(raw: string): number {
  const text = raw.trim();
  // Match the existing two-decimal quantity contract, including an unfinished decimal separator.
  return /^-?(?:\d+(?:[.,]\d{0,2})?|[.,]\d{1,2})$/.test(text) ? Number(text.replace(",", ".")) : NaN;
}
