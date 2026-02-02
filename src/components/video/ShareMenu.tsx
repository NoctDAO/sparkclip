import { useState } from "react";
import { Share2, Copy, QrCode, ExternalLink, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QRCode } from "@/components/ui/qr-code";
import { useToast } from "@/hooks/use-toast";
import { useWatchParty } from "@/hooks/useWatchParty";
import { useAuth } from "@/hooks/useAuth";
import { InviteSheet } from "@/components/watchparty/InviteSheet";

interface ShareMenuProps {
  videoId: string;
  shareCount: number;
}

export function ShareMenu({ videoId, shareCount }: ShareMenuProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createParty } = useWatchParty();
  
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [partyCode, setPartyCode] = useState<string | null>(null);
  const [creatingParty, setCreatingParty] = useState(false);

  const shareUrl = `${window.location.origin}/video/${videoId}`;

  const handleStartParty = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setCreatingParty(true);
    const code = await createParty(videoId);
    setCreatingParty(false);

    if (code) {
      setPartyCode(code);
      setShowInviteSheet(true);
    }
  };

  const handleGoToParty = () => {
    if (partyCode) {
      navigate(`/party/${partyCode}`);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link copied to clipboard" });
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: "Check out this video!",
        url: shareUrl,
      });
    } catch (error) {
      // User cancelled or share not supported
      if ((error as Error).name !== "AbortError") {
        handleCopyLink();
      }
    }
  };

  const handleSaveQR = () => {
    // Create a canvas from the QR code and download
    const svg = document.querySelector("#qr-code-svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);

      const link = document.createElement("a");
      link.download = `video-qr-${videoId.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
    toast({ title: "QR code saved" });
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-100">
            <div className="p-2 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/30 transition-colors duration-150">
              <Share2 className="w-6 h-6 text-foreground drop-shadow-md" />
            </div>
            <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">
              {formatCount(shareCount)}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy link
          </DropdownMenuItem>
          {"share" in navigator && (
            <DropdownMenuItem onClick={handleNativeShare}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Share...
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setShowQRDialog(true)}>
            <QrCode className="w-4 h-4 mr-2" />
            Show QR code
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleStartParty} disabled={creatingParty}>
            <Users className="w-4 h-4 mr-2" />
            {creatingParty ? "Creating..." : "Start Watch Party"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to watch</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-xl shadow-lg">
              <QRCode value={shareUrl} size={200} className="rounded-lg" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-[250px]">
              Scan this QR code with your phone camera to open the video
            </p>
            <div className="flex gap-2 w-full">
              <Button variant="secondary" className="flex-1" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy link
              </Button>
              <Button variant="secondary" className="flex-1" onClick={handleSaveQR}>
                <QrCode className="w-4 h-4 mr-2" />
                Save QR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {partyCode && (
        <InviteSheet
          open={showInviteSheet}
          onOpenChange={(open) => {
            setShowInviteSheet(open);
            if (!open) handleGoToParty();
          }}
          partyCode={partyCode}
        />
      )}
    </>
  );
}
