import { useRef } from "react";
import { Archive, Check } from "lucide-react";
import {
  SwipeableListItem,
  SwipeAction as SwipeActionPrimitive,
  TrailingActions,
  LeadingActions,
} from "react-swipeable-list";

export type SwipeAction = {
  icon: React.ReactNode;
  color: string;
  onActivate: () => void;
  label?: string;
  destructive?: boolean;
};

type ListItemTheme = {
  baseBackground: string;
  activeBackground: string;
  selectedBackground: string;
  borderColor: string;
  accentColor: string;
  titleColor: string;
  mutedColor: string;
  bodyColor: string;
};

type ListItemProps = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  icons?: React.ReactNode[];
  text: string;
  isActive: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  isTouch: boolean;
  isDragging: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onLongPress: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  swipeLeftAction?: SwipeAction;
  swipeRightAction?: SwipeAction;
  emptyTitle?: string;
  emptyText?: string;
  theme?: Partial<ListItemTheme>;
};

const defaultTheme: ListItemTheme = {
  baseBackground: "var(--color-cream, #ffffff)",
  activeBackground: "color-mix(in oklab, var(--color-emerald) 10%, transparent)",
  selectedBackground: "color-mix(in oklab, var(--color-emerald) 18%, transparent)",
  borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
  accentColor: "var(--color-emerald)",
  titleColor: "var(--color-ink)",
  mutedColor: "color-mix(in oklab, var(--color-ink) 45%, transparent)",
  bodyColor: "color-mix(in oklab, var(--color-ink) 60%, transparent)",
};

const LONG_PRESS_DELAY_MS = 450;
const TOUCH_MOVE_CANCEL_PX = 8;
const DESTRUCTIVE_CALLBACK_DELAY_MS = 380;

export function ListItem({
  id,
  title,
  subtitle,
  date,
  icons = [],
  text,
  isActive,
  isSelected,
  selectionMode,
  isTouch,
  isDragging,
  onClick,
  onDoubleClick,
  onLongPress,
  onDragStart,
  onDragEnd,
  swipeLeftAction,
  swipeRightAction,
  emptyTitle = "Untitled",
  emptyText = "Empty item",
  theme,
}: ListItemProps) {
  const palette = { ...defaultTheme, ...theme };
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const longPressBlockedBySwipeRef = useRef(false);
  const touchStartYRef = useRef<number | null>(null);

  const startLongPress = (e: React.TouchEvent<HTMLButtonElement>) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
    longPressBlockedBySwipeRef.current = false;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      if (longPressBlockedBySwipeRef.current) return;
      longPressFired.current = true;
      onLongPress();
      if ("vibrate" in navigator) navigator.vibrate?.(15);
    }, LONG_PRESS_DELAY_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    const startY = touchStartYRef.current;
    const touch = e.touches[0];
    if (!touch || startY === null) return;
    if (Math.abs(touch.clientY - startY) > TOUCH_MOVE_CANCEL_PX) cancelLongPress();
  };

  const resetTouchIntent = () => {
    cancelLongPress();
    touchStartYRef.current = null;
  };

  const bg = isSelected
    ? palette.selectedBackground
    : isActive
      ? palette.activeBackground
      : palette.baseBackground;

  const button = (
    <button
      type="button"
      data-list-item-id={id}
      onClick={(e) => {
        if (longPressFired.current || longPressBlockedBySwipeRef.current) {
          e.preventDefault();
          return;
        }
        onClick(e);
      }}
      onDoubleClick={(e) => {
        onDoubleClick?.(e);
      }}
      onMouseDown={(e) => {
        if (e.shiftKey) e.preventDefault();
      }}
      onTouchStart={isTouch ? startLongPress : undefined}
      onTouchEnd={resetTouchIntent}
      onTouchCancel={resetTouchIntent}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => {
        if (isTouch) e.preventDefault();
      }}
      draggable={!isTouch}
      onDragStart={(e) => {
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
      }}
      onDragEnd={onDragEnd}
      className={`relative w-full text-left px-4 py-3 md:px-6 md:py-4 border-b transition-colors block select-none outline-none focus:outline-none ${
        isDragging ? "opacity-40" : ""
      } ${selectionMode ? "pl-9 md:pl-11" : ""}`}
      style={{
        backgroundColor: bg,
        borderColor: palette.borderColor,
        outlineColor: palette.accentColor,
        transition: "padding 180ms ease, background-color 150ms ease",
      }}
    >
      <span
        aria-hidden
        className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 transition-opacity duration-150"
        style={{ opacity: selectionMode ? 1 : 0 }}
      >
        <span
          className="inline-flex size-4 items-center justify-center rounded-[4px] border"
          style={{
            borderColor: isSelected
              ? palette.accentColor
              : "color-mix(in oklab, var(--color-ink) 30%, transparent)",
            backgroundColor: isSelected ? palette.accentColor : "transparent",
          }}
        >
          {isSelected ? <Check className="size-3 text-white" strokeWidth={2.75} /> : null}
        </span>
      </span>

      <div className="flex justify-between items-baseline mb-1 gap-3">
        <span
          className="text-sm font-semibold truncate min-w-0 font-sans"
          style={{ color: palette.bodyColor }}
        >
          {subtitle}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {icons.map((icon, index) => (
            <span key={`${id}-icon-${index}`} className="inline-flex items-center">
              {icon}
            </span>
          ))}
          <span className="text-xs tabular-nums" style={{ color: palette.mutedColor }}>
            {date}
          </span>
        </span>
      </div>

      <h3
        className="text-base font-medium leading-tight mb-1 tracking-tight truncate"
        style={{
          fontFamily: "var(--font-sans)",
          color: title
            ? palette.titleColor
            : "color-mix(in oklab, var(--color-ink) 35%, transparent)",
        }}
      >
        {title || emptyTitle}
      </h3>

      <p className="text-sm leading-relaxed line-clamp-1" style={{ color: palette.bodyColor }}>
        {text || (!title ? emptyText : "")}
      </p>
    </button>
  );

  if (!isTouch) return button;

  const leadingActions = swipeLeftAction ? (
    <LeadingActions>
      <SwipeActionPrimitive
        onClick={swipeLeftAction.onActivate}
        destructive={swipeLeftAction.destructive}
      >
        <div
          className="flex items-center justify-center text-white text-xs font-medium gap-1 flex-col w-full"
          style={{ backgroundColor: swipeLeftAction.color, minWidth: 80 }}
        >
          {swipeLeftAction.icon}
          {swipeLeftAction.label ?? "Action"}
        </div>
      </SwipeActionPrimitive>
    </LeadingActions>
  ) : null;

  const trailingActions = swipeRightAction ? (
    <TrailingActions>
      <SwipeActionPrimitive
        onClick={swipeRightAction.onActivate}
        destructive={swipeRightAction.destructive}
      >
        <div
          className="flex items-center justify-center text-white text-xs font-medium gap-1 flex-col w-full"
          style={{ backgroundColor: swipeRightAction.color, minWidth: 80 }}
        >
          {swipeRightAction.icon ?? <Archive className="size-5" />}
          {swipeRightAction.label ?? "Action"}
        </div>
      </SwipeActionPrimitive>
    </TrailingActions>
  ) : null;

  if (!leadingActions && !trailingActions) return button;

  return (
    <SwipeableListItem
      leadingActions={leadingActions ?? undefined}
      trailingActions={trailingActions ?? undefined}
      threshold={0.3}
      destructiveCallbackDelay={DESTRUCTIVE_CALLBACK_DELAY_MS}
      swipeStartThreshold={4}
      onSwipeStart={() => {
        longPressBlockedBySwipeRef.current = true;
        cancelLongPress();
      }}
      onSwipeProgress={(progress) => {
        if (progress <= 0) return;
        longPressBlockedBySwipeRef.current = true;
        cancelLongPress();
      }}
      onSwipeEnd={() => {
        longPressBlockedBySwipeRef.current = false;
      }}
    >
      {button}
    </SwipeableListItem>
  );
}
