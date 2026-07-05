export type FilePreviewPayload =
  | { kind: "blob-url"; url: string }
  | { kind: "text"; content: string }
  | { kind: "unsupported" };
