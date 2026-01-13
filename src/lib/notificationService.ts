// Notification Service
// Handles email and SMS notifications with dev mode simulation
// In production, this will connect to Resend/SendGrid and Twilio

import { toast } from "sonner";

// Environment variables for API keys (to be set in production)
// VITE_RESEND_API_KEY - Email provider API key
// VITE_TWILIO_ACCOUNT_SID - Twilio account SID
// VITE_TWILIO_AUTH_TOKEN - Twilio auth token
// VITE_TWILIO_PHONE_NUMBER - Twilio sending phone number

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  template?: "welcome-psw" | "booking-confirmation" | "care-sheet-report" | "job-completed";
}

export interface SMSPayload {
  to: string;
  message: string;
}

// Check if we're in production mode (API keys configured)
const isProductionMode = (): boolean => {
  return !!(
    import.meta.env.VITE_RESEND_API_KEY || 
    import.meta.env.VITE_SENDGRID_API_KEY
  );
};

// Send email - simulated in dev mode
export const sendEmail = async (payload: EmailPayload): Promise<boolean> => {
  const { to, subject, body, template } = payload;
  
  console.log("📧 EMAIL NOTIFICATION:", {
    to,
    subject,
    template,
    body: body.substring(0, 100) + "...",
    timestamp: new Date().toISOString(),
  });
  
  if (isProductionMode()) {
    // TODO: Implement actual email sending via Resend/SendGrid
    // This would be an edge function call in production
    console.log("Production email would be sent here");
    return true;
  }
  
  // Dev mode - show toast notification
  toast.info(`📧 Email would be sent to ${to}`, {
    description: `Subject: ${subject}`,
    duration: 5000,
  });
  
  return true;
};

// Send SMS - simulated in dev mode
export const sendSMS = async (payload: SMSPayload): Promise<boolean> => {
  const { to, message } = payload;
  
  console.log("📱 SMS NOTIFICATION:", {
    to,
    message,
    timestamp: new Date().toISOString(),
  });
  
  if (import.meta.env.VITE_TWILIO_ACCOUNT_SID) {
    // TODO: Implement actual SMS sending via Twilio
    // This would be an edge function call in production
    console.log("Production SMS would be sent here");
    return true;
  }
  
  // Dev mode - show toast notification
  toast.info(`📱 SMS would be sent to ${to}`, {
    description: message.substring(0, 50) + "...",
    duration: 5000,
  });
  
  return true;
};

// Pre-built notification templates

// Welcome PSW email
export const sendWelcomePSWEmail = async (
  email: string, 
  firstName: string
): Promise<boolean> => {
  return sendEmail({
    to: email,
    subject: "Welcome to PSW Direct! 🎉",
    body: `
Hi ${firstName},

Welcome to PSW Direct! Your application has been received and is under review.

Once approved, you'll be able to:
- View and claim available shifts in your area
- Track your earnings and hours
- Connect with clients who need your care

Our team will review your credentials within 2-3 business days.

Questions? Call us at (613) 555-0100

Best regards,
The PSW Direct Team
    `.trim(),
    template: "welcome-psw",
  });
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
  return sendEmail({
    to: email,
    subject: `Booking Confirmed - ${bookingId}`,
    body: `
Hi ${clientName},

Your care booking has been confirmed!

Booking ID: ${bookingId}
Date: ${date}
Time: ${time}
Services: ${services.join(", ")}

IMPORTANT: Cancellations within 4 hours of the scheduled time are non-refundable.

A qualified PSW will be assigned to your booking shortly. You'll receive another notification when they're on their way.

Questions? Call us at (613) 555-0100

Thank you for choosing PSW Direct!
    `.trim(),
    template: "booking-confirmation",
  });
};

// Care sheet report email
export const sendCareSheetReportEmail = async (
  email: string,
  clientName: string,
  pswFirstName: string,
  date: string,
  tasksCompleted: string[],
  observations: string,
  officeNumber: string
): Promise<boolean> => {
  return sendEmail({
    to: email,
    subject: `Care Visit Summary - ${date}`,
    body: `
Hi ${clientName},

Here's a summary of today's care visit:

Date: ${date}
PSW: ${pswFirstName}

Tasks Completed:
${tasksCompleted.map(t => `• ${t}`).join("\n")}

Observations:
${observations}

---

For any questions or follow-ups, please contact our office:
📞 ${officeNumber}

Thank you for trusting PSW Direct with your care needs.
    `.trim(),
    template: "care-sheet-report",
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
    template: "job-completed",
  });
};

// New job SMS alert to PSW
export const sendNewJobAlertSMS = async (
  phoneNumber: string,
  pswName: string,
  clientLocation: string,
  date: string,
  time: string
): Promise<boolean> => {
  return sendSMS({
    to: phoneNumber,
    message: `PSW Direct: New shift available! ${date} at ${time} in ${clientLocation}. Open the app to claim it. Reply STOP to unsubscribe.`,
  });
};
