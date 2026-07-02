import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const manifestsDir = join(import.meta.dirname, "../../public/manifests");

function readManifest(name: string) {
  return JSON.parse(readFileSync(join(manifestsDir, `${name}.webmanifest`), "utf8")) as {
    start_url: string;
    scope: string;
  };
}

describe("workspace PWA manifests", () => {
  it("uses canonical list landing paths for multi-segment apps", () => {
    expect(readManifest("notes")).toMatchObject({
      start_url: "/notes/all",
      scope: "/notes",
    });
    expect(readManifest("contacts")).toMatchObject({
      start_url: "/contacts/all",
      scope: "/contacts",
    });
  });
});
