import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { IconButton } from "@/button/src/button";
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
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLButtonElement>(".preview-lightbox__close")?.focus();
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
          <IconButton
            className="preview-lightbox__close shrink-0"
            label={closeLabel}
            icon={<X aria-hidden />}
            size="sm"
            variant="subtle"
            showTooltip={false}
            onClick={onClose}
          />
        </header>
        <div className="preview-lightbox__body" tabIndex={0}>
          {children}
        </div>
      </div>
      {onPrevious ? (
        <IconButton
          className="preview-lightbox__nav preview-lightbox__nav--prev"
          label={previousLabel}
          icon={<ChevronLeft aria-hidden />}
          size="lg"
          variant="subtle"
          showTooltip={false}
          disabled={!hasPrevious}
          onClick={onPrevious}
        />
      ) : null}
      {onNext ? (
        <IconButton
          className="preview-lightbox__nav preview-lightbox__nav--next"
          label={nextLabel}
          icon={<ChevronRight aria-hidden />}
          size="lg"
          variant="subtle"
          showTooltip={false}
          disabled={!hasNext}
          onClick={onNext}
        />
      ) : null}
    </dialog>
  );
}
