import { Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavBarPreference } from "@/hooks/useNavBarPreference";

export function NavBarToggle() {
  const { autoHideEnabled, toggleAutoHide } = useNavBarPreference();

  return (
    <button
      onClick={toggleAutoHide}
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
    >
      <div className="flex items-center gap-3">
        <Eye className="w-5 h-5" />
        <div>
          <p className="font-medium">Auto-hide navigation</p>
          <p className="text-sm text-muted-foreground">
            Hide bars when scrolling videos
          </p>
        </div>
      </div>
      <Switch
        checked={autoHideEnabled}
        onCheckedChange={toggleAutoHide}
        onClick={(e) => e.stopPropagation()}
      />
    </button>
  );
}
