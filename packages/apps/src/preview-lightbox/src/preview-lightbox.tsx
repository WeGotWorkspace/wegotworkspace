import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/preview-lightbox/src/preview-lightbox.css";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type PreviewLightboxProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  closeLabel?: string;
  children: ReactNode;
};

function trapTabKey(event: KeyboardEvent, container: HTMLElement) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (node) => node.offsetParent !== null || node === document.activeElement,
  );
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function PreviewLightbox({
  open,
  title,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  previousLabel = "Previous",
  nextLabel = "Next",
  closeLabel = "Close preview",
  children,
}: PreviewLightboxProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      trapTabKey(event, panel);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn("preview-lightbox", !prefersReducedMotion && "preview-lightbox--enter")}
      role="presentation"
    >
      <button
        type="button"
        className="preview-lightbox__scrim"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="preview-lightbox__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="preview-lightbox__header">
          <h2 className="preview-lightbox__title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="preview-lightbox__close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="preview-lightbox__body" tabIndex={0}>
          {children}
        </div>
      </div>
      {onPrevious ? (
        <button
          type="button"
          className="preview-lightbox__nav preview-lightbox__nav--prev"
          aria-label={previousLabel}
          disabled={!hasPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft className="size-6" aria-hidden />
        </button>
      ) : null}
      {onNext ? (
        <button
          type="button"
          className="preview-lightbox__nav preview-lightbox__nav--next"
          aria-label={nextLabel}
          disabled={!hasNext}
          onClick={onNext}
        >
          <ChevronRight className="size-6" aria-hidden />
        </button>
      ) : null}
    </div>,
    document.body,
  );
}
