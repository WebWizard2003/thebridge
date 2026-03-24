import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        const res = await api.post("/auth/login", { email, password });
        const { token, user } = res.data;
        localStorage.setItem("auth-token", token);
        set({ token, user, isAuthenticated: true });
      },

      register: async (name, email, password) => {
        const res = await api.post("/auth/register", { name, email, password });
        const { token, user } = res.data;
        localStorage.setItem("auth-token", token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem("auth-token");
        disconnectSocket();
        set({ user: null, token: null, isAuthenticated: false });
      },

      loadUser: async () => {
        const { token } = get();
        if (!token) return;
        try {
          set({ isLoading: true });
          localStorage.setItem("auth-token", token);
          const res = await api.get("/auth/me");
          set({ user: res.data, isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
          localStorage.removeItem("auth-token");
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
