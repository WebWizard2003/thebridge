import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, LogOut, Camera, Check, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { useAuthStore } from "@/stores/auth.store";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface ProfilePanelProps {
  onClose: () => void;
}

export function ProfilePanel({ onClose }: ProfilePanelProps) {
  const { user, logout, loadUser } = useAuthStore();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/users/me", { name: name.trim(), bio: bio.trim() });
      await loadUser();
      setDirty(false);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/uploads", formData);
      await api.put("/users/me", { avatar: uploadRes.data.url });
      await loadUser();
      toast.success("Avatar updated");
    } catch {
      toast.error("Failed to update avatar");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-full flex-col animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-heading text-lg font-bold">Profile</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative group">
            <UserAvatar src={user?.avatarUrl} name={user?.name || ""} size="lg" />
            <button
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="text-center">
            <p className="font-heading font-semibold">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Separator />

        {/* Edit fields */}
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</Label>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => { setBio(e.target.value); setDirty(true); }}
              placeholder="Tell something about yourself..."
              rows={3}
              className="resize-none"
            />
          </div>

          {dirty && (
            <Button
              className="w-full gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>

        <Separator />

        {/* Theme toggle */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Appearance</Label>
          <div className="flex gap-1.5 rounded-xl bg-muted/50 p-1">
            {([
              { value: "light" as const, icon: Sun, label: "Light" },
              { value: "dark" as const, icon: Moon, label: "Dark" },
              { value: "system" as const, icon: Monitor, label: "System" },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all duration-200",
                  theme === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setTheme(value)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
