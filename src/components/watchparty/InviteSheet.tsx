import { Copy, Check, QrCode, MessageCircle } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QRCode } from "@/components/ui/qr-code";
import { useToast } from "@/hooks/use-toast";

interface InviteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyCode: string;
}

export function InviteSheet({ open, onOpenChange, partyCode }: InviteSheetProps) {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = `${window.location.origin}/party/${partyCode}`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(partyCode);
    setCopiedCode(true);
    toast({ title: "Party code copied!" });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast({ title: "Invite link copied!" });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNativeShare = async () => {
    if ("share" in navigator) {
      try {
        await navigator.share({
          title: "Join my Watch Party!",
          text: `Watch with me! Use code: ${partyCode}`,
          url: shareUrl,
        });
      } catch (e) {
        // User cancelled
      }
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-center">
          <SheetTitle>Invite Friends</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Party Code */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Party Code</p>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-3 bg-muted px-6 py-3 rounded-xl hover:bg-muted/80 transition-colors"
            >
              <span className="text-3xl font-bold tracking-[0.3em]">
                {partyCode}
              </span>
              {copiedCode ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <Copy className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* QR Code */}
          <div className="p-4 bg-white rounded-xl shadow-md">
            <QRCode value={shareUrl} size={160} className="rounded-lg" />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button onClick={handleCopyLink} variant="secondary" className="gap-2">
              {copiedLink ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Copy Invite Link
            </Button>

            {"share" in navigator && (
              <Button onClick={handleNativeShare} variant="secondary" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Share via...
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center max-w-[250px]">
            Friends can join using the code or by scanning the QR code
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
