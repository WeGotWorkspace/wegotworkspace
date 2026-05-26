export type WgwAuthTokenOptions = {
  authTokenUrl?: string;
  authUser?: string;
  authPassword?: string;
};

/**
 * Fetch a bearer token for authenticated collab signaling.
 * Returns undefined when no token URL is configured.
 */
export async function fetchWgwAuthToken({
  authTokenUrl,
  authUser,
  authPassword,
}: WgwAuthTokenOptions): Promise<string | undefined> {
  if (!authTokenUrl) return undefined;
  if (!authUser || !authPassword) {
    throw new Error("Missing auth credentials for authenticated parity story");
  }

  const res = await fetch(authTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: authUser, password: authPassword }),
  });
  const text = await res.text();
  let data: { access_token?: string; error?: string } = {};
  try {
    data = JSON.parse(text) as { access_token?: string; error?: string };
  } catch {
    // ignore; handled by the checks below
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || `Auth token request failed (${res.status})`);
  }
  return data.access_token;
}
