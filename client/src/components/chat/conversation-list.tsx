import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageSquarePlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { usePresenceStore } from "@/stores/presence.store";
import { ConversationType } from "@/types";
import type { Conversation } from "@/types";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  onNewChat: () => void;
  onNewGroup: () => void;
}

function getConversationDisplay(conversation: Conversation, currentUserId: string | undefined) {
  if (conversation.type === ConversationType.DIRECT) {
    const other = conversation.members.find((m) => m.userId !== currentUserId);
    return {
      name: other?.user?.name || "Unknown",
      avatarUrl: other?.user?.avatarUrl,
      otherUserId: other?.userId,
    };
  }
  return {
    name: conversation.name || "Group",
    avatarUrl: conversation.avatarUrl,
    otherUserId: undefined,
  };
}

function formatTime(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: false })
    .replace("about ", "")
    .replace(" minutes", "m")
    .replace(" minute", "m")
    .replace(" hours", "h")
    .replace(" hour", "h")
    .replace(" days", "d")
    .replace(" day", "d")
    .replace("less than a m", "now");
}

export function ConversationList({ onNewChat, onNewGroup }: ConversationListProps) {
  const user = useAuthStore((s) => s.user);
  const { conversations, activeConversationId, setActiveConversation, loadConversations, isLoadingConversations } =
    useChatStore();
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h1 className="font-heading text-xl font-bold tracking-tight">Chats</h1>
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewChat}
            title="New chat"
            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors duration-150"
          >
            <MessageSquarePlus className="h-[18px] w-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewGroup}
            title="New group"
            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors duration-150"
          >
            <Users className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations && conversations.length === 0 ? (
          <div className="space-y-1 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-2.5 w-36 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground animate-in fade-in duration-300">
            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
              <MessageSquarePlus className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-sm">No conversations yet</p>
            <Button variant="outline" size="sm" onClick={onNewChat}>
              Start a chat
            </Button>
          </div>
        ) : (
          <div className="p-1.5">
            {conversations.map((conv, i) => {
              const display = getConversationDisplay(conv, user?.id);
              const isActive = conv.id === activeConversationId;
              const isOnline = display.otherUserId ? onlineUsers.has(display.otherUserId) : false;
              const lastMsg = conv.lastMessage;
              const preview = lastMsg?.content
                ? lastMsg.content.length > 35
                  ? lastMsg.content.slice(0, 35) + "..."
                  : lastMsg.content
                : lastMsg?.type === "IMAGE"
                  ? "Sent a photo"
                  : lastMsg?.type === "DOCUMENT"
                    ? "Sent a file"
                    : "";
              const time = lastMsg ? formatTime(lastMsg.createdAt) : "";
              const hasUnread = (conv.unreadCount ?? 0) > 0;

              return (
                <button
                  key={conv.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150",
                    isActive
                      ? "bg-primary/10 shadow-sm"
                      : "hover:bg-muted/60 active:scale-[0.98]",
                  )}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <UserAvatar
                    src={display.avatarUrl}
                    name={display.name}
                    showOnline={conv.type === ConversationType.DIRECT && isOnline}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-sm truncate",
                        hasUnread ? "font-semibold" : "font-medium"
                      )}>
                        {display.name}
                      </span>
                      {time && (
                        <span className={cn(
                          "text-[10px] shrink-0",
                          hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                        )}>
                          {time}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={cn(
                        "text-xs truncate",
                        hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground"
                      )}>
                        {preview || "\u00A0"}
                      </p>
                      {hasUnread && (
                        <Badge className="h-[18px] min-w-[18px] rounded-full bg-primary px-1 text-[9px] font-bold shrink-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
