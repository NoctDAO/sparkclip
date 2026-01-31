import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-full flex items-center justify-between p-4 text-left">
      <div className="flex items-center gap-3">
        {theme === "dark" ? (
          <Moon className="w-5 h-5" />
        ) : theme === "light" ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Monitor className="w-5 h-5" />
        )}
        <div>
          <p className="font-medium">Theme</p>
          <p className="text-sm text-muted-foreground">
            Choose light, dark, or system
          </p>
        </div>
      </div>
      <Select value={theme} onValueChange={setTheme}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">Light</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="system">System</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
