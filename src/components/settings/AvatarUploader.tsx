import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploaderProps {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string | null;
  onAvatarChange: (url: string) => void;
}

export function AvatarUploader({
  userId,
  currentAvatarUrl,
  displayName,
  onAvatarChange,
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to storage
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.webp`]);

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Add cache-busting parameter
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      onAvatarChange(urlWithCacheBust);

      toast({
        title: "Avatar updated",
        description: "Your profile photo has been changed",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Could not upload avatar",
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar className="w-24 h-24 border-2 border-foreground">
          <AvatarImage src={previewUrl || currentAvatarUrl || undefined} />
          <AvatarFallback className="bg-secondary text-foreground text-2xl">
            {(displayName || "U")[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full">
            <Loader2 className="w-8 h-8 animate-spin text-foreground" />
          </div>
        )}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background"
        >
          <Camera className="w-4 h-4 text-primary-foreground" />
        </button>
      </div>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="mt-3 text-primary font-semibold text-sm"
      >
        Change photo
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
