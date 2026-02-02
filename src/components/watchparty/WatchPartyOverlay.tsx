import { ParticipantAvatars } from "./ParticipantAvatars";
import { WatchPartyChat } from "./WatchPartyChat";
import { HostControls } from "./HostControls";
import { WatchPartyParticipant, WatchPartyMessage } from "@/types/watchparty";

interface WatchPartyOverlayProps {
  participants: WatchPartyParticipant[];
  messages: WatchPartyMessage[];
  hostId: string;
  isHost: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentUserId?: string;
  onSendMessage: (content: string) => Promise<boolean>;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSyncAll: () => void;
}

export function WatchPartyOverlay({
  participants,
  messages,
  hostId,
  isHost,
  isPlaying,
  currentTime,
  duration,
  currentUserId,
  onSendMessage,
  onPlayPause,
  onSeek,
  onSyncAll,
}: WatchPartyOverlayProps) {
  return (
    <>
      {/* Participants - Top right, below header */}
      <div className="absolute top-20 right-4 z-40">
        <ParticipantAvatars 
          participants={participants} 
          hostId={hostId} 
        />
      </div>

      {/* Host Controls - Center bottom */}
      {isHost && (
        <div className="absolute bottom-72 left-1/2 -translate-x-1/2 z-40">
          <HostControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={onPlayPause}
            onSeek={onSeek}
            onSyncAll={onSyncAll}
          />
        </div>
      )}

      {/* Guest indicator */}
      {!isHost && (
        <div className="absolute bottom-72 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm text-muted-foreground">
            Host is controlling playback
          </div>
        </div>
      )}

      {/* Chat - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-40">
        <WatchPartyChat
          messages={messages}
          onSendMessage={onSendMessage}
          currentUserId={currentUserId}
        />
      </div>
    </>
  );
}
