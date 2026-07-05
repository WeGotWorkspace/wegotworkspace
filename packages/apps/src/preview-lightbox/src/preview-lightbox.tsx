import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import "@/preview-lightbox/src/preview-lightbox.css";

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return (
    <dialog
      ref={dialogRef}
      className={cn("preview-lightbox", !prefersReducedMotion && "preview-lightbox--enter")}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="preview-lightbox__panel">
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
    </dialog>
  );
}
