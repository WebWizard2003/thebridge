import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { StoryViewer } from "@/components/stories/story-viewer";
import { CreateStoryDialog } from "@/components/stories/create-story-dialog";
import { useStoryStore } from "@/stores/story.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Story } from "@/types";

export default function StoriesPage() {
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
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="font-heading text-xl font-bold">Stories</h1>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* My Story */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <UserAvatar
              src={user?.avatarUrl}
              name={user?.name || ""}
              size="lg"
              storyRing={myStories.length > 0 ? "unviewed" : "none"}
            />
            <button
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div>
            <p className="font-medium text-sm">My Story</p>
            <button
              className="text-xs text-muted-foreground hover:underline"
              onClick={() => {
                if (myStories.length > 0) setViewingStories(myStories);
                else setShowCreate(true);
              }}
            >
              {myStories.length > 0 ? `${myStories.length} stories` : "Add to your story"}
            </button>
          </div>
        </div>

        {/* Other users' stories */}
        {otherUsers.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent updates</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {otherUsers.map(([userId, stories]) => {
                const storyUser = stories[0]?.user;
                const allViewed = stories.every((s) => s.viewed);
                return (
                  <button
                    key={userId}
                    className="flex flex-col items-center gap-1.5 shrink-0"
                    onClick={() => setViewingStories(stories)}
                  >
                    <UserAvatar
                      src={storyUser?.avatarUrl}
                      name={storyUser?.name || ""}
                      size="lg"
                      storyRing={allViewed ? "viewed" : "unviewed"}
                    />
                    <span className="text-xs text-center max-w-[64px] truncate">
                      {storyUser?.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && otherUsers.length === 0 && myStories.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">
            No stories yet. Be the first to share!
          </p>
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
