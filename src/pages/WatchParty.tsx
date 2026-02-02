import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { WatchPartyHeader } from "@/components/watchparty/WatchPartyHeader";
import { WatchPartyOverlay } from "@/components/watchparty/WatchPartyOverlay";
import { useWatchParty } from "@/hooks/useWatchParty";
import { useWatchPartyChat } from "@/hooks/useWatchPartyChat";
import { useAuth } from "@/hooks/useAuth";

export default function WatchParty() {
  const { partyCode } = useParams<{ partyCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    party,
    participants,
    loading,
    error,
    isHost,
    leaveParty,
    endParty,
    updatePlaybackState,
    syncAll,
  } = useWatchParty(partyCode);

  const { messages, sendMessage } = useWatchPartyChat(party?.id);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Sync guest playback to host state
  useEffect(() => {
    if (!party || isHost || !videoRef.current) return;

    const video = videoRef.current;

    // Sync play/pause
    if (party.is_playing && video.paused) {
      video.play().catch(() => {});
    } else if (!party.is_playing && !video.paused) {
      video.pause();
    }

    // Sync time if drift > 1.5 seconds
    const drift = Math.abs(video.currentTime - party.playback_time);
    if (drift > 1.5) {
      video.currentTime = party.playback_time;
    }
  }, [party?.is_playing, party?.playback_time, isHost]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current || !isHost) return;

    const video = videoRef.current;
    if (video.paused) {
      video.play();
      setLocalPlaying(true);
      updatePlaybackState(video.currentTime, true);
    } else {
      video.pause();
      setLocalPlaying(false);
      updatePlaybackState(video.currentTime, false);
    }
  }, [isHost, updatePlaybackState]);

  // Handle seek
  const handleSeek = useCallback((time: number) => {
    if (!videoRef.current || !isHost) return;

    videoRef.current.currentTime = time;
    setLocalTime(time);
    updatePlaybackState(time, localPlaying);
  }, [isHost, localPlaying, updatePlaybackState]);

  // Handle sync all
  const handleSyncAll = useCallback(() => {
    if (!videoRef.current || !isHost) return;
    syncAll(videoRef.current.currentTime, !videoRef.current.paused);
  }, [isHost, syncAll]);

  // Video time update
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    setLocalTime(videoRef.current.currentTime);

    // Host broadcasts position
    if (isHost) {
      updatePlaybackState(videoRef.current.currentTime, !videoRef.current.paused);
    }
  }, [isHost, updatePlaybackState]);

  // Video loaded
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);

    // If joining mid-party, seek to current position
    if (party && !isHost) {
      videoRef.current.currentTime = party.playback_time;
      if (party.is_playing) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [party, isHost]);

  // Redirect if party ended
  useEffect(() => {
    if (party?.status === 'ended') {
      navigate('/');
    }
  }, [party?.status, navigate]);

  if (loading) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="min-h-[var(--app-height)] bg-background flex flex-col items-center justify-center text-foreground gap-4">
        <p className="text-lg font-semibold">{error || "Party not found"}</p>
        <button 
          onClick={() => navigate('/')} 
          className="text-primary hover:underline"
        >
          Go back home
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Watch Party • {partyCode}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="fixed inset-0 bg-black">
        {/* Header */}
        <WatchPartyHeader
          partyCode={party.party_code}
          participantCount={participants.length}
          isHost={isHost}
          onLeave={leaveParty}
          onEnd={endParty}
        />

        {/* Video */}
        <video
          ref={videoRef}
          src={party.video?.video_url}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setLocalPlaying(true)}
          onPause={() => setLocalPlaying(false)}
          controls={false}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60" />

        {/* Party overlay */}
        <WatchPartyOverlay
          participants={participants}
          messages={messages}
          hostId={party.host_id}
          isHost={isHost}
          isPlaying={localPlaying}
          currentTime={localTime}
          duration={duration}
          currentUserId={user?.id}
          onSendMessage={sendMessage}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSyncAll={handleSyncAll}
        />
      </div>
    </>
  );
}
