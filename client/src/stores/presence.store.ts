import { create } from "zustand";

interface PresenceState {
  onlineUsers: Set<string>;
  typingUsers: Record<string, string[]>;
  setOnline: (userId: string) => void;
  setOffline: (userId: string) => void;
  setTyping: (conversationId: string, userId: string) => void;
  clearTyping: (conversationId: string, userId: string) => void;
  isOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>()((set, get) => ({
  onlineUsers: new Set<string>(),
  typingUsers: {},

  setOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),

  setOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  setTyping: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      if (current.includes(userId)) return state;
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...current, userId],
        },
      };
    }),

  clearTyping: (conversationId, userId) =>
    set((state) => {
      const current = state.typingUsers[conversationId] || [];
      return {
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: current.filter((id) => id !== userId),
        },
      };
    }),

  isOnline: (userId) => get().onlineUsers.has(userId),
}));
