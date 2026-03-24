import { useState, useEffect, useCallback } from "react";
import { BookOpen, User, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatHeader } from "@/components/chat/chat-header";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";
import { CreateGroupDialog } from "@/components/chat/create-group-dialog";
import { StoriesPanel } from "@/components/stories/stories-panel";
import { ProfilePanel } from "@/components/profile-panel";
import { useSocket } from "@/hooks/useSocket";
import { useChatStore } from "@/stores/chat.store";
import { getSocket } from "@/lib/socket";
import { cn } from "@/lib/utils";

type SidePanel = "none" | "stories" | "profile";

export default function ChatPage() {
  useSocket();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>("none");

  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const loadMessages = useChatStore((s) => s.loadMessages);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
      const socket = getSocket();
      if (socket) {
        socket.emit("message:read", { conversationId: activeConversationId });
      }
    }
  }, [activeConversationId, loadMessages]);

  const togglePanel = useCallback((panel: SidePanel) => {
    setSidePanel((prev) => (prev === panel ? "none" : panel));
  }, []);

  return (
    <div className="flex h-dvh bg-background">
      {/* Left sidebar — conversation list */}
      <div
        className={cn(
          "flex h-full w-full flex-col border-r bg-card/50 md:w-80 lg:w-96 transition-all duration-200",
          activeConversationId ? "hidden md:flex" : "flex"
        )}
      >
        <ConversationList
          onNewChat={() => setShowNewChat(true)}
          onNewGroup={() => setShowNewGroup(true)}
        />

        {/* Bottom nav — inline panels instead of route changes */}
        <div className="flex border-t bg-card">
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors duration-150",
              sidePanel === "stories"
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => togglePanel("stories")}
          >
            <BookOpen className="h-4 w-4" />
            <span>Stories</span>
          </button>
          <div className="w-px bg-border" />
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors duration-150",
              sidePanel === "profile"
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => togglePanel("profile")}
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div
        className={cn(
          "flex h-full flex-1 flex-col min-w-0",
          !activeConversationId ? "hidden md:flex" : "flex"
        )}
      >
        {activeConversation ? (
          <>
            <ChatHeader
              conversation={activeConversation}
              onBack={() => useChatStore.getState().setActiveConversation(null)}
            />
            <MessageList conversation={activeConversation} />
            <MessageInput conversation={activeConversation} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-in fade-in zoom-in-50 duration-500">
              <MessageCircle className="h-10 w-10 text-primary/40" />
            </div>
            <div className="text-center animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100">
              <p className="text-base font-medium text-foreground/70">No conversation selected</p>
              <p className="text-sm mt-1">Pick a chat from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right side panel — Stories or Profile (slides in) */}
      <div
        className={cn(
          "h-full border-l bg-card/50 overflow-hidden transition-all duration-300 ease-out",
          sidePanel !== "none" ? "w-80 lg:w-96 opacity-100" : "w-0 opacity-0"
        )}
      >
        <div className="h-full w-80 lg:w-96">
          {sidePanel === "stories" && (
            <StoriesPanel onClose={() => setSidePanel("none")} />
          )}
          {sidePanel === "profile" && (
            <ProfilePanel onClose={() => setSidePanel("none")} />
          )}
        </div>
      </div>

      <NewChatDialog open={showNewChat} onOpenChange={setShowNewChat} />
      <CreateGroupDialog open={showNewGroup} onOpenChange={setShowNewGroup} />
    </div>
  );
}
