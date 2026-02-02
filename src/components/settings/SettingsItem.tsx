import { ChevronRight } from "lucide-react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsItemProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
}

export function SettingsItem({
  icon: Icon,
  label,
  description,
  onClick,
  rightElement,
  destructive = false,
}: SettingsItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 transition-all duration-200 text-left group",
        "hover:bg-secondary/50 active:bg-secondary/70",
        destructive ? "text-destructive" : "text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200",
            destructive 
              ? "bg-destructive/10 text-destructive group-hover:bg-destructive/20" 
              : "bg-secondary text-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <p className="font-medium">{label}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {rightElement || (onClick && (
        <ChevronRight className={cn(
          "w-5 h-5 transition-transform duration-200",
          destructive ? "text-destructive/50" : "text-muted-foreground group-hover:translate-x-0.5 group-hover:text-foreground"
        )} />
      ))}
    </button>
  );
}