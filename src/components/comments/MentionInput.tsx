import { useState, useEffect, useRef, useCallback } from "react";
import { Send, X, AtSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Profile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  replyingTo?: { username: string; onCancel: () => void } | null;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Add a comment...",
  disabled = false,
  loading = false,
  replyingTo,
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect @ mentions while typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    
    onChange(newValue);

    // Check for @ mention
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const start = cursorPos - query.length - 1;
      setMentionQuery(query);
      setMentionStart(start);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStart(-1);
    }
  };

  // Search for users when mention query changes
  useEffect(() => {
    if (!mentionQuery || mentionQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    const searchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .or(`username.ilike.%${mentionQuery}%,display_name.ilike.%${mentionQuery}%`)
        .limit(5);

      if (data) {
        setSuggestions(data);
      }
    };

    const debounce = setTimeout(searchUsers, 200);
    return () => clearTimeout(debounce);
  }, [mentionQuery]);

  // Insert selected mention
  const insertMention = useCallback((profile: Profile) => {
    if (!profile.username || mentionStart === -1) return;

    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(mentionStart + mentionQuery.length + 1);
    const newValue = `${beforeMention}@${profile.username} ${afterMention}`;

    onChange(newValue);
    setShowSuggestions(false);
    setMentionQuery("");
    setMentionStart(-1);
    inputRef.current?.focus();
  }, [value, mentionStart, mentionQuery, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showSuggestions) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      {/* Reply indicator */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-t-lg">
          <span className="text-sm text-muted-foreground">
            Replying to <span className="text-foreground">@{replyingTo.username}</span>
          </span>
          <button
            onClick={replyingTo.onCancel}
            className="ml-auto text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mention suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {suggestions.map((profile) => (
            <button
              key={profile.user_id}
              onClick={() => insertMention(profile)}
              className="flex items-center gap-3 w-full p-3 hover:bg-secondary transition-colors text-left"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-foreground text-xs">
                  {(profile.display_name || profile.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile.display_name || profile.username}
                </p>
                {profile.username && (
                  <p className="text-xs text-muted-foreground truncate">
                    @{profile.username}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || loading}
            className={cn(
              "flex-1 bg-secondary border-none text-foreground placeholder:text-muted-foreground pr-10",
              replyingTo && "rounded-t-none"
            )}
          />
          <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <Button
          type="button"
          size="icon"
          onClick={onSubmit}
          disabled={disabled || !value.trim() || loading}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
