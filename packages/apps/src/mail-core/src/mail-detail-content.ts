/** Resolve canonical plain-text detail content from a message detail payload. */
export function plainTextFromMailDetail(detail: { body: string }): string {
  return detail.body;
}
