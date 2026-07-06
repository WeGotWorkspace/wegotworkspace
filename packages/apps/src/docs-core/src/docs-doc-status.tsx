export type DocsDocStatusProps = {
  status: string;
};

export function DocsDocStatus({ status }: DocsDocStatusProps) {
  return (
    <span className="docs-workspace__doc-status" role="status" aria-live="polite">
      {status}
    </span>
  );
}
