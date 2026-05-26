import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWgwAuthToken } from "@/lib/api/wgw/auth-token";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("fetchWgwAuthToken", () => {
  it("returns undefined when authTokenUrl is not configured", async () => {
    await expect(fetchWgwAuthToken({})).resolves.toBeUndefined();
  });

  it("throws when credentials are missing", async () => {
    await expect(
      fetchWgwAuthToken({
        authTokenUrl: "https://wegotworkspace.local/api/v1/auth/token",
      }),
    ).rejects.toThrow("Missing auth credentials for authenticated parity story");
  });

  it("returns access_token for successful auth response", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "token-123",
            refresh_token: "refresh-123",
            token_type: "Bearer",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    ) as typeof fetch;

    await expect(
      fetchWgwAuthToken({
        authTokenUrl: "https://wegotworkspace.local/api/v1/auth/token",
        authUser: "admin",
        authPassword: "storybook-dev",
      }),
    ).resolves.toBe("token-123");
  });

  it("surfaces API error messages", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "Invalid credentials." }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    await expect(
      fetchWgwAuthToken({
        authTokenUrl: "https://wegotworkspace.local/api/v1/auth/token",
        authUser: "admin",
        authPassword: "wrong",
      }),
    ).rejects.toThrow("Invalid credentials.");
  });
});
