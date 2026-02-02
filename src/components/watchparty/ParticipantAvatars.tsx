import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WatchPartyParticipant } from "@/types/watchparty";
import { cn } from "@/lib/utils";

interface ParticipantAvatarsProps {
  participants: WatchPartyParticipant[];
  hostId: string;
  maxVisible?: number;
}

export function ParticipantAvatars({ 
  participants, 
  hostId, 
  maxVisible = 5 
}: ParticipantAvatarsProps) {
  // Sort so host is first
  const sorted = [...participants].sort((a, b) => {
    if (a.user_id === hostId) return -1;
    if (b.user_id === hostId) return 1;
    return 0;
  });

  const visible = sorted.slice(0, maxVisible);
  const overflow = sorted.length - maxVisible;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((participant) => {
        const isHost = participant.user_id === hostId;
        const initials = participant.profile?.display_name?.[0] || 
                        participant.profile?.username?.[0] || 
                        '?';

        return (
          <div key={participant.id} className="relative">
            <Avatar className={cn(
              "w-8 h-8 border-2 border-background",
              isHost && "ring-2 ring-yellow-400"
            )}>
              <AvatarImage src={participant.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-muted">
                {initials.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isHost && (
              <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                <Crown className="w-2.5 h-2.5 text-yellow-900" />
              </div>
            )}
          </div>
        );
      })}
      
      {overflow > 0 && (
        <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            +{overflow}
          </span>
        </div>
      )}
    </div>
  );
}
