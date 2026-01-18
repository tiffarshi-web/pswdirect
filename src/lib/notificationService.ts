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
import { formatApprovalEmailWithQR, getPWAInstallUrl, formatBookingConfirmationWithQR } from "./qrCodeUtils";

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  templateId?: string;
}

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
      return false;
    }
    
    console.log("Email sent successfully:", data);
    toast.success(`📧 Email sent to ${to}`, {
      description: `Subject: ${subject}`,
      duration: 3000,
    });
    return true;
  } catch (error: any) {
    console.error("Email send exception:", error);
    toast.error(`Failed to send email`, {
      description: error.message || "Unknown error",
      duration: 5000,
    });
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
  
  return sendEmail({ to, subject, body, templateId });
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
  
  // Generate enhanced approval email with QR code
  const { subject, body } = formatApprovalEmailWithQR(firstName, officeNumber);
  
  console.log("📧 APPROVAL EMAIL WITH QR CODE:", {
    to: email,
    subject,
    installUrl,
    officeNumber,
    timestamp: new Date().toISOString(),
  });
  
  // Send the enhanced email
  await sendEmail({
    to: email,
    subject,
    body,
    templateId: "psw-approved-with-qr",
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
  
  // Use enhanced email with Client Portal link
  const { subject, body, htmlBody } = formatBookingConfirmationWithQR(
    clientName,
    bookingId,
    date,
    time,
    services,
    officeNumber
  );
  
  return sendEmail({
    to: email,
    subject,
    body,
    htmlBody,
    templateId: "booking-confirmation-with-qr",
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
  });
};
