import { Children, isValidElement, type ReactNode } from "react";
import { SwipeableList, Type as SwipeListType } from "react-swipeable-list";

type WorkspaceSwipeListProps = {
  isTouch: boolean;
  children: ReactNode;
};

/** Wraps children in `SwipeableList` on touch; fragment on desktop. */
export function WorkspaceSwipeList({ isTouch, children }: WorkspaceSwipeListProps) {
  const swipeChildren = Children.toArray(children).filter((child) => isValidElement(child));
  if (isTouch) {
    return (
      <SwipeableList type={SwipeListType.IOS} fullSwipe>
        {swipeChildren}
      </SwipeableList>
    );
  }
  return <>{children}</>;
}
