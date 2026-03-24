import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { StoryViewer } from "@/components/stories/story-viewer";
import { CreateStoryDialog } from "@/components/stories/create-story-dialog";
import { useStoryStore } from "@/stores/story.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Story } from "@/types";

interface StoriesPanelProps {
  onClose: () => void;
}

export function StoriesPanel({ onClose }: StoriesPanelProps) {
  const { storiesByUser, loadStories, isLoading } = useStoryStore();
  const user = useAuthStore((s) => s.user);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingStories, setViewingStories] = useState<Story[] | null>(null);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const myStories = user ? storiesByUser[user.id] || [] : [];
  const otherUsers = Object.entries(storiesByUser).filter(([uid]) => uid !== user?.id);

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-heading text-lg font-bold">Stories</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* My Story */}
        <div
          className="flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-colors duration-150 hover:bg-muted/50"
          onClick={() => {
            if (myStories.length > 0) setViewingStories(myStories);
            else setShowCreate(true);
          }}
        >
          <div className="relative">
            <UserAvatar
              src={user?.avatarUrl}
              name={user?.name || ""}
              size="lg"
              storyRing={myStories.length > 0 ? "unviewed" : "none"}
            />
            <button
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowCreate(true);
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <div>
            <p className="text-sm font-semibold">My Story</p>
            <p className="text-xs text-muted-foreground">
              {myStories.length > 0 ? `${myStories.length} stories` : "Tap to add"}
            </p>
          </div>
        </div>

        {/* Other users */}
        {otherUsers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Recent updates
            </p>
            <div className="space-y-1">
              {otherUsers.map(([userId, stories], i) => {
                const storyUser = stories[0]?.user;
                const allViewed = stories.every((s) => s.viewed);
                return (
                  <button
                    key={userId}
                    className="flex w-full items-center gap-3 rounded-xl p-3 transition-all duration-150 hover:bg-muted/50"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => setViewingStories(stories)}
                  >
                    <UserAvatar
                      src={storyUser?.avatarUrl}
                      name={storyUser?.name || ""}
                      size="md"
                      storyRing={allViewed ? "viewed" : "unviewed"}
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium">{storyUser?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {stories.length} {stories.length === 1 ? "story" : "stories"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && otherUsers.length === 0 && myStories.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground animate-in fade-in duration-300">
            <p className="text-sm">No stories yet</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>
              Be the first to share
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <CreateStoryDialog open={showCreate} onOpenChange={setShowCreate} />

      {viewingStories && (
        <StoryViewer
          stories={viewingStories}
          onClose={() => {
            setViewingStories(null);
            loadStories();
          }}
        />
      )}
    </div>
  );
}
