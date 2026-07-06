export type FilePreviewPayload =
  | { kind: "blob-url"; url: string; width?: number; height?: number }
  | { kind: "text"; content: string }
  /** Full raw body for read-only Docs editor preview (detail pane). */
  | { kind: "docs"; content: string }
  | { kind: "unsupported" };
