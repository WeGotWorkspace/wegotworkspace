import { cn } from "@/lib/utils";
import "@/upload-progress/src/upload-progress.css";

export type UploadProgressProps = {
  label: string;
  percent: number;
  detail: string;
  done?: boolean;
  className?: string;
};

export function UploadProgress({
  label,
  percent,
  detail,
  done = false,
  className,
}: UploadProgressProps) {
  return (
    <div className={cn("upload-progress", className)}>
      <div className="upload-progress__row">
        <span className="upload-progress__label">{label}</span>
        <span className="upload-progress__percent">{percent}%</span>
      </div>
      <div className="upload-progress__track">
        <div
          className={cn(
            "upload-progress__fill",
            done ? "upload-progress__fill--done" : "upload-progress__fill--active",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="upload-progress__detail">{detail}</p>
    </div>
  );
}
