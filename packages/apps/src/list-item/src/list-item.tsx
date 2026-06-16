import { useRef, type CSSProperties } from "react";
import { Archive, Check } from "lucide-react";
import {
  SwipeableListItem,
  SwipeAction as SwipeActionPrimitive,
  TrailingActions,
  LeadingActions,
} from "react-swipeable-list";
import "./list-item.css";

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
  /** Optional leading slot (e.g. avatar) rendered inside the row highlight area. */
  leading?: React.ReactNode;
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

function themeToCssVars(theme: Partial<ListItemTheme>): CSSProperties {
  const vars: Record<string, string> = {};
  if (theme.baseBackground) vars["--list-item-base-bg"] = theme.baseBackground;
  if (theme.activeBackground) vars["--list-item-active-bg"] = theme.activeBackground;
  if (theme.selectedBackground) vars["--list-item-selected-bg"] = theme.selectedBackground;
  if (theme.borderColor) vars["--list-item-border-color"] = theme.borderColor;
  if (theme.accentColor) vars["--list-item-accent-color"] = theme.accentColor;
  if (theme.titleColor) vars["--list-item-title-color"] = theme.titleColor;
  if (theme.mutedColor) vars["--list-item-muted-color"] = theme.mutedColor;
  if (theme.bodyColor) vars["--list-item-body-color"] = theme.bodyColor;
  return vars as CSSProperties;
}

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
  leading,
}: ListItemProps) {
  const palette = { ...defaultTheme, ...theme };
  const themeVars = theme ? themeToCssVars(palette) : undefined;
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

  const button = (
    <button
      type="button"
      data-list-item-id={id}
      data-active={isActive ? "true" : "false"}
      data-selected={isSelected ? "true" : "false"}
      data-selection-mode={selectionMode ? "true" : "false"}
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
      className={`list-item__button relative w-full text-left px-4 py-3 md:px-6 md:py-4 border-b block select-none outline-none focus:outline-none ${
        isDragging ? "opacity-40" : ""
      } ${selectionMode ? "pl-9 md:pl-11" : ""} ${leading ? "list-item__button--with-leading" : ""}`}
      style={themeVars}
    >
      <span
        aria-hidden
        className="list-item__checkbox-wrap absolute left-3 md:left-4 top-1/2 -translate-y-1/2"
      >
        <span className="list-item__checkbox inline-flex size-4 items-center justify-center rounded-[4px] border">
          {isSelected ? <Check className="size-3 text-white" strokeWidth={2.75} /> : null}
        </span>
      </span>

      {leading ? <span className="list-item__leading shrink-0">{leading}</span> : null}

      <div className="list-item__content min-w-0">
        <div className="flex justify-between items-baseline mb-1 gap-3">
          <span className="list-item__subtitle text-sm font-semibold truncate min-w-0 font-sans">
            {subtitle}
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {icons.map((icon, index) => (
              <span key={`${id}-icon-${index}`} className="inline-flex items-center">
                {icon}
              </span>
            ))}
            <span className="list-item__date text-xs tabular-nums">{date}</span>
          </span>
        </div>

        <h3
          className="list-item__title text-base font-medium leading-tight mb-1 tracking-tight truncate"
          data-empty={title ? "false" : "true"}
        >
          {title || emptyTitle}
        </h3>

        <p className="list-item__body text-sm leading-relaxed line-clamp-1">
          {text || (!title ? emptyText : "")}
        </p>
      </div>
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
          className="list-item__swipe-action flex items-center justify-center text-white text-xs font-medium gap-1 flex-col w-full"
          style={{ "--list-item-swipe-bg": swipeLeftAction.color } as CSSProperties}
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
          className="list-item__swipe-action flex items-center justify-center text-white text-xs font-medium gap-1 flex-col w-full"
          style={{ "--list-item-swipe-bg": swipeRightAction.color } as CSSProperties}
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
