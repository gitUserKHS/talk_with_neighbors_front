export const mergeChatMessage = <T extends { id: string }>(
  messages: readonly T[],
  incoming: T
): T[] => {
  const existingIndex = messages.findIndex((message) => message.id === incoming.id);
  if (existingIndex < 0) {
    return [...messages, incoming];
  }
  return messages.map((message, index) => index === existingIndex ? incoming : message);
};

// One ROOM_READ frame marks every message in the room as read by that user.
// Returns the same array when nothing changes so React skips the re-render.
export const applyRoomRead = <T extends { readByUsers?: number[] }>(
  messages: T[],
  readByUserId: number
): T[] => {
  let changed = false;
  const next = messages.map((message) => {
    const readByUsers = message.readByUsers ?? [];
    if (readByUsers.includes(readByUserId)) {
      return message;
    }
    changed = true;
    return { ...message, readByUsers: [...readByUsers, readByUserId] };
  });
  return changed ? next : messages;
};

export const TYPING_SIGNAL_TTL_MS = 4000;

export interface TypingUser {
  name: string;
  expiresAt: number;
}

export type TypingUserMap = Record<string, TypingUser>;

// The server's expiresAt is a zone-less LocalDateTime, so the display TTL is
// measured locally from the moment the signal arrives instead of parsing it.
export const applyTypingSignal = (
  map: TypingUserMap,
  signal: { userId: number | string; senderName: string },
  now: number
): TypingUserMap => ({
  ...map,
  [String(signal.userId)]: { name: signal.senderName, expiresAt: now + TYPING_SIGNAL_TTL_MS },
});

export const pruneTypingSignals = (map: TypingUserMap, now: number): TypingUserMap => {
  const live = Object.entries(map).filter(([, entry]) => entry.expiresAt > now);
  if (live.length === Object.keys(map).length) {
    return map;
  }
  return Object.fromEntries(live);
};
