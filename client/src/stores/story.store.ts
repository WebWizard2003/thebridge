import { create } from "zustand";
import api from "@/lib/api";
import type { Story, StoryView } from "@/types";

interface StoryState {
  storiesByUser: Record<string, Story[]>;
  myStories: Story[];
  isLoading: boolean;
  loadStories: () => Promise<void>;
  createStory: (data: FormData | Record<string, unknown>) => Promise<void>;
  viewStory: (storyId: string) => Promise<void>;
  loadMyStories: () => Promise<void>;
  getStoryViews: (storyId: string) => Promise<StoryView[]>;
}

export const useStoryStore = create<StoryState>()((set) => ({
  storiesByUser: {},
  myStories: [],
  isLoading: false,

  loadStories: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get("/stories");
      // API returns grouped: [{user, stories}]
      const groups: { user: any; stories: any[] }[] = res.data;
      const grouped: Record<string, Story[]> = {};
      groups.forEach((g) => {
        grouped[g.user.id] = g.stories.map((s) => ({
          ...s,
          user: g.user,
        }));
      });
      set({ storiesByUser: grouped, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createStory: async (data) => {
    await api.post("/stories", data);
  },

  viewStory: async (storyId) => {
    await api.post(`/stories/${storyId}/view`);
  },

  loadMyStories: async () => {
    const res = await api.get("/stories");
    const stories: Story[] = res.data;
    // Filter to current user's stories - they'll be identified in the component
    set({ myStories: stories });
  },

  getStoryViews: async (storyId) => {
    const res = await api.get(`/stories/${storyId}/views`);
    // Server returns `viewer` field, client expects `user`
    return res.data.map((v: any) => ({
      ...v,
      user: v.viewer,
    }));
  },
}));
