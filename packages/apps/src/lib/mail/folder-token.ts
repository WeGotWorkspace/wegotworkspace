/** Encode a mailbox display label to the opaque folder token used by the mail API. */
export function folderTokenFromMailboxLabel(label: string): string {
  const bytes = new TextEncoder().encode(label);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}
