export type MeetRouteSearch = {
  room?: string;
};

export function parseMeetRouteSearch(search: Record<string, unknown>): MeetRouteSearch {
  return {
    room: typeof search.room === "string" ? search.room : undefined,
  };
}

export function validateMeetRouteSearch(search: Record<string, unknown>): MeetRouteSearch {
  return parseMeetRouteSearch(search);
}

/** Room id from router search params (`?room=`). */
export function meetRoomFromSearch(search: MeetRouteSearch): string | null {
  const room = search.room?.trim();
  return room && room.length > 0 ? room : null;
}

/** Serialize active room for the current meet route search params. */
export function meetSearchFromRoom(roomCode: string | null): MeetRouteSearch {
  const room = roomCode?.trim();
  if (!room) return {};
  return { room };
}

/** Guest invite URL for sharing (always `/meet/guest?room=` on the given origin). */
export function buildMeetGuestCallLink(
  roomCode: string,
  origin = "https://workspace.example.com",
): string {
  const url = new URL("/meet/guest", origin);
  url.searchParams.set("room", roomCode);
  return url.toString();
}
