import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
}

export function PhoneMockup({ children, className }: PhoneMockupProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Phone Frame */}
      <div className="relative w-[280px] h-[580px] bg-black rounded-[40px] p-[10px] shadow-2xl border-[3px] border-muted">
        {/* Dynamic Island / Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
        
        {/* Screen */}
        <div className="relative w-full h-full bg-black rounded-[30px] overflow-hidden">
          {/* Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-11 z-10 flex items-center justify-between px-6 pt-2">
            <span className="text-white text-xs font-medium">9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.01 21.49L23.64 7c-.45-.34-4.93-4-11.64-4C5.28 3 .81 6.66.36 7l11.63 14.49.01.01.01-.01z" />
              </svg>
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 4h-3V2h-4v2H7v18h10V4zm-6 16H9v-2h2v2zm0-4H9v-2h2v2zm0-4H9V10h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V10h2v2z" />
              </svg>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="absolute inset-0">
            {children}
          </div>
          
          {/* Bottom Navigation Bar (simulated) */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-end justify-center pb-2">
            <div className="flex items-center gap-8">
              <div className="w-6 h-6 rounded bg-white/20" />
              <div className="w-6 h-6 rounded bg-white/20" />
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xl font-bold">+</span>
              </div>
              <div className="w-6 h-6 rounded bg-white/20" />
              <div className="w-6 h-6 rounded bg-white/20" />
            </div>
          </div>
          
          {/* Home Indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/50 rounded-full z-20" />
        </div>
      </div>
    </div>
  );
}
