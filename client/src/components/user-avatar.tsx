import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OnlineIndicator } from "@/components/online-indicator";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:3001";

function resolveUrl(url?: string) {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

interface UserAvatarProps {
  src?: string;
  name: string;
  showOnline?: boolean;
  storyRing?: "unviewed" | "viewed" | "none";
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

export function UserAvatar({
  src,
  name,
  showOnline,
  storyRing = "none",
  size = "md",
  className,
}: UserAvatarProps) {
  return (
    <div className={cn("relative inline-block", className)}>
      <div
        className={cn(
          "rounded-full",
          storyRing === "unviewed" && "p-[2px] bg-gradient-to-tr from-secondary to-primary",
          storyRing === "viewed" && "p-[2px] bg-muted-foreground/30"
        )}
      >
        <Avatar className={cn(sizeClasses[size], storyRing !== "none" && "border-2 border-background")}>
          <AvatarImage src={resolveUrl(src)} alt={name} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
      </div>
      {showOnline && <OnlineIndicator />}
    </div>
  );
}
