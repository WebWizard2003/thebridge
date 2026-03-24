import { useEffect, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { MessageCircle } from "lucide-react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import { usePresenceStore } from "@/stores/presence.store";
import { ConversationType } from "@/types";
import type { Message, Conversation } from "@/types";

const EMPTY_ARRAY: string[] = [];
const EMPTY_MESSAGES: Message[] = [];

interface MessageListProps {
  conversation: Conversation;
}

function DateSeparator({ date }: { date: string }) {
  const d = new Date(date);
  let label: string;
  if (isToday(d)) label = "Today";
  else if (isYesterday(d)) label = "Yesterday";
  else label = format(d, "MMMM d, yyyy");

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = format(new Date(msg.createdAt), "yyyy-MM-dd");
    if (date !== currentDate) {
      currentDate = date;
      groups.push({ date: msg.createdAt, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

export function MessageList({ conversation }: MessageListProps) {
  const user = useAuthStore((s) => s.user);
  const messages = useChatStore((s) => s.messages[conversation.id]) ?? EMPTY_MESSAGES;
  const typingUsers = usePresenceStore((s) => s.typingUsers[conversation.id]) ?? EMPTY_ARRAY;
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGroup = conversation.type === ConversationType.GROUP;

  const typingNames = typingUsers
    .filter((uid) => uid !== user?.id)
    .map((uid) => {
      const member = conversation.members.find((m) => m.userId === uid);
      return member?.user?.name || "Someone";
    });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <MessageCircle className="h-12 w-12 opacity-20" />
        <p className="text-sm">No messages yet — start the conversation!</p>
      </div>
    );
  }

  const groups = groupByDate(messages);

  return (
    <div className="flex-1 overflow-y-auto px-4 min-h-0">
      <div className="py-4">
        {groups.map((group) => (
          <div key={group.date}>
            <DateSeparator date={group.date} />
            {group.messages.map((msg, i) => {
              const isMine = msg.senderId === user?.id;
              const prev = group.messages[i - 1];
              const showSenderName = !isMine && isGroup && prev?.senderId !== msg.senderId;
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isMine={isMine}
                  isGroup={isGroup}
                  showSenderName={showSenderName}
                />
              );
            })}
          </div>
        ))}
        <TypingIndicator userNames={typingNames} />
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
