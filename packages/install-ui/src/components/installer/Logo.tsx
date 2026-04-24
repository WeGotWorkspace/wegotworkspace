export function Logo({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gradient-brand)] shadow-[var(--shadow-soft)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
            <path
              d="M3 15.5C3 13 5 11 7.5 11c.4 0 .8.05 1.2.15C9.5 8.7 11.9 7 14.7 7 18.2 7 21 9.8 21 13.3c0 .3 0 .6-.07.9C22.2 14.7 23 15.8 23 17c0 1.7-1.3 3-3 3H7c-2.2 0-4-1.8-4-4 0-.2 0-.3.02-.5z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">WeGotWorkspace</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Private Cloud
          </div>
        </div>
      </div>
    </div>
  );
}
