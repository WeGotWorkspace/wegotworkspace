import { useRef } from "react";
import { Star, Archive, CheckSquare, Circle } from "lucide-react";
import {
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  LeadingActions,
} from "react-swipeable-list";
import type { Note } from "@/types/note";

export function NoteListItem({
  note,
  isActive,
  isSelected,
  isStarred,
  isArchived,
  unread,
  selectionMode,
  isTouch,
  isDragging,
  onSelect,
  onStar,
  onArchive,
  onLongPress,
  onDragStart,
  onDragEnd,
}: {
  note: Note;
  isActive: boolean;
  isSelected: boolean;
  isStarred: boolean;
  isArchived: boolean;
  unread?: boolean;
  selectionMode: boolean;
  isTouch: boolean;
  isDragging: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onStar: () => void;
  onArchive: () => void;
  onLongPress: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const startLongPress = () => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
      if ("vibrate" in navigator) navigator.vibrate?.(15);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const bg = isSelected
    ? "color-mix(in oklab, var(--color-emerald) 18%, transparent)"
    : isActive
      ? "color-mix(in oklab, var(--color-emerald) 10%, transparent)"
      : "var(--color-cream, #f5f1e8)";

  const button = (
    <button
      onClick={(e) => {
        if (longPressFired.current) {
          e.preventDefault();
          return;
        }
        onSelect(e);
      }}
      onMouseDown={(e) => {
        if (e.shiftKey) e.preventDefault();
      }}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
      onContextMenu={(e) => {
        if (!isTouch) {
          e.preventDefault();
          onLongPress();
        }
      }}
      draggable={!isTouch}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", note.id);
      }}
      onDragEnd={onDragEnd}
      className={`relative w-full text-left p-4 md:p-6 border-b transition-colors block select-none outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-inset ${
        isDragging ? "opacity-40" : ""
      } ${selectionMode ? "pl-9 md:pl-11" : ""}`}
      style={{
        backgroundColor: bg,
        borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
        outlineColor: "var(--color-emerald)",
        transition: "padding 180ms ease, background-color 150ms ease",
      }}
    >
      <span
        aria-hidden
        className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 transition-opacity duration-150"
        style={{ opacity: selectionMode ? 1 : 0 }}
      >
        <CheckSquare
          className="size-4"
          style={{
            color: isSelected
              ? "var(--color-emerald)"
              : "color-mix(in oklab, var(--color-ink) 30%, transparent)",
          }}
          fill={isSelected ? "currentColor" : "none"}
        />
      </span>

      <div className="flex justify-between items-baseline mb-2 gap-3">
        <span
          className="text-[10px] uppercase tracking-[0.18em] font-medium truncate min-w-0"
          style={{
            color: isActive
              ? "var(--color-emerald)"
              : "color-mix(in oklab, var(--color-ink) 45%, transparent)",
          }}
        >
          {note.notebook}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {unread && (
            <Circle
              className="size-2.5"
              fill="currentColor"
              strokeWidth={0}
              style={{ color: "var(--color-emerald)" }}
            />
          )}
          <Star
            className="size-3 transition-opacity"
            fill="currentColor"
            style={{
              color: "var(--color-emerald)",
              opacity: isStarred ? 1 : 0,
            }}
          />
          <span
            className="text-[10px] tabular-nums"
            style={{ color: "color-mix(in oklab, var(--color-ink) 40%, transparent)" }}
          >
            {note.date}
          </span>
        </span>
      </div>
      <h3
        className="text-base font-semibold leading-tight mb-2 tracking-tight"
        style={{
          fontFamily: "var(--font-sans)",
          color: note.title
            ? "var(--color-ink)"
            : "color-mix(in oklab, var(--color-ink) 35%, transparent)",
        }}
      >
        {note.title || "Untitled"}
      </h3>
      <p
        className="text-sm leading-relaxed line-clamp-2"
        style={{ color: "color-mix(in oklab, var(--color-ink) 60%, transparent)" }}
      >
        {note.excerpt || (!note.title ? "Empty note" : "")}
      </p>
    </button>
  );

  if (!isTouch) return button;

  const leadingActions = () => (
    <LeadingActions>
      <SwipeAction onClick={onStar}>
        <div
          className="flex items-center justify-center text-white text-xs font-medium gap-1 flex-col w-full"
          style={{ backgroundColor: "var(--color-emerald)", minWidth: 80 }}
        >
          <Star className="size-5" fill={isStarred ? "currentColor" : "none"} />
          {isStarred ? "Unstar" : "Star"}
        </div>
      </SwipeAction>
    </LeadingActions>
  );

  const trailingActions = () => (
    <TrailingActions>
      <SwipeAction onClick={onArchive}>
        <div
          className="flex items-center justify-center text-white text-xs font-medium gap-1 flex-col w-full"
          style={{ backgroundColor: "var(--color-ink)", minWidth: 80 }}
        >
          <Archive className="size-5" />
          {isArchived ? "Unarchive" : "Archive"}
        </div>
      </SwipeAction>
    </TrailingActions>
  );

  return (
    <SwipeableListItem
      leadingActions={leadingActions()}
      trailingActions={trailingActions()}
      threshold={0.3}
    >
      {button}
    </SwipeableListItem>
  );
}
