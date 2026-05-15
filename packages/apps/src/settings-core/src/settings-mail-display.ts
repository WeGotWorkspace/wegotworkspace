/** Tokens commonly returned for IMAP/SMTP transport security in server config. */
const MAIL_TRANSPORT_SECURITY_LABELS: Readonly<Record<string, string>> = {
  ssl: "SSL/TLS",
  "ssl/tls": "SSL/TLS",
  tls: "TLS",
  starttls: "STARTTLS",
  none: "None",
};

/** Human-readable label for a stored transport security token; unknown values stay legible. */
export function formatMailTransportSecurityLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return "Unknown";
  return MAIL_TRANSPORT_SECURITY_LABELS[key] ?? raw.trim().toUpperCase();
}
