// QR Code Utilities for Email Embedding
// Uses Progressier's hosted QR code for PWA installation
// Generates QR codes with PSW Direct logo overlay for other uses

import { renderToString } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { createElement } from "react";
import { getDomainConfig } from "./domainConfig";

// PSW Direct logo path for QR code overlay
const PSW_LOGO_PATH = "/logo-192.png";

// Progressier QR code - hosted image for emails (avoids base64 payload bloat)
export const PROGRESSIER_QR_CODE_PATH = "/progressier-qr.png";

// Get full URL to the Progressier QR code for email embedding
export const getProgressierQRCodeUrl = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}${PROGRESSIER_QR_CODE_PATH}`;
};

// Generate QR code with logo overlay as a Base64 data URL for embedding in emails
export const generateQRCodeDataUrl = async (url: string): Promise<string> => {
  // Create SVG string from QRCodeSVG component with logo overlay settings
  const svgString = renderToString(
    createElement(QRCodeSVG, {
      value: url,
      size: 180,
      level: "H", // High error correction (30%) to allow logo overlay
      includeMargin: true,
      bgColor: "#ffffff",
      fgColor: "#16a34a",
      imageSettings: {
        src: PSW_LOGO_PATH,
        height: 40,
        width: 40,
        excavate: true, // Cuts out space for logo
      },
    })
  );
  
  // Convert SVG to base64 data URL
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${base64}`;
};

// Generate QR code without logo (for simpler use cases)
export const generateSimpleQRCodeDataUrl = async (url: string): Promise<string> => {
  const svgString = renderToString(
    createElement(QRCodeSVG, {
      value: url,
      size: 180,
      level: "M",
      includeMargin: true,
      bgColor: "#ffffff",
      fgColor: "#16a34a",
    })
  );
  
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${base64}`;
};

// Get the Client Portal URL - uses configurable domain
export const getClientPortalUrl = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/client-login`;
};

// Get the Client Portal URL with deep link to a specific booking
export const getClientPortalDeepLink = (bookingId?: string): string => {
  const { baseUrl } = getDomainConfig();
  const portalUrl = `${baseUrl}/client-portal`;
  return bookingId ? `${portalUrl}?order=${bookingId}` : portalUrl;
};

// Get the PWA install URL for clients
export const getClientInstallUrl = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/install?type=client`;
};

// Get the PWA install URL for PSWs
export const getPWAInstallUrl = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/install`;
};

// Get PSW login URL directly - uses configurable domain for QR codes
export const getPSWLoginUrl = (): string => {
  const { baseUrl } = getDomainConfig();
  return `${baseUrl}/psw-login`;
};

// Generate QR code as a simple text placeholder for email
// In a real implementation, this would call an edge function to generate the actual image
export const generateQRCodePlaceholder = (): string => {
  const url = getPWAInstallUrl();
  return `[QR Code: ${url}]`;
};

// Format the PSA approval email with QR code section
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
Web: ${getDomainConfig().displayName}`;

  return { subject, body };
};

// Format booking confirmation email with Client Portal link and Install App QR code
// bookingCode: the CDT-###### human-facing code
export const formatBookingConfirmationWithQR = (
  clientName: string,
  bookingCode: string,
  date: string,
  time: string,
  services: string[],
  officeNumber: string
): { subject: string; body: string; htmlBody: string } => {
  const clientPortalUrl = getClientPortalDeepLink(bookingCode);
  const installUrl = getClientInstallUrl();
  const progressierQRUrl = getProgressierQRCodeUrl();
  
  const subject = `Booking Confirmed - ${bookingCode}`;
  
  const body = `Hi ${clientName},

Your care booking has been confirmed!

📋 Booking Code: ${bookingCode}
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
Web: ${getDomainConfig().displayName}`;

  // No inline Portal QR - just use a clickable button link to reduce payload
  const portalQrSection = '';

  // Build Install App QR code section using hosted Progressier QR
  const installQrSection = `<div style="margin: 24px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <h3 style="color: #166534; margin: 0 0 12px 0; font-size: 16px;">📲 Install the App</h3>
        <p style="font-size: 14px; color: #666; margin: 0 0 12px 0;">For the best experience, add our app to your phone:</p>
        <img src="${progressierQRUrl}" alt="QR Code to install app" width="120" height="120" style="display: block; margin: 0 auto;">
        <p style="font-size: 12px; color: #666; margin: 8px 0 0 0;">
          <strong>iOS:</strong> Share → Add to Home Screen<br>
          <strong>Android:</strong> Menu → Install App
        </p>
        <p style="font-size: 12px; margin: 12px 0 0 0;">
          <a href="${installUrl}" style="color: #16a34a; text-decoration: underline;">${installUrl}</a>
        </p>
      </div>`;

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
    <img src="${getDomainConfig().baseUrl}/logo-192.png" alt="PSW Direct" width="60" height="60" style="margin-bottom: 12px;">
    <h1 style="color: #16a34a; margin: 0;">✅ Booking Confirmed!</h1>
  </div>
  
  <p>Hi <strong>${clientName}</strong>,</p>
  
  <p>Your care booking has been confirmed.</p>
  
  <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <h3 style="margin: 0 0 12px 0; color: #16a34a;">Booking Details</h3>
    <p style="margin: 4px 0;"><strong>📋 Booking Code:</strong> ${bookingCode}</p>
    <p style="margin: 4px 0;"><strong>📅 Date:</strong> ${date}</p>
    <p style="margin: 4px 0;"><strong>⏰ Time:</strong> ${time}</p>
    <p style="margin: 4px 0;"><strong>🏥 Services:</strong> ${services.join(", ")}</p>
  </div>
  
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <h2 style="color: #166534; margin: 0 0 16px 0;">📱 Track Your Care</h2>
    <p style="margin: 0 0 16px 0;">Scan this code to access your order:</p>
    
    ${portalQrSection}
    
    <div style="margin: 16px 0;">
      <a href="${clientPortalUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Open Client Portal →
      </a>
    </div>
    
    ${installQrSection}
  </div>
  
  <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
    <p style="margin: 0; font-size: 14px;">
      <strong>In your portal you can:</strong>
    </p>
    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #666;">
      <li>Track your care status in real-time</li>
      <li>View your caregiver's first name & photo</li>
      <li>See care sheet reports after visits</li>
      <li>Re-book services instantly</li>
    </ul>
  </div>
  
  <!-- Google Review CTA -->
  <div style="background: linear-gradient(135deg, #e8f4fc 0%, #d0ebff 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #1a365d;">
      ⭐ Enjoying our service?
    </p>
    <p style="margin: 0 0 16px 0; font-size: 14px; color: #4a5568;">
      We'd love to hear about your experience!
    </p>
    <a href="https://g.page/r/CfuKfStrS_hoEAI/review" style="display: inline-block; background: #3b9dd9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
      Rate your experience on Google
    </a>
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
    Office: ${officeNumber} | <a href="${getDomainConfig().baseUrl}" style="color: #9ca3af;">${getDomainConfig().displayName}</a>
  </p>
  
</body>
</html>
`;

  return { subject, body, htmlBody };
};

// Generate HTML email content with hosted Progressier QR code - links to PSA Login
export const formatApprovalEmailHTML = (
  firstName: string,
  officeNumber: string,
  pswNumber?: string,
  lastName?: string
): string => {
  const installUrl = "https://pswdirect.ca/install";
  const progressierQRUrl = getProgressierQRCodeUrl();
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  
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
    <img src="${getDomainConfig().baseUrl}/logo-192.png" alt="PSW Direct" width="60" height="60" style="margin-bottom: 12px;">
    <h1 style="color: #16a34a; margin: 0;">🎉 Welcome to the Team!</h1>
  </div>
  
  <p>Hi <strong>${firstName}</strong>,</p>
  
  <p>Welcome to the team! <strong>You are now approved to accept jobs in the Toronto/GTA area.</strong></p>
  
  ${pswNumber ? `
  <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <h3 style="margin: 0 0 12px 0; color: #166534;">Your PSW Direct Details</h3>
    <p style="margin: 4px 0; font-size: 16px;"><strong>PSW Number:</strong> <span style="color: #16a34a; font-size: 18px; font-weight: bold;">${pswNumber}</span></p>
    <p style="margin: 4px 0;"><strong>Name:</strong> ${fullName}</p>
    <p style="margin: 4px 0;"><strong>Status:</strong> ✅ Approved / Activated</p>
  </div>
  ` : ""}
  
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <h2 style="color: #166534; margin: 0 0 16px 0;">📱 Install the App & Login</h2>
    <p style="margin: 0 0 16px 0;">Scan the QR code below to install our app on your phone:</p>
    
    <img src="${progressierQRUrl}" alt="QR Code to install PSW Direct app" width="180" height="180" style="display: block; margin: 0 auto;">
    
    <p style="font-size: 14px; color: #666; margin: 16px 0 0 0;">
      <strong>iOS:</strong> Share → Add to Home Screen<br>
      <strong>Android:</strong> Menu → Install App
    </p>
    
    <p style="font-size: 14px; margin: 12px 0 0 0;">
      <strong>Download Here:</strong><br>
      <a href="https://pswdirect.ca/install" style="color: #16a34a; text-decoration: underline; font-size: 16px; font-weight: bold;">https://pswdirect.ca/install</a>
    </p>
    
    <p style="font-size: 12px; margin: 12px 0 0 0;">
      Or click here: <a href="${installUrl}" style="color: #16a34a; text-decoration: underline;">${installUrl}</a>
    </p>
    
    <p style="margin: 16px 0 0 0;">
      <a href="${installUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Install & Login →
      </a>
    </p>
  </div>
  
  <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
    <h3 style="color: #1d4ed8; margin: 0 0 8px 0;">🔔 Turn ON Push Notifications</h3>
    <p style="margin: 0;">When you download the PSW Direct app, <strong>please make sure push notifications are turned ON</strong> so you can receive new job alerts and important updates.</p>
    <p style="margin: 8px 0 0 0; font-size: 14px; color: #4b5563;"><strong>iOS:</strong> Settings → Notifications → PSW Direct → Allow Notifications<br><strong>Android:</strong> When prompted, tap "Allow" to enable notifications</p>
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
    Office: ${officeNumber} | <a href="${getDomainConfig().baseUrl}" style="color: #9ca3af;">${getDomainConfig().displayName}</a>
  </p>
  
</body>
</html>
`;
};