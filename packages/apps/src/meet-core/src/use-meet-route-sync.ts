import { useCallback, useMemo } from "react";
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import {
  buildMeetGuestCallLink,
  meetRoomFromSearch,
  meetSearchFromRoom,
  parseMeetRouteSearch,
} from "@/meet-core/src/meet-route-search";

function meetRouteTo(pathname: string): "/meet" | "/meet/guest" | "/meet/join" {
  if (pathname.startsWith("/meet/join")) return "/meet/join";
  if (pathname.startsWith("/meet/guest")) return "/meet/guest";
  return "/meet";
}

/** App-layer meet routing: read `?room=` from the URL and sync active room back. */
export function useMeetRouteSync() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const invitedRoom = useMemo(
    () => meetRoomFromSearch(parseMeetRouteSearch(search as Record<string, unknown>)),
    [search],
  );

  const buildCallLink = useCallback((roomCode: string) => {
    if (typeof window === "undefined") return buildMeetGuestCallLink(roomCode);
    return buildMeetGuestCallLink(roomCode, window.location.origin);
  }, []);

  const onRoomChange = useCallback(
    (roomCode: string | null) => {
      if (typeof window === "undefined") return;
      // Match useMeetRoomState history.replaceState: only sync when a call room is active.
      // Skipping null avoids stripping ?room= from guest invite links on initial mount.
      if (!roomCode) return;
      const currentRoom = meetRoomFromSearch(
        parseMeetRouteSearch(search as Record<string, unknown>),
      );
      const nextRoom = meetRoomFromSearch(meetSearchFromRoom(roomCode));
      if (currentRoom === nextRoom) return;
      void navigate({
        to: meetRouteTo(pathname),
        search: meetSearchFromRoom(roomCode),
        replace: true,
      });
    },
    [navigate, pathname, search],
  );

  return { invitedRoom, buildCallLink, onRoomChange };
}
