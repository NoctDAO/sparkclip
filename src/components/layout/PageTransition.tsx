import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={cn("page-enter", className)}>
      {children}
    </div>
  );
}
