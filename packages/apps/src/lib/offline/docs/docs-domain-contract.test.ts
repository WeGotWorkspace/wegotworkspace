import { describe, expect, it } from "vitest";
import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import type { DocsDocument } from "@/docs-core/src/docs-types";
import type { DocsAPIOperations } from "@/docs-core/src/docs-types";
import type { OfflineDomainOperations, OfflineDomainStore } from "@/lib/offline/core/types";
import {
  docsHybridDomainOperations,
  docsOfflineDomainStore,
} from "@/lib/offline/docs/docs-domain-contract";

describe("docs domain contract", () => {
  it("satisfies OfflineDomainStore at compile time", () => {
    const store: OfflineDomainStore<DocsAppBootstrap, DocsDocument> = docsOfflineDomainStore;
    expect(store.readBootstrap).toBeTypeOf("function");
  });

  it("satisfies OfflineDomainOperations at compile time", () => {
    const ops: OfflineDomainOperations<DocsAPIOperations> = docsHybridDomainOperations;
    expect(ops).toBeTypeOf("function");
  });
});
