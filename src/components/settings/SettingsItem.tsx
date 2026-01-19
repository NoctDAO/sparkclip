import { ChevronRight } from "lucide-react";
import { LucideIcon } from "lucide-react";

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
      className={`w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left ${
        destructive ? "text-destructive" : "text-foreground"
      }`}
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5" />}
        <div>
          <p className="font-medium">{label}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {rightElement || (onClick && <ChevronRight className="w-5 h-5 text-muted-foreground" />)}
    </button>
  );
}
