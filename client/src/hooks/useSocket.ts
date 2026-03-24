import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { createSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { usePresenceStore } from "@/stores/presence.store";
import type { Message } from "@/types";

// Map `avatar` to `avatarUrl` in socket payloads (they bypass the API interceptor)
function mapAvatar(data: any): any {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(mapAvatar);
  const result: any = {};
  for (const key in data) {
    if (key === "avatar" && (typeof data[key] === "string" || data[key] === null)) {
      result["avatarUrl"] = data[key];
    } else if (typeof data[key] === "object") {
      result[key] = mapAvatar(data[key]);
    } else {
      result[key] = data[key];
    }
  }
  return result;
}

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("message:received", (data: Message) => {
      const message = mapAvatar(data);
      useChatStore.getState().addMessage(message);
      useChatStore.getState().updateConversationLastMessage(message.conversationId, message);
    });

    socket.on("message:sent", (data: Message) => {
      const message = mapAvatar(data);
      useChatStore.getState().addMessage(message);
      useChatStore.getState().updateConversationLastMessage(message.conversationId, message);
    });

    socket.on("message:status", (data: { messageId: string; status: string; conversationId: string }) => {
      useChatStore.getState().updateMessageStatus(data.messageId, data.status, data.conversationId);
    });

    socket.on("typing:start", (data: { conversationId: string; userId: string }) => {
      usePresenceStore.getState().setTyping(data.conversationId, data.userId);
    });

    socket.on("typing:stop", (data: { conversationId: string; userId: string }) => {
      usePresenceStore.getState().clearTyping(data.conversationId, data.userId);
    });

    socket.on("user:online", (data: { userId: string }) => {
      usePresenceStore.getState().setOnline(data.userId);
    });

    socket.on("user:offline", (data: { userId: string }) => {
      usePresenceStore.getState().setOffline(data.userId);
    });

    socket.on("group:locked", (data: { conversationId: string }) => {
      useChatStore.setState((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === data.conversationId ? { ...c, isLocked: true } : c
        ),
      }));
    });

    socket.on("group:unlocked", (data: { conversationId: string }) => {
      useChatStore.setState((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === data.conversationId ? { ...c, isLocked: false } : c
        ),
      }));
    });

    return () => {
      disconnectSocket();
      socketRef.current = null;
    };
  }, [token]);

  return socketRef.current;
}
