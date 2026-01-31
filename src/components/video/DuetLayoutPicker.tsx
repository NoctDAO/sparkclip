import { cn } from "@/lib/utils";
import type { DuetLayout } from "@/hooks/useDuetRecording";

interface DuetLayoutPickerProps {
  value: DuetLayout;
  onChange: (layout: DuetLayout) => void;
}

const layouts: { value: DuetLayout; label: string; icon: React.ReactNode }[] = [
  {
    value: "side-by-side",
    label: "Side by Side",
    icon: (
      <div className="w-8 h-12 flex border border-current rounded overflow-hidden">
        <div className="w-1/2 bg-current/30" />
        <div className="w-1/2 bg-current/60" />
      </div>
    ),
  },
  {
    value: "top-bottom",
    label: "Top & Bottom",
    icon: (
      <div className="w-8 h-12 flex flex-col border border-current rounded overflow-hidden">
        <div className="h-1/2 bg-current/30" />
        <div className="h-1/2 bg-current/60" />
      </div>
    ),
  },
  {
    value: "picture-in-picture",
    label: "Picture in Picture",
    icon: (
      <div className="w-8 h-12 relative border border-current rounded overflow-hidden bg-current/30">
        <div className="absolute bottom-1 right-1 w-3 h-4 bg-current/60 rounded-sm" />
      </div>
    ),
  },
];

export function DuetLayoutPicker({ value, onChange }: DuetLayoutPickerProps) {
  return (
    <div className="flex gap-4 p-2">
      {layouts.map((layout) => (
        <button
          key={layout.value}
          onClick={() => onChange(layout.value)}
          className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-lg transition-colors",
            value === layout.value
              ? "bg-primary/20 text-primary"
              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
          )}
        >
          {layout.icon}
          <span className="text-xs font-medium">{layout.label}</span>
        </button>
      ))}
    </div>
  );
}
