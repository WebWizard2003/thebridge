import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTyping } from "@/hooks/useTyping";
import { useAuthStore } from "@/stores/auth.store";
import { getSocket } from "@/lib/socket";
import api from "@/lib/api";
import type { Conversation } from "@/types";
import { MemberRole, MessageType } from "@/types";

interface MessageInputProps {
  conversation: Conversation;
}

export function MessageInput({ conversation }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const { startTyping, stopTyping } = useTyping(conversation.id);

  const myMember = conversation.members.find((m) => m.userId === user?.id);
  const isLocked = conversation.isLocked && myMember?.role !== MemberRole.ADMIN;

  const sendMessage = useCallback(
    async (type: string = MessageType.TEXT, mediaUrl?: string, fileName?: string) => {
      const text = content.trim();
      if (!text && !mediaUrl) return;

      const socket = getSocket();
      if (socket) {
        socket.emit("message:send", {
          conversationId: conversation.id,
          type,
          content: text || undefined,
          mediaUrl,
          fileName,
        });
      } else {
        try {
          await api.post(`/conversations/${conversation.id}/messages`, {
            type,
            content: text || undefined,
            mediaUrl,
            fileName,
          });
        } catch {
          toast.error("Failed to send message");
          return;
        }
      }

      setContent("");
      stopTyping();
    },
    [content, conversation.id, stopTyping]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads", formData);
      const { url, fileName } = res.data;
      const isImage = file.type.startsWith("image/");
      await sendMessage(
        isImage ? MessageType.IMAGE : MessageType.DOCUMENT,
        url,
        fileName
      );
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLocked) {
    return (
      <div className="flex items-center justify-center gap-2 border-t bg-muted/30 px-4 py-4 text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className="text-sm">Only admins can send messages</span>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 border-t bg-card/50 px-4 py-3">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors duration-150"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        )}
      </Button>
      <Textarea
        placeholder="Type a message..."
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          startTyping();
        }}
        onKeyDown={handleKeyDown}
        className="min-h-[40px] max-h-[120px] resize-none rounded-xl border-muted bg-muted/40 focus-visible:bg-background transition-colors duration-150"
        rows={1}
      />
      <Button
        size="icon"
        className="shrink-0 h-9 w-9 rounded-xl transition-all duration-200"
        onClick={() => sendMessage()}
        disabled={!content.trim() && !uploading}
      >
        <Send className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}
