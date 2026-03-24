import { useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";

export function useTyping(conversationId: string | null) {
  const isTypingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useCallback(() => {
    if (!conversationId || !isTypingRef.current) return;
    const socket = getSocket();
    if (socket) {
      socket.emit("typing:stop", { conversationId });
    }
    isTypingRef.current = false;
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (!conversationId) return;
    const socket = getSocket();

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      if (socket) {
        socket.emit("typing:start", { conversationId });
      }
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [conversationId, stopTyping]);

  return { isTyping: isTypingRef.current, startTyping, stopTyping };
}
