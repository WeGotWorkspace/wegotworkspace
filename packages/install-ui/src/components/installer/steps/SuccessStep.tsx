import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Wrench } from "lucide-react";

export function SuccessStep({
  siteName,
  homeUrl,
  adminUrl,
}: {
  siteName: string;
  homeUrl: string;
  adminUrl: string;
}) {
  return (
    <div className="space-y-8 text-center">
      <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-[var(--brand-red-soft)] opacity-75" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[var(--gradient-brand)] shadow-[var(--shadow-soft)]">
          <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">You're all set!</h1>
        <p className="mx-auto max-w-md text-muted-foreground">
          <span className="font-semibold text-foreground">{siteName}</span> has
          been installed successfully. Your Workspace is ready to use.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button size="lg" className="w-full gap-2 sm:w-auto" asChild>
          <a href={homeUrl}>
            <Home className="h-4 w-4" /> Go to home screen
          </a>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          asChild
        >
          <a href={adminUrl}>
            <Wrench className="h-4 w-4" /> Open admin panel
          </a>
        </Button>
      </div>

    </div>
  );
}
