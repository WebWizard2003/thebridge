import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  className?: string;
}

export function OnlineIndicator({ className }: OnlineIndicatorProps) {
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-online ring-2 ring-background",
        "animate-pulse",
        className
      )}
    />
  );
}
