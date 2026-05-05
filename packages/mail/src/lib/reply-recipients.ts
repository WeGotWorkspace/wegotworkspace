import type { Message } from "./mail-store";

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Builds {@code To}/{@code Cc} strings for reply / reply-all, matching common mail client behaviour:
 * reply-all includes everyone from the original To and Cc (except the current account and duplicates of the sender).
 */
export function replyComposeRecipients(
  message: Message,
  all: boolean,
  selfEmail: string | undefined,
): { to: string; cc: string } {
  const fromAddr = message.from.email.trim();
  if (!all) {
    return { to: fromAddr, cc: "" };
  }

  const selfN = normEmail(selfEmail ?? "");
  const fromN = normEmail(fromAddr);

  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const e = raw.trim();
    if (!e) return;
    const n = normEmail(e);
    if (seen.has(n)) return;
    if (selfN !== "" && n === selfN) return;
    seen.add(n);
    ordered.push(e);
  };

  for (const t of message.to) push(t.email);
  for (const c of message.cc ?? []) push(c.email);

  if (selfN !== "" && fromN === selfN) {
    if (ordered.length === 0) {
      return { to: fromAddr, cc: "" };
    }
    return { to: ordered.join(", "), cc: "" };
  }

  const ccList: string[] = [];
  for (const e of ordered) {
    if (normEmail(e) === fromN) continue;
    ccList.push(e);
  }
  return { to: fromAddr, cc: ccList.join(", ") };
}
