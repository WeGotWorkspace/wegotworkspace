import { Loader2 } from "lucide-react";

type WorkspaceListLoadingStateProps = {
  message: string;
};

export function WorkspaceListLoadingState({ message }: WorkspaceListLoadingStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-6 py-20"
      aria-busy
      aria-live="polite"
    >
      <Loader2
        className="size-9 animate-spin text-[color-mix(in_oklab,var(--color-ink)_45%,transparent)]"
        aria-hidden
      />
      <p className="text-center text-sm text-[color-mix(in_oklab,var(--color-ink)_50%,transparent)]">
        {message}
      </p>
    </div>
  );
}
