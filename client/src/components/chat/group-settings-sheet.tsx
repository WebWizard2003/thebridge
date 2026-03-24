import { useState } from "react";
import { toast } from "sonner";
import { Crown, LogOut, Plus, Search, ShieldCheck, UserMinus, X, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";
import api from "@/lib/api";
import type { Conversation, User } from "@/types";
import { MemberRole } from "@/types";
import { cn } from "@/lib/utils";

interface GroupSettingsSheetProps {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GroupSettingsSheet({ conversation, open, onOpenChange }: GroupSettingsSheetProps) {
  const user = useAuthStore((s) => s.user);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const myMember = conversation.members.find((m) => m.userId === user?.id);
  const isAdmin = myMember?.role === MemberRole.ADMIN;
  const [groupName, setGroupName] = useState(conversation.name || "");
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const handleUpdateName = async () => {
    try {
      await api.put(`/conversations/${conversation.id}/group`, { name: groupName });
      toast.success("Group name updated");
      loadConversations();
    } catch {
      toast.error("Failed to update group name");
    }
  };

  const handleToggleLock = async () => {
    try {
      await api.put(`/conversations/${conversation.id}/lock`, { isLocked: !conversation.isLocked });
      toast.success(conversation.isLocked ? "Broadcast mode disabled" : "Broadcast mode enabled");
      loadConversations();
    } catch {
      toast.error("Failed to toggle broadcast mode");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.delete(`/conversations/${conversation.id}/members/${userId}`);
      toast.success("Member removed");
      loadConversations();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handlePromote = async (userId: string) => {
    try {
      await api.put(`/conversations/${conversation.id}/members/${userId}/role`, { role: "ADMIN" });
      toast.success("Promoted to admin");
      loadConversations();
    } catch {
      toast.error("Failed to promote member");
    }
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get("/users/search", { params: { q } });
      setSearchResults(res.data);
    } catch { setSearchResults([]); }
  };

  const handleAddMember = async (userId: string) => {
    try {
      await api.post(`/conversations/${conversation.id}/members`, { userId });
      toast.success("Member added");
      loadConversations();
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch {
      toast.error("Failed to add member");
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    try {
      await api.delete(`/conversations/${conversation.id}/members/${user.id}`);
      toast.success("Left group");
      useChatStore.getState().setActiveConversation(null);
      loadConversations();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to leave group");
    }
  };

  const existingMemberIds = new Set(conversation.members.map((m) => m.userId));

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-background border-l shadow-2xl animate-in slide-in-from-right duration-300 ease-out flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-heading text-lg font-bold">Group Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-xl hover:bg-muted/60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Group info section */}
          <div className="p-5 space-y-4">
            {/* Group avatar + name */}
            <div className="flex items-center gap-3">
              <UserAvatar name={conversation.name || "Group"} size="lg" />
              <div className="flex-1 min-w-0">
                {isAdmin ? (
                  <div className="flex gap-2">
                    <Input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="h-9 rounded-lg text-sm font-medium"
                    />
                    <Button
                      size="sm"
                      className="h-9 rounded-lg px-3 shrink-0"
                      onClick={handleUpdateName}
                      disabled={groupName === conversation.name}
                    >
                      Save
                    </Button>
                  </div>
                ) : (
                  <p className="font-semibold truncate">{conversation.name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {conversation.members.length} members
                </p>
              </div>
            </div>

            {/* Broadcast mode */}
            {isAdmin && (
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {conversation.isLocked ? (
                    <Lock className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Broadcast Mode</p>
                    <p className="text-[11px] text-muted-foreground">Only admins can message</p>
                  </div>
                </div>
                <Switch checked={conversation.isLocked} onCheckedChange={handleToggleLock} />
              </div>
            )}
          </div>

          <Separator />

          {/* Members section */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Members ({conversation.members.length})
              </p>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-lg text-xs hover:bg-primary/10 hover:text-primary"
                  onClick={() => setShowAddMember(!showAddMember)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              )}
            </div>

            {/* Add member search */}
            {showAddMember && (
              <div className="mb-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9 h-9 rounded-lg"
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    autoFocus
                  />
                </div>
                {searchResults
                  .filter((u) => !existingMemberIds.has(u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-muted/50 text-sm transition-colors duration-150"
                      onClick={() => handleAddMember(u.id)}
                    >
                      <UserAvatar src={u.avatarUrl} name={u.name} size="sm" />
                      <span className="font-medium">{u.name}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Member list */}
            <div className="space-y-0.5">
              {conversation.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted/30 transition-colors duration-150"
                >
                  <UserAvatar src={member.user?.avatarUrl} name={member.user?.name || "?"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.user?.name}
                      {member.userId === user?.id && (
                        <span className="text-muted-foreground font-normal"> (You)</span>
                      )}
                    </p>
                  </div>
                  <Badge
                    variant={member.role === MemberRole.ADMIN ? "default" : "secondary"}
                    className={cn(
                      "text-[10px] rounded-md px-2 py-0.5",
                      member.role === MemberRole.ADMIN && "bg-primary/15 text-primary border-0"
                    )}
                  >
                    {member.role === MemberRole.ADMIN ? (
                      <><Crown className="h-3 w-3 mr-0.5" /> Admin</>
                    ) : (
                      "Member"
                    )}
                  </Badge>
                  {isAdmin && member.userId !== user?.id && (
                    <div className="flex gap-0.5">
                      {member.role !== MemberRole.ADMIN && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors duration-150"
                          onClick={() => handlePromote(member.userId)}
                          title="Promote to admin"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors duration-150"
                        onClick={() => handleRemoveMember(member.userId)}
                        title="Remove member"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — leave group */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-10"
            onClick={handleLeave}
          >
            <LogOut className="h-4 w-4" /> Leave Group
          </Button>
        </div>
      </div>
    </>
  );
}
