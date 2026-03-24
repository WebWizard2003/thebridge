import { useState, useEffect, useCallback } from "react";
import { X, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useStoryStore } from "@/stores/story.store";
import { useAuthStore } from "@/stores/auth.store";
import type { Story, StoryView as StoryViewType } from "@/types";
import { StoryType } from "@/types";

const API_BASE = "http://localhost:3001";
function resolveUrl(url?: string) {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
}

export function StoryViewer({ stories, initialIndex = 0, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<StoryViewType[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const viewStory = useStoryStore((s) => s.viewStory);
  const getStoryViews = useStoryStore((s) => s.getStoryViews);
  const user = useAuthStore((s) => s.user);

  const story = stories[currentIndex];
  const isMine = story?.userId === user?.id;

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (!story) return;
    if (isMine) {
      // Fetch view count for own stories
      getStoryViews(story.id).then((v) => setViewCount(v.length));
    } else {
      viewStory(story.id);
    }
  }, [story?.id, viewStory, getStoryViews, isMine]);

  useEffect(() => {
    if (showViewers) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { goNext(); return 0; }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [currentIndex, goNext, showViewers]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  const handleShowViewers = async () => {
    if (!story) return;
    const v = await getStoryViews(story.id);
    setViewers(v);
    setViewCount(v.length);
    setShowViewers(true);
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: i < currentIndex ? "100%" : i === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <UserAvatar src={story.user?.avatarUrl} name={story.user?.name || ""} size="sm" />
          <div>
            <p className="text-white text-sm font-medium">{story.user?.name}</p>
            <p className="text-white/60 text-xs">
              {formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-[5]">
        <button className="flex-1" onClick={goPrev} aria-label="Previous" />
        <button className="flex-1" onClick={goNext} aria-label="Next" />
      </div>

      {/* Content */}
      {story.type === StoryType.TEXT ? (
        <div
          className="flex items-center justify-center w-full h-full px-8"
          style={{ backgroundColor: story.backgroundColor || "#6366F1" }}
        >
          <p className="text-white text-2xl font-heading text-center font-semibold max-w-lg">
            {story.content}
          </p>
        </div>
      ) : (
        <img
          src={resolveUrl(story.mediaUrl)}
          alt=""
          className="max-w-full max-h-full object-contain"
        />
      )}

      {/* View count for own stories */}
      {isMine && (
        <button
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/80 bg-white/10 rounded-full px-4 py-2 z-10 backdrop-blur-sm"
          onClick={handleShowViewers}
        >
          <Eye className="h-4 w-4" />
          <span className="text-sm">{viewCount} views</span>
        </button>
      )}

      {/* Viewers sheet */}
      {showViewers && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[50vh] overflow-y-auto z-20 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Viewed by</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowViewers(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {viewers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No views yet</p>
          ) : (
            viewers.map((v) => (
              <div key={v.viewerId || v.userId} className="flex items-center gap-3 py-2">
                <UserAvatar src={v.user?.avatarUrl} name={v.user?.name || ""} size="sm" />
                <div>
                  <p className="text-sm font-medium">{v.user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(v.viewedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
