import { useEffect, useState } from "react";
import type { ComponentProps, CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Toaster as Sonner } from "sonner";
import "@/ui/app-toaster.css";

type ToasterProps = ComponentProps<typeof Sonner>;

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

function AppToasterSurface() {
  return (
    <Toaster
      position="bottom-right"
      offset={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
        right: "max(0.75rem, env(safe-area-inset-right, 0px))",
      }}
      style={
        {
          ["--width" as string]: "min(100vw - 1rem, 28rem)",
          fontFamily: "var(--font-sans)",
        } as CSSProperties
      }
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full min-w-0 max-w-none items-stretch gap-0 rounded-md p-0 text-sm shadow-none",
          content: "flex w-full min-w-0 flex-col gap-0",
          title: "m-0 w-full min-w-0 p-0 font-[inherit] leading-[inherit]",
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

/**
 * Toast stack: portaled to `document.body` so `position: fixed` uses the
 * viewport (Storybook/canvas transforms otherwise pin toasts to the story frame).
 */
export function AppToaster() {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.body);
  }, []);

  if (container == null) {
    return null;
  }

  return createPortal(<AppToasterSurface />, container);
}

export { Toaster };
