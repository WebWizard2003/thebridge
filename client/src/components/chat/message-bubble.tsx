import { Check, CheckCheck, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Message, MessageStatusType } from "@/types";
import { MessageType } from "@/types";

const API_BASE = "http://localhost:3001";

function resolveUrl(url?: string) {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isGroup: boolean;
  showSenderName: boolean;
}

function StatusIcon({ status }: { status?: MessageStatusType }) {
  if (!status || status === "SENT") {
    return <Check className="h-3 w-3 text-white/50" />;
  }
  if (status === "DELIVERED") {
    return <CheckCheck className="h-3 w-3 text-white/50" />;
  }
  return <CheckCheck className="h-3 w-3 text-sky-200" />;
}

function getLatestStatus(message: Message): MessageStatusType | undefined {
  if (!message.statuses || message.statuses.length === 0) return "SENT" as MessageStatusType;
  const priority = { READ: 3, DELIVERED: 2, SENT: 1 };
  return message.statuses.reduce((best, s) =>
    (priority[s.status as keyof typeof priority] || 0) > (priority[best.status as keyof typeof priority] || 0) ? s : best
  ).status as MessageStatusType;
}

export function MessageBubble({ message, isMine, isGroup, showSenderName }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), "HH:mm");
  const status = isMine ? getLatestStatus(message) : undefined;

  return (
    <div className={cn(
      "flex w-full mb-1 animate-in fade-in duration-200",
      isMine ? "justify-end slide-in-from-right-2" : "justify-start slide-in-from-left-2"
    )}>
      <div className="max-w-[75%] min-w-20">
        {showSenderName && !isMine && isGroup && (
          <p className="text-[11px] font-semibold text-primary mb-0.5 px-1">
            {message.sender?.name}
          </p>
        )}
        <div
          className={cn(
            "relative px-3 py-2 break-words shadow-sm",
            isMine
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
              : "bg-muted/80 text-foreground rounded-2xl rounded-bl-md"
          )}
        >
          {message.type === MessageType.IMAGE && message.mediaUrl && (
            <a href={resolveUrl(message.mediaUrl)} target="_blank" rel="noopener noreferrer">
              <img
                src={resolveUrl(message.mediaUrl)}
                alt="Shared image"
                className="rounded-xl max-h-64 w-full object-cover mb-1.5"
                loading="lazy"
              />
            </a>
          )}

          {message.type === MessageType.DOCUMENT && (
            <a
              href={resolveUrl(message.mediaUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-lg mb-1.5 transition-colors duration-150",
                isMine ? "bg-white/10 hover:bg-white/20" : "bg-black/5 hover:bg-black/10"
              )}
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span className="text-sm truncate">{message.fileName || "Document"}</span>
            </a>
          )}

          {message.content && (
            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}

          <div
            className={cn(
              "flex items-center justify-end gap-1 mt-0.5",
              isMine ? "text-white/50" : "text-muted-foreground"
            )}
          >
            <span className="text-[10px]">{time}</span>
            {isMine && <StatusIcon status={status} />}
          </div>
        </div>
      </div>
    </div>
  );
}
