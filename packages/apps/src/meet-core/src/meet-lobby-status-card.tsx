import { cn } from "@/lib/utils";

type MeetLobbyStatusCardProps = {
  title: string;
  body: string;
  titleSize?: "lg" | "md";
  className?: string;
};

export function MeetLobbyStatusCard({
  title,
  body,
  titleSize = "lg",
  className,
}: MeetLobbyStatusCardProps) {
  return (
    <div
      className={cn(
        "meet-workspace__card",
        titleSize === "lg" ? "meet-workspace__card--stack-lg" : "meet-workspace__card--stack",
        className,
      )}
    >
      <h1
        className={cn(
          "meet-workspace__title",
          titleSize === "lg" ? "meet-workspace__title--lg" : "meet-workspace__title--md",
        )}
      >
        {title}
      </h1>
      <p className="meet-workspace__muted">{body}</p>
    </div>
  );
}
