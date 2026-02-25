import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPSWLoginUrl } from "@/lib/qrCodeUtils";
import { fetchOfficeNumber, DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";

interface ApprovalEmailPreviewProps {
  firstName: string;
  lastName?: string;
  pswNumber?: number | null;
}

const ApprovalEmailPreview = ({ firstName, lastName, pswNumber }: ApprovalEmailPreviewProps) => {
  const loginUrl = getPSWLoginUrl();
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);

  useEffect(() => {
    fetchOfficeNumber().then(setOfficeNumber);
  }, []);

  return (
    <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            📧 Email Preview
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Will be sent on approval
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Header */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Subject:</p>
          <p className="font-medium">🎉 Welcome to PSA Direct - You're Approved!</p>
        </div>

        {/* Email Body Preview */}
        <div className="bg-white rounded-lg p-4 shadow-sm space-y-4">
          <p>Hi <strong>{firstName}</strong>,</p>
          
          <p>
            Welcome to the team! <strong>You are now approved to accept jobs in the Toronto/GTA area.</strong>
          </p>

          {/* PSW Details Block */}
          {pswNumber && (
            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4">
              <h3 className="font-semibold text-green-800 mb-2">Your PSA Direct Details</h3>
              <p className="text-sm"><strong>PSW Number:</strong> <span className="text-green-600 font-bold text-lg">PSW-{pswNumber}</span></p>
              <p className="text-sm"><strong>Name:</strong> {firstName} {lastName}</p>
              <p className="text-sm"><strong>Status:</strong> ✅ Approved / Activated</p>
            </div>
          )}

          {/* QR Code Section with Logo Overlay - Now links to login */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
            <h3 className="font-semibold text-green-800 mb-3">📱 Login to Start</h3>
            <p className="text-sm text-green-700 mb-4">
              Scan to go directly to login:
            </p>
            
            <div className="inline-block bg-white p-4 rounded-lg shadow-md">
              <QRCodeSVG 
                value={loginUrl}
                size={140}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#16a34a"
                imageSettings={{
                  src: "/logo-192.png",
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
            </div>
            
            <p className="text-xs text-green-600 mt-3">
              <strong>Tip:</strong> After logging in, tap "Add to Home Screen" to install the app!
            </p>
          </div>

          {/* Warning Section */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
            <p className="text-sm font-medium text-amber-800">⚠️ Professional Standards</p>
            <p className="text-xs text-amber-700 mt-1">
              Any missed or late shifts will result in immediate removal from the platform.
            </p>
          </div>

          {/* Office Contact */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm">📞 Office: <strong className="text-green-600">{officeNumber}</strong></p>
            <p className="text-xs text-muted-foreground">Use for all follow-ups</p>
          </div>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          This email will be sent automatically when you approve this PSW
        </p>
      </CardContent>
    </Card>
  );
};

export default ApprovalEmailPreview;
