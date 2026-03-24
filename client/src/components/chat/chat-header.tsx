import { useState } from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/stores/auth.store";
import { usePresenceStore } from "@/stores/presence.store";
import { GroupSettingsSheet } from "./group-settings-sheet";
import { ConversationType } from "@/types";
import type { Conversation } from "@/types";

const EMPTY_ARRAY: string[] = [];

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
}

function getConversationInfo(conversation: Conversation, currentUserId: string | undefined) {
  if (conversation.type === ConversationType.DIRECT) {
    const other = conversation.members.find((m) => m.userId !== currentUserId);
    return {
      name: other?.user?.name || "Unknown",
      avatarUrl: other?.user?.avatarUrl,
      userId: other?.userId,
    };
  }
  return {
    name: conversation.name || "Group",
    avatarUrl: conversation.avatarUrl,
    userId: undefined,
  };
}

export function ChatHeader({ conversation, onBack }: ChatHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const user = useAuthStore((s) => s.user);
  const info = getConversationInfo(conversation, user?.id);
  const isOnline = usePresenceStore((s) => info.userId ? s.onlineUsers.has(info.userId) : false);
  const typingUsersRaw = usePresenceStore((s) => s.typingUsers[conversation.id]);
  const typingUsers = typingUsersRaw ?? EMPTY_ARRAY;
  const isGroup = conversation.type === ConversationType.GROUP;

  const typingNames = typingUsers
    .filter((uid) => uid !== user?.id)
    .map((uid) => conversation.members.find((m) => m.userId === uid)?.user?.name || "Someone");

  let subtitle: string;
  if (typingNames.length > 0) {
    subtitle = typingNames.length === 1 ? `${typingNames[0]} is typing...` : "Several people are typing...";
  } else if (isGroup) {
    subtitle = `${conversation.members.length} members`;
  } else {
    subtitle = isOnline ? "Online" : "Offline";
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b px-4 py-2.5 bg-card/80 backdrop-blur-sm">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden shrink-0 h-9 w-9 rounded-xl hover:bg-muted/60 transition-colors duration-150"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <UserAvatar
          src={info.avatarUrl}
          name={info.name}
          showOnline={!isGroup && isOnline}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{info.name}</h2>
          <p className={`text-xs truncate transition-colors duration-200 ${
            typingNames.length > 0 ? "text-primary" : "text-muted-foreground"
          }`}>
            {subtitle}
          </p>
        </div>
        {isGroup && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="h-9 w-9 rounded-xl hover:bg-muted/60 transition-colors duration-150"
          >
            <Settings className="h-4.5 w-4.5 text-muted-foreground" />
          </Button>
        )}
      </div>
      {isGroup && (
        <GroupSettingsSheet
          conversation={conversation}
          open={showSettings}
          onOpenChange={setShowSettings}
        />
      )}
    </>
  );
}
