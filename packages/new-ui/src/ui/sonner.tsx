import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

/** Renders the live-app toast stack (used in document shell + Storybook). */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-3 w-full rounded-md px-3.5 py-2.5 text-sm shadow-lg",
          icon: "shrink-0 [&>svg]:size-4",
        },
        style: {
          background: "var(--color-ink)",
          color: "var(--color-cream)",
          fontFamily: "var(--font-sans)",
          border: "1px solid color-mix(in oklab, var(--color-cream) 12%, transparent)",
        },
      }}
    />
  );
}

export { Toaster };
