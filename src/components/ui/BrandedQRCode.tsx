// Branded QR Code Component with PSW Direct logo overlay
// Uses high error correction to allow 30% logo coverage

import { QRCodeSVG } from "qrcode.react";

interface BrandedQRCodeProps {
  url: string;
  size?: number;
  logoSize?: number;
  className?: string;
}

export const BrandedQRCode = ({ 
  url, 
  size = 180, 
  logoSize = 40,
  className = "" 
}: BrandedQRCodeProps) => {
  return (
    <div className={`bg-white p-3 rounded-lg shadow-sm inline-block ${className}`}>
      <QRCodeSVG
        value={url}
        size={size}
        level="H" // High error correction (30%) to allow logo overlay
        includeMargin={true}
        bgColor="#ffffff"
        fgColor="#16a34a"
        imageSettings={{
          src: "/logo-192.png",
          height: logoSize,
          width: logoSize,
          excavate: true, // Creates white space for logo
        }}
      />
    </div>
  );
};

export default BrandedQRCode;