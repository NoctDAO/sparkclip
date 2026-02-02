import { ArrowLeft, Copy, Check, Users, LogOut, XCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WatchPartyHeaderProps {
  partyCode: string;
  participantCount: number;
  isHost: boolean;
  onLeave: () => void;
  onEnd: () => void;
}

export function WatchPartyHeader({ 
  partyCode, 
  participantCount, 
  isHost, 
  onLeave, 
  onEnd 
}: WatchPartyHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/party/${partyCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Party link copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleLeave = () => {
    onLeave();
    navigate(-1);
  };

  const handleEnd = () => {
    onEnd();
    navigate(-1);
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg tracking-wider">
              {partyCode}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <Users className="w-3 h-3" />
            <span>{participantCount} watching</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isHost ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                className="gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                End Party
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Watch Party?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will end the party for all participants. They will no longer be able to watch together.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleEnd}>
                  End Party
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleLeave}
            className="gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </Button>
        )}
      </div>
    </header>
  );
}
