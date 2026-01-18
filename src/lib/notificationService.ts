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
  getPWAInstallUrl, 
  formatBookingConfirmationWithQR, 
  generateQRCodeDataUrl,
  getClientPortalUrl,
} from "./qrCodeUtils";

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

// PSW approved notification with QR code (email only)
export const sendPSWApprovedNotification = async (
  email: string,
  phone: string,
  firstName: string
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const installUrl = getPWAInstallUrl();
  
  // Generate QR code as Base64 data URL
  const qrCodeDataUrl = await generateQRCodeDataUrl(installUrl);
  
  // Generate HTML email with embedded QR code
  const htmlBody = formatApprovalEmailHTML(firstName, officeNumber, qrCodeDataUrl);
  const subject = "🎉 Welcome to PSW Direct - You're Approved!";
  
  console.log("📧 APPROVAL EMAIL WITH EMBEDDED QR CODE:", {
    to: email,
    subject,
    installUrl,
    officeNumber,
    hasQRCode: !!qrCodeDataUrl,
    timestamp: new Date().toISOString(),
  });
  
  // Send the enhanced email with HTML
  await sendEmail({
    to: email,
    subject,
    body: `Welcome ${firstName}! You are now approved. Install the app at: ${installUrl}`,
    htmlBody,
    templateId: "psw-approved-with-qr",
    templateName: "PSW Approved (with QR)",
  });
  
  return true;
};

// Booking confirmation email with Client Portal QR code
export const sendBookingConfirmationEmail = async (
  email: string,
  clientName: string,
  bookingId: string,
  date: string,
  time: string,
  services: string[]
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const clientPortalUrl = getClientPortalUrl();
  
  // Generate QR code as Base64 data URL for client portal
  const qrCodeDataUrl = await generateQRCodeDataUrl(clientPortalUrl);
  
  // Use enhanced email with Client Portal link and embedded QR code
  const { subject, body, htmlBody } = formatBookingConfirmationWithQR(
    clientName,
    bookingId,
    date,
    time,
    services,
    officeNumber,
    qrCodeDataUrl
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
export const sendJobClaimedNotification = async (
  email: string,
  phone: string | undefined,
  clientName: string,
  bookingId: string,
  date: string,
  time: string,
  pswFirstName: string
): Promise<boolean> => {
  const data = {
    client_name: clientName,
    booking_id: bookingId,
    job_date: date,
    job_time: time,
    psw_first_name: pswFirstName,
    office_number: getOfficeNumber(),
  };
  
  await sendTemplatedEmail("job-claimed", email, data);
  return true;
};

// Care sheet report email
export const sendCareSheetReportEmail = async (
  email: string,
  clientName: string,
  pswFirstName: string,
  date: string,
  tasksCompleted: string[],
  observations: string
): Promise<boolean> => {
  return sendTemplatedEmail("care-sheet-delivery", email, {
    client_name: clientName,
    psw_first_name: pswFirstName,
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
export const sendPSWArrivedNotification = async (
  email: string,
  clientName: string,
  bookingId: string,
  date: string,
  checkInTime: string,
  pswFirstName: string
): Promise<boolean> => {
  const data = {
    client_name: clientName,
    booking_id: bookingId,
    job_date: date,
    job_time: checkInTime,
    psw_first_name: pswFirstName,
    office_number: getOfficeNumber(),
  };
  
  return sendTemplatedEmail("psw-arrived", email, data);
};
