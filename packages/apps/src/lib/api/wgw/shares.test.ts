import { describe, expect, it } from "vitest";
import { isValidShareEmail, parseShareEmailList, shareViewerUrl } from "@/lib/api/wgw/shares";

describe("isValidShareEmail", () => {
  it("accepts well-formed addresses and trims whitespace", () => {
    expect(isValidShareEmail("alice@example.com")).toBe(true);
    expect(isValidShareEmail("  bob@team.dev  ")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidShareEmail("not-an-email")).toBe(false);
    expect(isValidShareEmail("missing@domain")).toBe(false);
    expect(isValidShareEmail("@nolocal.com")).toBe(false);
    expect(isValidShareEmail("")).toBe(false);
  });
});

describe("parseShareEmailList", () => {
  it("splits on commas, semicolons, and whitespace and lower-cases", () => {
    expect(parseShareEmailList("Alice@example.com, BOB@team.dev; carol@x.io")).toEqual([
      "alice@example.com",
      "bob@team.dev",
      "carol@x.io",
    ]);
  });

  it("de-duplicates and drops invalid tokens", () => {
    expect(parseShareEmailList("a@b.com a@b.com bad-token c@d.com")).toEqual([
      "a@b.com",
      "c@d.com",
    ]);
  });

  it("returns an empty list when nothing is valid", () => {
    expect(parseShareEmailList("   , ; ")).toEqual([]);
  });
});

describe("shareViewerUrl", () => {
  it("builds an absolute /s/{token} URL and trims trailing slashes", () => {
    expect(shareViewerUrl("https://app.example.com", "abc123")).toBe(
      "https://app.example.com/s/abc123",
    );
    expect(shareViewerUrl("https://app.example.com/", "abc123")).toBe(
      "https://app.example.com/s/abc123",
    );
  });

  it("encodes the token", () => {
    expect(shareViewerUrl("https://x.io", "a b/c")).toBe("https://x.io/s/a%20b%2Fc");
  });
});
