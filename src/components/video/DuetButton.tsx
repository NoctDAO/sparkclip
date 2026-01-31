import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface DuetButtonProps {
  videoId: string;
  allowDuets?: boolean;
  isOwnVideo?: boolean;
}

export function DuetButton({ videoId, allowDuets = true, isOwnVideo = false }: DuetButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleClick = () => {
    if (!user) {
      toast({ title: "Please sign in to create duets", variant: "destructive" });
      return;
    }

    if (!allowDuets && !isOwnVideo) {
      toast({ title: "Duets are disabled for this video", variant: "destructive" });
      return;
    }

    navigate(`/duet/${videoId}`);
  };

  // Don't show if duets are disabled (unless it's your own video)
  if (!allowDuets && !isOwnVideo) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-0.5"
    >
      <div className="p-2 rounded-full backdrop-blur-sm bg-background/20">
        <Users className="w-6 h-6 text-foreground drop-shadow-md" />
      </div>
      <span className="text-[11px] font-medium text-foreground/90 drop-shadow-sm">Duet</span>
    </button>
  );
}
