import { useState } from "react";
import { Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InviteSheet } from "@/components/watchparty/InviteSheet";
import { useWatchParty } from "@/hooks/useWatchParty";
import { useAuth } from "@/hooks/useAuth";

interface StartWatchPartyButtonProps {
  videoId: string;
  variant?: "icon" | "button";
}

export function StartWatchPartyButton({ 
  videoId, 
  variant = "icon" 
}: StartWatchPartyButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createParty } = useWatchParty();
  
  const [showConfirm, setShowConfirm] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleStart = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setCreating(true);
    const code = await createParty(videoId);
    setCreating(false);

    if (code) {
      setPartyCode(code);
      setShowConfirm(false);
      setShowInvite(true);
    }
  };

  const handleGoToParty = () => {
    if (partyCode) {
      navigate(`/party/${partyCode}`);
    }
  };

  if (variant === "icon") {
    return (
      <>
        <button 
          onClick={() => setShowConfirm(true)}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100"
        >
          <div className="p-2 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/30 transition-colors duration-150">
            <Users className="w-6 h-6 text-foreground drop-shadow-md" />
          </div>
          <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
            Party
          </span>
        </button>

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Watch Party?</DialogTitle>
              <DialogDescription>
                Create a watch party to watch this video together with friends in real-time. 
                You'll control playback and everyone will be synced.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleStart} disabled={creating}>
                {creating ? "Creating..." : "Start Party"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {partyCode && (
          <InviteSheet
            open={showInvite}
            onOpenChange={(open) => {
              setShowInvite(open);
              if (!open) handleGoToParty();
            }}
            partyCode={partyCode}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Button onClick={() => setShowConfirm(true)} className="gap-2">
        <Users className="w-4 h-4" />
        Start Watch Party
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Watch Party?</DialogTitle>
            <DialogDescription>
              Create a watch party to watch this video together with friends in real-time. 
              You'll control playback and everyone will be synced.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={creating}>
              {creating ? "Creating..." : "Start Party"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {partyCode && (
        <InviteSheet
          open={showInvite}
          onOpenChange={(open) => {
            setShowInvite(open);
            if (!open) handleGoToParty();
          }}
          partyCode={partyCode}
        />
      )}
    </>
  );
}
