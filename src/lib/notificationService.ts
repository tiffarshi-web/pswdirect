// Notification Service
// Handles email notifications via edge functions
// Uses Resend for email

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  getTemplate,
  replacePlaceholders,
  PRIVACY_FOOTER,
  getOfficeNumber,
} from "./messageTemplates";
import { 
  formatApprovalEmailHTML, 
  getPSWLoginUrl, 
  formatBookingConfirmationWithQR, 
  generateQRCodeDataUrl,
  getClientPortalDeepLink,
  getClientInstallUrl,
} from "./qrCodeUtils";
import { getFirstNameOnly } from "./privacyUtils";

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  templateId?: string;
  templateName?: string;
}

// Log email to database
const logEmail = async (
  payload: EmailPayload,
  status: "sent" | "failed",
  errorMessage?: string
): Promise<void> => {
  try {
    await supabase.from("email_logs").insert({
      template_id: payload.templateId || null,
      template_name: payload.templateName || null,
      recipient_email: payload.to,
      subject: payload.subject,
      body: payload.htmlBody || payload.body, // Store the full body content
      status,
      error_message: errorMessage || null,
      metadata: {},
    });
  } catch (error) {
    console.error("Failed to log email:", error);
  }
};

// Send email using Resend via edge function
export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  const { to, subject, body, htmlBody } = payload;
  
  console.log("📧 EMAIL NOTIFICATION:", {
    to,
    subject,
    body: body.substring(0, 100) + "...",
    timestamp: new Date().toISOString(),
  });
  
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, body, htmlBody }
    });
    
    if (error) {
      console.error("Email send error:", error);
      toast.error(`Failed to send email to ${to}`, {
        description: error.message,
        duration: 5000,
      });
      await logEmail(payload, "failed", error.message);
      return false;
    }
    
    console.log("Email sent successfully:", data);
    toast.success(`📧 Email sent to ${to}`, {
      description: `Subject: ${subject}`,
      duration: 3000,
    });
    await logEmail(payload, "sent");
    return true;
  } catch (error: any) {
    console.error("Email send exception:", error);
    toast.error(`Failed to send email`, {
      description: error.message || "Unknown error",
      duration: 5000,
    });
    await logEmail(payload, "failed", error.message || "Unknown error");
    return false;
  }
};

// ============================================
// Template-based notification functions
// ============================================

// Send notification using a template
export const sendTemplatedEmail = async (
  templateId: string,
  to: string,
  data: Record<string, string>
): Promise<boolean> => {
  const template = getTemplate(templateId);
  if (!template || template.type === "sms") {
    console.error(`Template ${templateId} not found or is SMS-only`);
    return false;
  }
  
  const subject = replacePlaceholders(template.emailSubject, data);
  let body = replacePlaceholders(template.emailBody, data);
  
  // Add privacy footer for care sheet delivery
  if (templateId === "care-sheet-delivery") {
    body += replacePlaceholders(PRIVACY_FOOTER, data);
  }
  
  return sendEmail({ 
    to, 
    subject, 
    body, 
    templateId, 
    templateName: template.name 
  });
};

// ============================================
// Pre-built notification functions
// ============================================

// Welcome PSW email (new signup)
export const sendWelcomePSWEmail = async (
  email: string,
  firstName: string
): Promise<boolean> => {
  return sendTemplatedEmail("psw-signup", email, {
    psw_first_name: firstName,
    office_number: getOfficeNumber(),
  });
};

// PSW approved notification with QR code (email only) - links to PSW Login
export const sendPSWApprovedNotification = async (
  email: string,
  phone: string,
  firstName: string
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const loginUrl = getPSWLoginUrl(); // Changed: now links to login, not install
  
  // Generate QR code as Base64 data URL pointing to login
  const qrCodeDataUrl = await generateQRCodeDataUrl(loginUrl);
  
  // Generate HTML email with embedded QR code
  const htmlBody = formatApprovalEmailHTML(firstName, officeNumber, qrCodeDataUrl);
  const subject = "🎉 Welcome to PSW Direct - You're Approved!";
  
  console.log("📧 APPROVAL EMAIL WITH LOGIN QR CODE:", {
    to: email,
    subject,
    loginUrl,
    officeNumber,
    hasQRCode: !!qrCodeDataUrl,
    timestamp: new Date().toISOString(),
  });
  
  // Send the enhanced email with HTML
  await sendEmail({
    to: email,
    subject,
    body: `Welcome ${firstName}! You are now approved. Login to start: ${loginUrl}`,
    htmlBody,
    templateId: "psw-approved-with-qr",
    templateName: "PSW Approved (with QR)",
  });
  
  return true;
};

// Booking confirmation email with Client Portal QR code AND Install App QR code
export const sendBookingConfirmationEmail = async (
  email: string,
  clientName: string,
  bookingId: string,
  date: string,
  time: string,
  services: string[]
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const clientPortalUrl = getClientPortalDeepLink(bookingId);
  const clientInstallUrl = getClientInstallUrl();
  
  // Generate both QR codes as Base64 data URLs
  const portalQrCode = await generateQRCodeDataUrl(clientPortalUrl);
  const installQrCode = await generateQRCodeDataUrl(clientInstallUrl);
  
  console.log("📧 BOOKING CONFIRMATION EMAIL WITH DUAL QR CODES:", {
    to: email,
    bookingId,
    portalUrl: clientPortalUrl,
    installUrl: clientInstallUrl,
    hasPortalQR: !!portalQrCode,
    hasInstallQR: !!installQrCode,
    timestamp: new Date().toISOString(),
  });
  
  // Use enhanced email with both Portal and Install QR codes
  const { subject, body, htmlBody } = formatBookingConfirmationWithQR(
    clientName,
    bookingId,
    date,
    time,
    services,
    officeNumber,
    portalQrCode,
    installQrCode
  );
  
  return sendEmail({
    to: email,
    subject,
    body,
    htmlBody,
    templateId: "booking-confirmation-with-qr",
    templateName: "Booking Confirmation",
  });
};

// Job claimed notification to client (email only)
// Privacy: Uses first name only for PSW identification
export const sendJobClaimedNotification = async (
  email: string,
  phone: string | undefined,
  clientName: string,
  bookingId: string,
  date: string,
  time: string,
  pswName: string // Can be full name - will be masked to first name only
): Promise<boolean> => {
  const data = {
    client_name: clientName,
    booking_id: bookingId,
    job_date: date,
    job_time: time,
    psw_first_name: getFirstNameOnly(pswName), // Privacy masking
    office_number: getOfficeNumber(),
  };
  
  await sendTemplatedEmail("job-claimed", email, data);
  return true;
};

// Care sheet report email
// Privacy: Uses first name only for PSW identification
export const sendCareSheetReportEmail = async (
  email: string,
  clientName: string,
  pswName: string, // Can be full name - will be masked to first name only
  date: string,
  tasksCompleted: string[],
  observations: string
): Promise<boolean> => {
  return sendTemplatedEmail("care-sheet-delivery", email, {
    client_name: clientName,
    psw_first_name: getFirstNameOnly(pswName), // Privacy masking
    job_date: date,
    tasks_completed: tasksCompleted.map(t => `• ${t}`).join("\n"),
    observations: observations,
    office_number: getOfficeNumber(),
  });
};

// Job completed notification to admin
export const sendJobCompletedAdminNotification = async (
  shiftId: string,
  pswName: string,
  clientName: string,
  completedAt: string,
  flaggedForOvertime: boolean
): Promise<boolean> => {
  const subject = flaggedForOvertime 
    ? `⚠️ Shift Completed with Overtime - ${shiftId}`
    : `✅ Shift Completed - ${shiftId}`;
  
  return sendEmail({
    to: "admin@pswdirect.ca",
    subject,
    body: `
Shift ${shiftId} has been completed.

PSW: ${pswName}
Client: ${clientName}
Completed At: ${completedAt}
${flaggedForOvertime ? "⚠️ FLAGGED FOR OVERTIME BILLING" : ""}

View details in the Admin Panel.
    `.trim(),
    templateId: "job-completed-admin",
    templateName: "Job Completed (Admin)",
  });
};

// PSW arrived notification to client
// Privacy: Uses first name only for PSW identification
export const sendPSWArrivedNotification = async (
  email: string,
  clientName: string,
  bookingId: string,
  date: string,
  checkInTime: string,
  pswName: string // Can be full name - will be masked to first name only
): Promise<boolean> => {
  const data = {
    client_name: clientName,
    booking_id: bookingId,
    job_date: date,
    job_time: checkInTime,
    psw_first_name: getFirstNameOnly(pswName), // Privacy masking
    office_number: getOfficeNumber(),
  };
  
  return sendTemplatedEmail("psw-arrived", email, data);
};

// Overtime adjustment notification to client
export const sendOvertimeAdjustmentNotification = async (
  email: string,
  clientName: string,
  bookingId: string,
  overtimeMinutes: number,
  chargeAmount: number,
  pswFirstName: string
): Promise<boolean> => {
  const subject = `Care Extended - Adjustment Applied (Booking ${bookingId})`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Care Extension Notice</h2>
      <p>Dear ${clientName},</p>
      <p>To ensure the completion of quality care, your service was extended by <strong>${overtimeMinutes} minutes</strong> today.</p>
      <div style="background: #f7fafc; border-left: 4px solid #3182ce; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #2d3748;">
          <strong>Overtime Duration:</strong> ${overtimeMinutes} minutes<br>
          <strong>Adjustment Amount:</strong> $${chargeAmount.toFixed(2)} CAD<br>
          <strong>Caregiver:</strong> ${pswFirstName}
        </p>
      </div>
      <p>This adjustment has been automatically applied to your payment method on file. Your updated receipt will be available in your Client Portal.</p>
      <p>If you have any questions about this adjustment, please contact our office at ${getOfficeNumber()}.</p>
      <p style="margin-top: 24px;">Thank you for trusting PSW Direct with your care needs.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #718096; font-size: 12px;">PSW Direct - Professional Home Care Services</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject,
    body: `Dear ${clientName}, your care was extended by ${overtimeMinutes} minutes. An adjustment of $${chargeAmount.toFixed(2)} has been applied. Contact us at ${getOfficeNumber()} with questions.`,
    htmlBody,
    templateId: "overtime-adjustment",
    templateName: "Overtime Adjustment",
  });
};

// Refund confirmation notification to client
export const sendRefundConfirmationEmail = async (
  email: string,
  clientName: string,
  bookingCode: string,
  refundAmount: number,
  reason?: string
): Promise<boolean> => {
  const subject = `Refund Processed - Booking ${bookingCode}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Refund Confirmation</h2>
      <p>Dear ${clientName},</p>
      <p>Your refund has been processed successfully.</p>
      <div style="background: #f0fff4; border-left: 4px solid #48bb78; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #2d3748;">
          <strong>Booking ID:</strong> ${bookingCode}<br>
          <strong>Refund Amount:</strong> $${refundAmount.toFixed(2)} CAD<br>
          ${reason ? `<strong>Reason:</strong> ${reason}<br>` : ""}
          <strong>Processing Time:</strong> 3-5 business days
        </p>
      </div>
      <p>The refund will be credited to your original payment method within 3-5 business days, depending on your financial institution.</p>
      <p>If you have any questions, please contact our office at ${getOfficeNumber()}.</p>
      <p style="margin-top: 24px;">Thank you for choosing PSW Direct.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #718096; font-size: 12px;">PSW Direct - Professional Home Care Services</p>
    </div>
  `;
  
  return sendEmail({
    to: email,
    subject,
    body: `Dear ${clientName}, your refund of $${refundAmount.toFixed(2)} for booking ${bookingCode} has been processed. It will appear on your statement within 3-5 business days.`,
    htmlBody,
    templateId: "refund-confirmation",
    templateName: "Refund Confirmation",
  });
};
