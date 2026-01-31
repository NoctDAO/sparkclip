import { Smartphone } from "lucide-react";
import { useUiSafeMargin, UiMarginSize } from "@/hooks/useUiSafeMargin";
import { cn } from "@/lib/utils";

const LABELS: Record<UiMarginSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export function UiMarginSetting() {
  const { marginSize, setSize, options } = useUiSafeMargin();

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Smartphone className="w-5 h-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">UI Safe Margin</p>
          <p className="text-xs text-muted-foreground">
            Adjust spacing above bottom nav
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
        {options.map((size) => (
          <button
            key={size}
            onClick={() => setSize(size)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              marginSize === size
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {LABELS[size]}
          </button>
        ))}
      </div>
    </div>
  );
}
