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
