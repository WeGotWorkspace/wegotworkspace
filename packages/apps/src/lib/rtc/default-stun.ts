export const DEFAULT_PUBLIC_STUN_URLS = [
  "stun:stun.nextcloud.com:443",
  "stun:stun.sipgate.net:3478",
  "stun:stun.1und1.de:3478",
  "stun:stun.t-online.de:3478",
] as const;

export const DEFAULT_PUBLIC_STUN_URLS_CSV = DEFAULT_PUBLIC_STUN_URLS.join(", ");
