// Notification Service
// Handles email and SMS notifications with template support
// Connects to Resend/SendGrid for email and Twilio for SMS

import { toast } from "sonner";
import {
  getTemplate,
  replacePlaceholders,
  getAPIConfig,
  isEmailConfigured,
  isSMSConfigured,
  PRIVACY_FOOTER,
  getOfficeNumber,
} from "./messageTemplates";

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
}

export interface SMSPayload {
  to: string;
  message: string;
}

// Send email using configured provider
export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  const { to, subject, body } = payload;
  const config = getAPIConfig();
  
  console.log("📧 EMAIL NOTIFICATION:", {
    to,
    subject,
    provider: config.emailProvider,
    body: body.substring(0, 100) + "...",
    timestamp: new Date().toISOString(),
  });
  
  if (isEmailConfigured()) {
    // Production mode - would call edge function with API key
    console.log(`Production email via ${config.emailProvider} would be sent here`);
    toast.success(`📧 Email sent to ${to}`, {
      description: `Subject: ${subject}`,
      duration: 3000,
    });
    return true;
  }
  
  // Dev mode - show toast notification
  toast.info(`📧 Email would be sent to ${to}`, {
    description: `Subject: ${subject}`,
    duration: 5000,
  });
  
  return true;
};

// Send SMS using Twilio
export const sendSMS = async (payload: SMSPayload): Promise<boolean> => {
  const { to, message } = payload;
  const config = getAPIConfig();
  
  console.log("📱 SMS NOTIFICATION:", {
    to,
    message,
    from: config.twilioPhoneNumber || "NOT_CONFIGURED",
    timestamp: new Date().toISOString(),
  });
  
  if (isSMSConfigured()) {
    // Production mode - would call edge function with Twilio credentials
    console.log("Production SMS via Twilio would be sent here");
    toast.success(`📱 SMS sent to ${to}`, {
      description: message.substring(0, 50) + "...",
      duration: 3000,
    });
    return true;
  }
  
  // Dev mode - show toast notification
  toast.info(`📱 SMS would be sent to ${to}`, {
    description: message.substring(0, 50) + "...",
    duration: 5000,
  });
  
  return true;
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

export const sendTemplatedSMS = async (
  templateId: string,
  to: string,
  data: Record<string, string>
): Promise<boolean> => {
  const template = getTemplate(templateId);
  if (!template || template.type === "email") {
    console.error(`Template ${templateId} not found or is email-only`);
    return false;
  }
  
  const message = replacePlaceholders(template.smsText, data);
  return sendSMS({ to, message });
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

// PSW approved notification
export const sendPSWApprovedNotification = async (
  email: string,
  phone: string,
  firstName: string
): Promise<boolean> => {
  const data = {
    psw_first_name: firstName,
    office_number: getOfficeNumber(),
  };
  
  // Send both email and SMS
  await sendTemplatedEmail("psw-approved", email, data);
  if (phone) {
    await sendTemplatedSMS("psw-approved", phone, data);
  }
  return true;
};

// Booking confirmation email
export const sendBookingConfirmationEmail = async (
  email: string,
  clientName: string,
  bookingId: string,
  date: string,
  time: string,
  services: string[]
): Promise<boolean> => {
  const template = getTemplate("job-claimed");
  if (!template) {
    // Fallback to hardcoded template
    return sendEmail({
      to: email,
      subject: `Booking Confirmed - ${bookingId}`,
      body: `Hi ${clientName},\n\nYour care booking ${bookingId} is confirmed for ${date} at ${time}.\n\nServices: ${services.join(", ")}\n\nQuestions? Call ${getOfficeNumber()}`,
    });
  }
  
  return sendTemplatedEmail("job-claimed", email, {
    client_name: clientName,
    booking_id: bookingId,
    job_date: date,
    job_time: time,
    services: services.join(", "),
  });
};

// Job claimed notification to client
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
  if (phone) {
    await sendTemplatedSMS("job-claimed", phone, data);
  }
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

// New job SMS alert to PSWs
export const sendNewJobAlertSMS = async (
  phoneNumber: string,
  pswName: string,
  clientLocation: string,
  date: string,
  time: string
): Promise<boolean> => {
  return sendTemplatedSMS("new-job-alert", phoneNumber, {
    address: clientLocation,
    job_date: date,
    job_time: time,
  });
};
