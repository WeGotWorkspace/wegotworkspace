export type MeetChatLine = {
  id: string;
  fromPeerId: string;
  fromName: string;
  body: string;
  ts: number;
  isSelf: boolean;
};

function createMeetChatLineId(fromPeerId: string, prefix = fromPeerId): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

export function buildMeetChatLineFromPoll(
  fromPeerId: string,
  fromName: string,
  body: string,
  selfPeerId: string,
  now = Date.now(),
): MeetChatLine {
  return {
    id: createMeetChatLineId(fromPeerId),
    fromPeerId,
    fromName,
    body: body.trim(),
    ts: now,
    isSelf: fromPeerId === selfPeerId,
  };
}

export function buildLocalMeetChatLine(
  fromPeerId: string,
  fromName: string,
  body: string,
  now = Date.now(),
): MeetChatLine {
  return {
    id: createMeetChatLineId(fromPeerId, "me"),
    fromPeerId,
    fromName,
    body: body.trim(),
    ts: now,
    isSelf: true,
  };
}
