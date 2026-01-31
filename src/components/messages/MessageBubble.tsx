import { Message } from "@/types/message";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTime?: boolean;
}

export function MessageBubble({ message, isOwn, showTime = true }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex flex-col max-w-[75%]",
        isOwn ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      <div
        className={cn(
          "px-4 py-2 rounded-2xl break-words",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-secondary text-secondary-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      
      {showTime && (
        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {isOwn && (
            message.read_at ? (
              <CheckCheck className="w-3 h-3 text-primary" />
            ) : (
              <Check className="w-3 h-3 text-muted-foreground" />
            )
          )}
        </div>
      )}
    </div>
  );
}
