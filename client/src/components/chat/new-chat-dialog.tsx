import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "sonner";
import { useChatStore } from "@/stores/chat.store";
import api from "@/lib/api";
import type { User } from "@/types";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/users/search", { params: { q } });
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelect = async (userId: string) => {
    try {
      const conv = await createDirectConversation(userId);
      await loadConversations();
      setActiveConversation(conv.id);
      onOpenChange(false);
      setQuery("");
      setResults([]);
    } catch {
      toast.error("Failed to start conversation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">New Conversation</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No users found</p>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
              onClick={() => handleSelect(u.id)}
            >
              <UserAvatar src={u.avatarUrl} name={u.name} size="sm" />
              <div className="text-left">
                <p className="text-sm font-medium">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
