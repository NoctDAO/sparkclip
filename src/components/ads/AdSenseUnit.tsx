import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdSenseUnitProps {
  clientId: string;
  slotId: string;
  isActive: boolean;
  bottomNavVisible?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdSenseUnit({
  clientId,
  slotId,
  isActive,
  bottomNavVisible = true,
}: AdSenseUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const [adBlocked, setAdBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isActive || loaded) return;

    const loadAdSense = async () => {
      try {
        // Check if AdSense script already loaded
        if (!document.querySelector('script[src*="adsbygoogle"]')) {
          const script = document.createElement("script");
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
          script.async = true;
          script.crossOrigin = "anonymous";
          
          script.onerror = () => {
            setAdBlocked(true);
          };

          document.head.appendChild(script);
        }

        // Wait for script to load
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Initialize the ad
        if (window.adsbygoogle && adRef.current) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            setLoaded(true);
          } catch (e) {
            setAdBlocked(true);
          }
        }
      } catch (error) {
        console.error("Failed to load AdSense:", error);
        setAdBlocked(true);
      }
    };

    loadAdSense();
  }, [isActive, clientId, loaded]);

  if (adBlocked) {
    // Graceful fallback when ads are blocked
    return (
      <div className="relative h-full w-full bg-gradient-to-b from-muted to-background flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-muted-foreground text-sm">
            Content temporarily unavailable
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-full w-full bg-black flex items-center justify-center"
      )}
    >
      {/* Sponsored Badge */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="secondary" className="bg-black/60 text-white border-0 backdrop-blur-sm">
          Sponsored
        </Badge>
      </div>

      {/* AdSense Container */}
      <div
        ref={adRef}
        className={cn(
          "w-full h-full flex items-center justify-center",
          bottomNavVisible ? "pb-16" : ""
        )}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            maxHeight: "calc(100vh - 120px)",
          }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>

      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-pulse text-white/50 text-sm">Loading...</div>
        </div>
      )}
    </div>
  );
}
