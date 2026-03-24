import { create } from "zustand";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Conversation, Message } from "@/types";

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  loadConversations: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  loadMessages: (conversationId: string, cursor?: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessageStatus: (messageId: string, status: string, conversationId: string) => void;
  createDirectConversation: (userId: string) => Promise<Conversation>;
  createGroup: (name: string, memberIds: string[]) => Promise<Conversation>;
  updateConversationLastMessage: (conversationId: string, message: Message) => void;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,

  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await api.get("/conversations");
      set({ conversations: res.data, isLoadingConversations: false });
    } catch {
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversation: (id) => {
    set((state) => ({
      activeConversationId: id,
      conversations: id
        ? state.conversations.map((c) =>
            c.id === id ? { ...c, unreadCount: 0 } : c
          )
        : state.conversations,
    }));
  },

  loadMessages: async (conversationId, cursor) => {
    set({ isLoadingMessages: true });
    try {
      const params = cursor ? { cursor } : {};
      const res = await api.get(`/conversations/${conversationId}/messages`, { params });
      const rawMessages: Message[] = res.data.messages || res.data.data || res.data;
      // Server returns desc order, reverse to asc for display
      const newMessages = [...rawMessages].reverse();
      set((state) => {
        const existing = cursor ? (state.messages[conversationId] || []) : [];
        return {
          messages: {
            ...state.messages,
            [conversationId]: cursor
              ? [...newMessages, ...existing]
              : newMessages,
          },
          isLoadingMessages: false,
        };
      });
    } catch {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message) => {
    set((state) => {
      const convMessages = state.messages[message.conversationId] || [];
      if (convMessages.find((m) => m.id === message.id)) return state;
      return {
        messages: {
          ...state.messages,
          [message.conversationId]: [...convMessages, message],
        },
      };
    });
  },

  updateMessageStatus: (messageId, status, conversationId) => {
    set((state) => {
      const msgs = state.messages[conversationId];
      if (!msgs) return state;
      return {
        messages: {
          ...state.messages,
          [conversationId]: msgs.map((m) =>
            m.id === messageId
              ? { ...m, statuses: [{ id: "", messageId, userId: "", status, createdAt: new Date().toISOString() } as any, ...(m.statuses || [])] }
              : m
          ),
        },
      };
    });
  },

  createDirectConversation: async (userId) => {
    const res = await api.post("/conversations/direct", { userId });
    const conv: Conversation = res.data;
    set((state) => {
      if (state.conversations.find((c) => c.id === conv.id)) return state;
      return { conversations: [conv, ...state.conversations] };
    });
    // Join socket room for real-time messages
    const socket = getSocket();
    if (socket) socket.emit("conversation:join", { conversationId: conv.id });
    return conv;
  },

  createGroup: async (name, memberIds) => {
    const res = await api.post("/conversations/group", { name, memberIds });
    const conv: Conversation = res.data;
    set((state) => ({ conversations: [conv, ...state.conversations] }));
    // Join socket room for real-time messages
    const socket = getSocket();
    if (socket) socket.emit("conversation:join", { conversationId: conv.id });
    return conv;
  },

  updateConversationLastMessage: (conversationId, message) => {
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: message } : c
      ).sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }),
    }));
  },
}));
