import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/user-avatar";
import { useChatStore } from "@/stores/chat.store";
import api from "@/lib/api";
import type { User } from "@/types";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const createGroup = useChatStore((s) => s.createGroup);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get("/users/search", { params: { q } });
      setResults(res.data);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const toggleUser = (user: User) => {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) {
      toast.error("Enter a group name and select at least one member");
      return;
    }
    setCreating(true);
    try {
      const conv = await createGroup(name.trim(), selected.map((u) => u.id));
      await loadConversations();
      setActiveConversation(conv.id);
      onOpenChange(false);
      setName("");
      setQuery("");
      setSelected([]);
      setResults([]);
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Create Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Group Name</Label>
            <Input
              placeholder="Enter group name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map((u) => (
                <Badge key={u.id} variant="secondary" className="gap-1 pr-1">
                  {u.name}
                  <button onClick={() => toggleUser(u)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users to add..."
              className="pl-9"
              value={query}
              onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {results
              .filter((u) => !selected.find((s) => s.id === u.id))
              .map((u) => (
                <button
                  key={u.id}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                  onClick={() => toggleUser(u)}
                >
                  <UserAvatar src={u.avatarUrl} name={u.name} size="sm" />
                  <span className="text-sm">{u.name}</span>
                </button>
              ))}
          </div>

          <Button className="w-full" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
