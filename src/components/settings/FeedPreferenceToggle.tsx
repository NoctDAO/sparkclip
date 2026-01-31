import { Home } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFeedPreference, FeedTab } from "@/hooks/useFeedPreference";

export function FeedPreferenceToggle() {
  const { defaultTab, setDefaultTab } = useFeedPreference();

  return (
    <div className="w-full flex items-center justify-between p-4 text-left">
      <div className="flex items-center gap-3">
        <Home className="w-5 h-5" />
        <div>
          <p className="font-medium">Default feed</p>
          <p className="text-sm text-muted-foreground">
            Tab shown when opening the app
          </p>
        </div>
      </div>
      <Select value={defaultTab} onValueChange={(v) => setDefaultTab(v as FeedTab)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="foryou">For You</SelectItem>
          <SelectItem value="following">Following</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
