// RevealField - PHIPA-compliant masked data display with click-to-reveal
// Used for banking info, addresses, and other sensitive data

import { useState } from "react";
import { Eye, EyeOff, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logSecurityEvent } from "@/lib/securityStore";
import { useAuth } from "@/contexts/AuthContext";

interface RevealFieldProps {
  maskedValue: string;
  revealedValue?: string;
  onReveal?: () => Promise<string | null>;
  label?: string;
  dataType: "banking" | "health" | "address" | "police_check" | "payroll";
  targetId?: string;
  targetDescription?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const RevealField = ({
  maskedValue,
  revealedValue,
  onReveal,
  label,
  dataType,
  targetId,
  targetDescription,
  className,
  size = "md",
}: RevealFieldProps) => {
  const { user } = useAuth();
  const [isRevealed, setIsRevealed] = useState(false);
  const [localRevealedValue, setLocalRevealedValue] = useState<string | null>(revealedValue || null);
  const [isLoading, setIsLoading] = useState(false);

  const handleReveal = async () => {
    if (isRevealed) {
      // Hide the value
      setIsRevealed(false);
      return;
    }

    // If we have the revealed value already, just show it
    if (revealedValue || localRevealedValue) {
      setIsRevealed(true);
      
      // Log the access
      if (user) {
        logSecurityEvent(
          user.id,
          user.name,
          user.role as "admin" | "psw" | "client",
          "view",
          dataType,
          targetId,
          targetDescription || `Revealed ${dataType} field`
        );
      }
      return;
    }

    // If we need to fetch the revealed value
    if (onReveal) {
      setIsLoading(true);
      try {
        const revealed = await onReveal();
        if (revealed) {
          setLocalRevealedValue(revealed);
          setIsRevealed(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const sizeClasses = {
    sm: "text-xs py-1 px-2",
    md: "text-sm py-2 px-3",
    lg: "text-base py-3 px-4",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>{label}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div 
          className={cn(
            "flex-1 bg-muted rounded-md font-mono flex items-center gap-2",
            sizeClasses[size]
          )}
        >
          <Shield className={cn("text-muted-foreground", iconSizes[size])} />
          <span className={cn(isRevealed ? "text-foreground" : "text-muted-foreground")}>
            {isRevealed ? (localRevealedValue || revealedValue || maskedValue) : maskedValue}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReveal}
          disabled={isLoading}
          className="shrink-0"
          title={isRevealed ? "Hide" : "Click to reveal"}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          ) : isRevealed ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
