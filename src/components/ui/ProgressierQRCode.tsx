// Progressier PWA Install QR Code Component
// Displays the official Progressier-generated QR code for app installation

import { PROGRESSIER_CONFIG } from "@/lib/progressierConfig";

interface ProgressierQRCodeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
  label?: string;
}

const sizeClasses = {
  sm: "w-24 h-24",
  md: "w-36 h-36",
  lg: "w-48 h-48",
};

export const ProgressierQRCode = ({ 
  size = "md", 
  className = "",
  showLabel = true,
  label = "Scan to install app"
}: ProgressierQRCodeProps) => {
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <img 
        src={PROGRESSIER_CONFIG.qrCodePath} 
        alt="Scan to install PSA Direct app" 
        className={`${sizeClasses[size]} object-contain`}
      />
      {showLabel && (
        <p className="text-xs text-muted-foreground text-center">{label}</p>
      )}
    </div>
  );
};

export default ProgressierQRCode;
