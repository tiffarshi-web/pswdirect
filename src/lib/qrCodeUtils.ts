// QR Code Utilities for Email Embedding
// Generates QR codes and data URLs for email embedding

import { renderToString } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { createElement } from "react";

// Generate QR code as a Base64 data URL for embedding in emails
export const generateQRCodeDataUrl = async (url: string): Promise<string> => {
  // Create SVG string from QRCodeSVG component
  const svgString = renderToString(
    createElement(QRCodeSVG, {
      value: url,
      size: 180,
      level: "H",
      includeMargin: true,
      bgColor: "#ffffff",
      fgColor: "#16a34a",
    })
  );
  
  // Convert SVG to base64 data URL
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${base64}`;
};

// Get the Client Portal URL
export const getClientPortalUrl = (): string => {
  const publishedUrl = "https://pswdirect.lovable.app";
  return `${publishedUrl}/client-login`;
};

// Get the PWA install URL
export const getPWAInstallUrl = (): string => {
  // Use published URL in production, otherwise use current origin
  const publishedUrl = "https://pswdirect.lovable.app";
  const installPath = "/install";
  
  // In production, always use the published URL
  if (typeof window !== "undefined" && window.location.hostname.includes("lovable.app")) {
    return `${publishedUrl}${installPath}`;
  }
  
  // Fallback for development
  return `${window.location.origin}${installPath}`;
};

// Get PSW login URL directly
export const getPSWLoginUrl = (): string => {
  const publishedUrl = "https://pswdirect.lovable.app";
  return `${publishedUrl}/psw-login`;
};

// Generate QR code as a simple text placeholder for email
// In a real implementation, this would call an edge function to generate the actual image
export const generateQRCodePlaceholder = (): string => {
  const url = getPWAInstallUrl();
  return `[QR Code: ${url}]`;
};

// Format the PSW approval email with QR code section
export const formatApprovalEmailWithQR = (
  firstName: string,
  officeNumber: string
): { subject: string; body: string } => {
  const installUrl = getPWAInstallUrl();
  
  const subject = "🎉 Welcome to PSW Direct - You're Approved!";
  
  const body = `Hi ${firstName},

Welcome to the team! You are now approved to accept jobs in the Toronto/GTA area.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 INSTALL THE APP

To make it easy to claim jobs, scan the QR code below to install our mobile portal directly onto your phone:

[QR CODE PLACEHOLDER - Install URL: ${installUrl}]

After scanning:
• iOS: Tap Share → Add to Home Screen
• Android: Tap ⋮ Menu → Install App

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANT - PROFESSIONAL STANDARDS

By accepting shifts, you agree to our professional standards:

• Arrive on time for every scheduled visit
• Complete all tasks as outlined in the care sheet
• Communicate any issues immediately to the office

❌ Any missed or late shifts will result in immediate removal from the platform.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 CONTACT

Use the office number for ALL follow-ups and communication:
${officeNumber}

Do NOT exchange personal contact information with clients.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Welcome aboard! We're excited to have you on the team.

Best regards,
The PSW Direct Team

---
PSW Direct | Professional Care Services
Office: ${officeNumber}
Web: https://pswdirect.lovable.app`;

  return { subject, body };
};

// Format booking confirmation email with Client Portal QR code
export const formatBookingConfirmationWithQR = (
  clientName: string,
  bookingId: string,
  date: string,
  time: string,
  services: string[],
  officeNumber: string,
  qrCodeDataUrl?: string
): { subject: string; body: string; htmlBody: string } => {
  const clientPortalUrl = getClientPortalUrl();
  
  const subject = `Booking Confirmed - ${bookingId}`;
  
  const body = `Hi ${clientName},

Your care booking has been confirmed!

📋 Booking ID: ${bookingId}
📅 Date: ${date}
⏰ Time: ${time}
🏥 Services: ${services.join(", ")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 TRACK YOUR CARE

Scan the QR code below to access your Client Portal:
${clientPortalUrl}

• Track your care status
• View your caregiver's first name
• Re-book services instantly
• Access your service history

For the best experience, tap "Add to Home Screen" when the app opens.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Call our office at ${officeNumber}

Thank you for choosing PSW Direct!

---
PSW Direct | Professional Care Services
Office: ${officeNumber}
Web: https://pswdirect.lovable.app`;

  // Build QR code section for HTML
  const qrCodeSection = qrCodeDataUrl 
    ? `<div style="margin: 16px 0;">
        <div style="background: white; display: inline-block; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <img src="${qrCodeDataUrl}" alt="QR Code to access Client Portal" width="140" height="140" style="display: block;">
        </div>
        <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">Scan to access your portal</p>
      </div>`
    : '';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #16a34a; margin: 0;">✅ Booking Confirmed!</h1>
  </div>
  
  <p>Hi <strong>${clientName}</strong>,</p>
  
  <p>Your care booking has been confirmed.</p>
  
  <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <h3 style="margin: 0 0 12px 0; color: #16a34a;">Booking Details</h3>
    <p style="margin: 4px 0;"><strong>📋 Booking ID:</strong> ${bookingId}</p>
    <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${date}</p>
    <p style="margin: 4px 0;"><strong>⏰ Time:</strong> ${time}</p>
    <p style="margin: 4px 0;"><strong>🏥 Services:</strong> ${services.join(", ")}</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <h2 style="color: #166534; margin: 0 0 16px 0;">📱 Track Your Care</h2>
    <p style="margin: 0 0 16px 0;">Scan this code or click below to access your Client Portal:</p>
    
    ${qrCodeSection}
    
    <div style="margin: 16px 0;">
      <a href="${clientPortalUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Open Client Portal →
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin: 16px 0 0 0;">
      <strong>Tip:</strong> For the best experience, tap "Add to Home Screen" when the app opens.
    </p>
  </div>
  
  <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; font-size: 14px;">
      <strong>In your portal you can:</strong>
    </p>
    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #666;">
      <li>Track your care status</li>
      <li>View your caregiver's first name</li>
      <li>Re-book services instantly</li>
      <li>Access your service history</li>
    </ul>
  </div>
  
  <p style="color: #666; font-size: 14px;">
    Questions? Call our office at <strong>${officeNumber}</strong>
  </p>
  
  <p style="color: #666;">
    Thank you for choosing PSW Direct!<br>
    <strong>The PSW Direct Team</strong>
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
    PSW Direct | Professional Care Services<br>
    Office: ${officeNumber} | <a href="https://pswdirect.lovable.app" style="color: #9ca3af;">pswdirect.lovable.app</a>
  </p>
  
</body>
</html>
`;

  return { subject, body, htmlBody };
};

// Generate HTML email content with embedded QR code
export const formatApprovalEmailHTML = (
  firstName: string,
  officeNumber: string,
  qrCodeDataUrl: string
): string => {
  const installUrl = getPWAInstallUrl();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to PSW Direct</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #16a34a; margin: 0;">🎉 Welcome to the Team!</h1>
  </div>
  
  <p>Hi <strong>${firstName}</strong>,</p>
  
  <p>Welcome to the team! <strong>You are now approved to accept jobs in the Toronto/GTA area.</strong></p>
  
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <h2 style="color: #166534; margin: 0 0 16px 0;">📱 Install the App</h2>
    <p style="margin: 0 0 16px 0;">To make it easy to claim jobs, scan the QR code below to install our mobile portal directly onto your phone:</p>
    
    <div style="background: white; display: inline-block; padding: 16px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <img src="${qrCodeDataUrl}" alt="QR Code to install PSW Direct app" width="180" height="180" style="display: block;">
    </div>
    
    <p style="font-size: 14px; color: #666; margin: 16px 0 0 0;">
      <strong>iOS:</strong> Tap Share → Add to Home Screen<br>
      <strong>Android:</strong> Tap ⋮ Menu → Install App
    </p>
    
    <p style="margin: 16px 0 0 0;">
      <a href="${installUrl}" style="color: #16a34a; font-weight: bold;">Or click here to install →</a>
    </p>
  </div>
  
  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
    <h3 style="color: #b45309; margin: 0 0 8px 0;">⚠️ Professional Standards</h3>
    <p style="margin: 0;">By accepting shifts, you agree to arrive on time and complete all scheduled visits.</p>
    <p style="margin: 8px 0 0 0; font-weight: bold; color: #b45309;">❌ Any missed or late shifts will result in immediate removal from the platform.</p>
  </div>
  
  <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <h3 style="margin: 0 0 8px 0;">📞 Office Contact</h3>
    <p style="margin: 0;">Use the office number for ALL follow-ups:</p>
    <p style="font-size: 18px; font-weight: bold; color: #16a34a; margin: 8px 0 0 0;">${officeNumber}</p>
  </div>
  
  <p>Welcome aboard! We're excited to have you on the team.</p>
  
  <p style="color: #666;">
    Best regards,<br>
    <strong>The PSW Direct Team</strong>
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
    PSW Direct | Professional Care Services<br>
    Office: ${officeNumber} | <a href="https://pswdirect.lovable.app" style="color: #9ca3af;">pswdirect.lovable.app</a>
  </p>
  
</body>
</html>
`;
};