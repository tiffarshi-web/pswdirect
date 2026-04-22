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

// Send email using Resend via edge function (with retry)
const sendEmailOnce = async (payload: EmailPayload): Promise<boolean> => {
  const { to, subject, body, htmlBody } = payload;
  
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { to, subject, body, htmlBody }
  });
  
  if (error) {
    console.error("Email send error:", error);
    throw new Error(error.message || "Failed to send email");
  }
  
  console.log("Email sent successfully:", data);
  return true;
};

// Send email with retry mechanism for reliability
export const sendEmail = async (payload: EmailPayload, maxRetries = 2): Promise<boolean> => {
  const { to, subject, body } = payload;
  
  console.log("📧 EMAIL NOTIFICATION:", {
    to,
    subject,
    body: body.substring(0, 100) + "...",
    timestamp: new Date().toISOString(),
  });
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendEmailOnce(payload);
      if (result) {
        toast.success(`📧 Email sent to ${to}`, {
          description: `Subject: ${subject}`,
          duration: 3000,
        });
        await logEmail(payload, "sent");
        return true;
      }
    } catch (error: any) {
      console.warn(`Email attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (attempt === maxRetries) {
        // Final attempt failed
        console.error("Email send failed after all retries:", error);
        toast.error(`Failed to send email to ${to}`, {
          description: error.message || "Unknown error",
          duration: 5000,
        });
        await logEmail(payload, "failed", error.message || "Unknown error");
        return false;
      }
      
      // Wait before retry (exponential backoff: 1s, 2s)
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  
  return false;
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
  return sendTemplatedEmail("psa-signup", email, {
    psa_first_name: firstName,
    office_number: getOfficeNumber(),
  });
};

// PSW approved notification with hosted QR code (email only) - links to PSW Login
// pswNumber: the assigned PSW-#### identifier (must be assigned BEFORE calling this)
export const sendPSWApprovedNotification = async (
  email: string,
  phone: string,
  firstName: string,
  lastName: string = "",
  pswNumber?: number | null
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const loginUrl = getPSWLoginUrl();
  const pswLabel = pswNumber ? `PSW-${pswNumber}` : "";
  
  // Generate HTML email with hosted Progressier QR code (no base64 bloat)
  const htmlBody = formatApprovalEmailHTML(firstName, officeNumber, pswLabel, lastName);
  const subject = "🎉 Welcome to PSW Direct - You're Approved!";
  
  console.log("📧 APPROVAL EMAIL WITH HOSTED QR CODE:", {
    to: email,
    subject,
    pswNumber: pswLabel,
    loginUrl,
    officeNumber,
    timestamp: new Date().toISOString(),
  });
  
  // Send the enhanced email with HTML
  await sendEmail({
    to: email,
    subject,
    body: `Welcome ${firstName}! You are now approved.${pswLabel ? ` Your PSW Number: ${pswLabel}.` : ""} Login to start: ${loginUrl}`,
    htmlBody,
    templateId: "psw-approved-with-qr",
    templateName: "PSW Approved (with QR)",
  });
  
  return true;
};

// Booking confirmation email with clickable links (no inline QR codes to reduce payload size)
// bookingCode: the CDT-###### code (human-facing), NOT the UUID
export const sendBookingConfirmationEmail = async (
  email: string,
  clientName: string,
  bookingCode: string,
  date: string,
  time: string,
  services: string[]
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const clientPortalUrl = getClientPortalDeepLink(bookingCode);
  
  console.log("📧 BOOKING CONFIRMATION EMAIL:", {
    to: email,
    bookingCode,
    portalUrl: clientPortalUrl,
    timestamp: new Date().toISOString(),
  });
  
  // Use lightweight email without base64 QR codes to avoid payload size issues
  const { subject, body, htmlBody } = formatBookingConfirmationWithQR(
    clientName,
    bookingCode,
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
    templateId: "booking-confirmation",
    templateName: "Booking Confirmation",
  });
};

// Job claimed notification to client (email only)
// Privacy: Uses first name only for PSW identification
export const sendJobClaimedNotification = async (
  email: string,
  phone: string | undefined,
  clientName: string,
  bookingCode: string,
  date: string,
  time: string,
  pswName: string, // Can be full name - will be masked to first name only
  pswPhotoUrl?: string, // Optional PSW profile photo URL
  pswNumber?: number | null // PSW-#### identifier
): Promise<boolean> => {
  const data: Record<string, string> = {
    client_name: clientName,
    booking_code: bookingCode,
    booking_id: bookingCode, // backward compat for old templates
    job_date: date,
    job_time: time,
    psw_first_name: getFirstNameOnly(pswName), // Privacy masking
    office_number: getOfficeNumber(),
  };
  
  if (pswNumber) {
    data.psw_number = `PSW-${pswNumber}`;
  }
  
  // Add photo URL if available
  if (pswPhotoUrl) {
    data.psw_photo_url = pswPhotoUrl;
  }
  
  await sendTemplatedEmail("job-claimed", email, data);
  return true;
};

// @deprecated DO NOT CALL FROM FRONTEND.
// PSW assignment emails are sent by the database trigger
// `trg_notify_client_on_psw_assignment` -> `send-psw-assignment-email` edge fn.
// This function is kept only for historical reference and should be removed
// in a follow-up cleanup pass once we confirm no external callers remain.
export const sendPSWAssignedNotification = async (
  clientEmail: string,
  clientFirstName: string,
  bookingCode: string,
  scheduledDate: string,
  startTime: string,
  endTime: string,
  serviceType: string[],
  pswFirstName: string,
  pswGender?: string | null,
  pswLanguages?: string[] | null,
): Promise<boolean> => {
  // Dedup: check email_history for psw-assigned + this booking_code
  try {
    const { data: existing } = await supabase
      .from("email_history")
      .select("id")
      .eq("template_key", "psw-assigned")
      .eq("to_email", clientEmail)
      .like("html", `%${bookingCode}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`⏭️ PSW-assigned email already sent for ${bookingCode}, skipping`);
      return true;
    }
  } catch (err) {
    console.warn("Dedup check failed, proceeding with send:", err);
  }

  const data: Record<string, string> = {
    client_first_name: clientFirstName || "Valued Client",
    psw_first_name: getFirstNameOnly(pswFirstName),
    service_type: serviceType.length > 0 ? serviceType.join(", ") : "Home Care",
    job_date: scheduledDate,
    job_time: `${startTime} – ${endTime}`,
    office_number: getOfficeNumber(),
  };

  if (pswGender) {
    data.psw_gender = pswGender;
  }
  if (pswLanguages && pswLanguages.length > 0) {
    data.psw_languages = pswLanguages.join(", ");
  }

  const result = await sendTemplatedEmail("psw-assigned", clientEmail, data);

  // Log to email_history for dedup
  if (result) {
    try {
      await supabase.from("email_history").insert({
        template_key: "psw-assigned",
        to_email: clientEmail,
        subject: "Your PSW Has Been Assigned",
        html: `PSW assigned for ${bookingCode}`,
        status: "sent",
      });
    } catch (err) {
      console.warn("Failed to log psw-assigned email to history:", err);
    }
  }

  return result;
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
  flaggedForOvertime: boolean,
  bookingCode?: string,
  pswNumber?: number | null
): Promise<boolean> => {
  const pswLabel = pswNumber ? `PSW-${pswNumber}` : "";
  const codeLabel = bookingCode || shiftId;
  const subject = flaggedForOvertime 
    ? `⚠️ Shift Completed with Overtime`
    : `✅ Shift Completed`;
  
  return sendEmail({
    to: "admin@pswdirect.ca",
    subject,
    body: `
Shift completed.

Booking Code: ${codeLabel}
PSW: ${pswName}${pswLabel ? ` (${pswLabel})` : ""}
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
  bookingCode: string,
  date: string,
  checkInTime: string,
  pswName: string, // Can be full name - will be masked to first name only
  pswNumber?: number | null
): Promise<boolean> => {
  const data: Record<string, string> = {
    client_name: clientName,
    booking_code: bookingCode,
    booking_id: bookingCode, // backward compat
    job_date: date,
    job_time: checkInTime,
    psw_first_name: getFirstNameOnly(pswName), // Privacy masking
    office_number: getOfficeNumber(),
  };
  
  if (pswNumber) {
    data.psw_number = `PSW-${pswNumber}`;
  }
  
  return sendTemplatedEmail("psw-arrived", email, data);
};

// Overtime adjustment notification to client
export const sendOvertimeAdjustmentNotification = async (
  email: string,
  clientName: string,
  bookingCode: string,
  overtimeMinutes: number,
  chargeAmount: number,
  pswFirstName: string,
  pswNumber?: number | null
): Promise<boolean> => {
  const pswLabel = pswNumber ? `PSW-${pswNumber}` : "";
  const subject = `Care Extended - Adjustment Applied`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a365d;">Care Extension Notice</h2>
      <p>Dear ${clientName},</p>
      <p>To ensure the completion of quality care, your service was extended by <strong>${overtimeMinutes} minutes</strong> today.</p>
      <div style="background: #f7fafc; border-left: 4px solid #3182ce; padding: 16px; margin: 20px 0;">
        <p style="margin: 0; color: #2d3748;">
          <strong>Booking Code:</strong> ${bookingCode}<br>
          <strong>Overtime Duration:</strong> ${overtimeMinutes} minutes<br>
          <strong>Adjustment Amount:</strong> $${chargeAmount.toFixed(2)} CAD<br>
          <strong>Caregiver:</strong> ${pswFirstName}${pswLabel ? ` (${pswLabel})` : ""}
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
    body: `Dear ${clientName}, Booking ${bookingCode}: your care was extended by ${overtimeMinutes} minutes. An adjustment of $${chargeAmount.toFixed(2)} has been applied. Contact us at ${getOfficeNumber()} with questions.`,
    htmlBody,
    templateId: "overtime-adjustment",
    templateName: "Overtime Adjustment",
  });
};

// @deprecated DO NOT CALL FROM FRONTEND.
// Refund confirmation emails must be sent by the `process-refund` edge function
// (server-side, single source of truth). Kept only for historical reference.
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
          <strong>Booking Code:</strong> ${bookingCode}<br>
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

// Hospital Discharge notification with attachment
// This specialized email includes discharge papers as an attachment
export const sendHospitalDischargeEmail = async (
  email: string,
  clientName: string,
  pswName: string,
  pswPhotoUrl: string | undefined,
  date: string,
  tasksCompleted: string[],
  observations: string,
  dischargeDocumentBase64: string,
  dischargeFileName?: string
): Promise<boolean> => {
  const data: Record<string, string> = {
    client_name: clientName,
    psw_first_name: getFirstNameOnly(pswName),
    job_date: date,
    tasks_completed: tasksCompleted.map(t => `• ${t}`).join("\n"),
    observations: observations,
    office_number: getOfficeNumber(),
  };
  
  if (pswPhotoUrl) {
    data.psw_photo_url = pswPhotoUrl;
  }
  
  const template = getTemplate("hospital-discharge-delivery");
  if (!template) {
    console.error("Hospital discharge template not found");
    return false;
  }
  
  const subject = replacePlaceholders(template.emailSubject, data);
  let htmlBody = replacePlaceholders(template.emailBody, data);
  htmlBody += replacePlaceholders(PRIVACY_FOOTER, data);

  // Determine content type from base64 data URL
  let contentType = "application/pdf";
  if (dischargeDocumentBase64.startsWith("data:image/jpeg")) {
    contentType = "image/jpeg";
  } else if (dischargeDocumentBase64.startsWith("data:image/png")) {
    contentType = "image/png";
  }

  // Extract base64 content (remove data URL prefix)
  const base64Content = dischargeDocumentBase64.includes(",")
    ? dischargeDocumentBase64.split(",")[1]
    : dischargeDocumentBase64;

  console.log("📧 HOSPITAL DISCHARGE EMAIL WITH ATTACHMENT:", {
    to: email,
    subject,
    hasAttachment: true,
    attachmentFilename: dischargeFileName || "discharge-papers",
    attachmentType: contentType,
  });

  // Send with attachment via edge function
  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      to: email,
      subject,
      body: `Hospital discharge summary for ${clientName}`,
      htmlBody,
      attachment: {
        filename: dischargeFileName || "discharge-papers.pdf",
        content: base64Content,
        contentType: contentType,
      }
    }
  });
  
  if (error) {
    console.error("Hospital discharge email error:", error);
    return false;
  }
  
  await logEmail({
    to: email,
    subject,
    body: htmlBody,
    templateId: "hospital-discharge-delivery",
    templateName: "Hospital Discharge Delivery",
  }, "sent");
  
  return true;
};

// Visit Summary email (from PSW Dashboard care sheet tab)
// Privacy: Uses first name only, strips contact info from observations
export const sendVisitSummaryEmail = async (
  clientEmail: string,
  clientName: string,
  pswFirstName: string,
  scheduledDate: string,
  startTime: string,
  endTime: string,
  tasksCompleted: string[],
  observations: string,
  officeNumber: string,
  uploadedDocuments?: { name: string; url: string; type: string; size: number }[]
): Promise<boolean> => {
  const clientFirst = getFirstNameOnly(clientName);
  const taskList = tasksCompleted.map(t => `• ${t}`).join("\n");

  // Strip any contact info patterns from observations
  const { sanitizeContactInfo } = await import("./privacyFilter");
  const sanitizedObs = sanitizeContactInfo(observations);

  // Build document links section if specialty docs exist
  let docsSection = "";
  if (uploadedDocuments && uploadedDocuments.length > 0) {
    // Generate signed URLs for each document
    const { supabase: sbClient } = await import("@/integrations/supabase/client");
    const docLinks: string[] = [];
    for (const doc of uploadedDocuments) {
      const { data } = await sbClient.storage
        .from("psw-documents")
        .createSignedUrl(doc.url, 60 * 60 * 72); // 72 hours
      if (data?.signedUrl) {
        docLinks.push(`📎 ${doc.name}: ${data.signedUrl}`);
      }
    }
    if (docLinks.length > 0) {
      docsSection = `\n📄 Attached Documents:\n${docLinks.join("\n")}\n`;
    }
  }

  const subject = `PSW Direct Visit Summary – ${scheduledDate}`;
  const body = `
Hello ${clientFirst},

Here is the summary of your recent visit with PSW Direct.

📅 Visit Date: ${scheduledDate}
🕐 Time: ${startTime} – ${endTime}
👤 Caregiver: ${pswFirstName}

✅ Services Provided:
${taskList}

${sanitizedObs ? `📝 Notes & Observations:\n${sanitizedObs}\n` : ""}${docsSection}
For scheduling or questions, please contact PSW Direct support at ${officeNumber}.

Thank you for trusting PSW Direct with your care.

────────────────────────────

📅 Book Another Visit

Need another visit?
Book your next Personal Support Worker here:
https://pswdirect.ca/book

⭐ How was today's visit?

Leave a review for PSW Direct:
https://share.google/KHFEiCCwMk2ezlAXr

– PSW Direct Team
  `.trim();

  return sendEmail({
    to: clientEmail,
    subject,
    body,
    templateId: "visit-summary",
    templateName: "Visit Summary (Dashboard)",
  });
};

// ============================================
// PSW Shift Confirmation Email (sent to PSW after claiming)
// ============================================
export const sendShiftConfirmationToPSW = async (
  pswEmail: string,
  pswFirstName: string,
  bookingCode: string,
  clientName: string,
  patientName: string,
  address: string,
  date: string,
  startTime: string,
  endTime: string,
  serviceTypes: string[]
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const services = serviceTypes.length > 0 ? serviceTypes.join(", ") : "Standard Home Care";

  const subject = `✅ Shift Confirmed – ${bookingCode} on ${date}`;
  const body = `
Hi ${pswFirstName},

You have accepted this shift and are expected to attend as scheduled.

Here are your shift details:

────────────────────────────
📋 Booking Code: ${bookingCode}
📅 Date: ${date}
🕐 Time: ${startTime} – ${endTime}
📍 Service Address: ${address}
👤 Client: ${clientName}
🧑‍⚕️ Patient: ${patientName}
🔧 Service Type: ${services}
────────────────────────────

⚠️ Attendance Reminder:
You have accepted this shift and are expected to attend as scheduled. If you are unable to attend, notify admin immediately at ${officeNumber}.

• Arrive on time – missed or late shifts may result in removal from the platform.
• Enable location services before check-in.

📲 Open the PSW Direct app to view your shift details:
https://pswdirect.ca/psw-login

– PSW Direct Team
  `.trim();

  const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #16a34a; font-size: 22px; margin: 0;">✅ Shift Confirmed</h1>
    <p style="color: #6b7280; margin: 8px 0 0;">Booking ${bookingCode}</p>
  </div>

  <p style="font-size: 15px; color: #1f2937;">Hi ${pswFirstName},</p>
  <p style="font-size: 15px; color: #1f2937;"><strong>You have accepted this shift and are expected to attend as scheduled.</strong></p>
  <p style="font-size: 15px; color: #1f2937;">Here are your shift details:</p>

  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <table style="width: 100%; font-size: 14px; color: #1f2937;">
      <tr><td style="padding: 6px 0; font-weight: bold;">📋 Booking Code:</td><td style="padding: 6px 0;">${bookingCode}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">📅 Date:</td><td style="padding: 6px 0;">${date}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">🕐 Time:</td><td style="padding: 6px 0;">${startTime} – ${endTime}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">📍 Service Address:</td><td style="padding: 6px 0;">${address}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">👤 Client:</td><td style="padding: 6px 0;">${clientName}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">🧑‍⚕️ Patient:</td><td style="padding: 6px 0;">${patientName}</td></tr>
      <tr><td style="padding: 6px 0; font-weight: bold;">🔧 Service Type:</td><td style="padding: 6px 0;">${services}</td></tr>
    </table>
  </div>

  <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px; margin: 16px 0;">
    <p style="margin: 0 0 8px; font-weight: bold; color: #92400e;">⚠️ Attendance Reminder</p>
    <p style="margin: 0 0 8px; color: #92400e; font-size: 13px;">You have accepted this shift and are expected to attend as scheduled. If you are unable to attend, notify admin immediately at ${officeNumber}.</p>
    <ul style="margin: 0; padding-left: 18px; color: #92400e; font-size: 13px;">
      <li>Arrive on time – missed or late shifts may result in removal.</li>
      <li>Enable location services before check-in.</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="https://pswdirect.ca/psw-login" style="background: #16a34a; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">Open PSW Direct App</a>
  </div>

  <p style="font-size: 13px; color: #9ca3af; text-align: center;">– PSW Direct Team</p>
</div>
  `.trim();

  return sendEmail({
    to: pswEmail,
    subject,
    body,
    htmlBody,
    templateId: "psw-shift-confirmation",
    templateName: "PSW Shift Confirmation",
  });
};

// ============================================
// PSW Warning Email (admin flags account)
// ============================================
export const sendPSWWarningEmail = async (
  pswEmail: string,
  pswFirstName: string,
  reason: string
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const subject = "⚠️ Warning Notice – PSW Direct";
  const body = `
Hi ${pswFirstName},

This is a formal warning notice from PSW Direct administration.

Reason for Warning:
${reason}

Please review and address the above immediately. Failure to comply may result in further action, including removal from the platform.

If you believe this was issued in error, please contact our office at ${officeNumber}.

– PSW Direct Administration
  `.trim();

  const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #d97706; font-size: 22px; margin: 0;">⚠️ Warning Notice</h1>
    <p style="color: #6b7280; margin: 8px 0 0;">PSW Direct Administration</p>
  </div>

  <p style="font-size: 15px; color: #1f2937;">Hi ${pswFirstName},</p>
  <p style="font-size: 15px; color: #1f2937;">This is a formal warning notice from PSW Direct administration.</p>

  <div style="background: #fefce8; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px; font-weight: bold; color: #92400e;">Reason for Warning:</p>
    <p style="margin: 0; color: #78350f; font-size: 14px; white-space: pre-wrap;">${reason}</p>
  </div>

  <p style="font-size: 14px; color: #1f2937;">Please review and address the above immediately. Failure to comply may result in further action, including <strong>removal from the platform</strong>.</p>

  <p style="font-size: 14px; color: #1f2937;">If you believe this was issued in error, please contact our office at <strong>${officeNumber}</strong>.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 13px; color: #9ca3af; text-align: center;">– PSW Direct Administration</p>
</div>
  `.trim();

  return sendEmail({
    to: pswEmail,
    subject,
    body,
    htmlBody,
    templateId: "psw-warning",
    templateName: "PSW Warning Notice",
  });
};

// ============================================
// PSW Removal / Deactivation Email
// ============================================
export const sendPSWRemovalEmail = async (
  pswEmail: string,
  pswFirstName: string,
  reason: string
): Promise<boolean> => {
  const officeNumber = getOfficeNumber();
  const subject = "🚫 Account Deactivated – PSW Direct";
  const body = `
Hi ${pswFirstName},

We are writing to inform you that your PSW Direct account has been deactivated effective immediately.

Reason for Removal:
${reason}

What this means:
• You will no longer be able to log in to the PSW Direct platform.
• You will not appear in the caregiver directory.
• You will not receive new shift notifications.
• Any pending payout requests will be processed as per our terms.

If you have questions or wish to appeal this decision, please contact our office at ${officeNumber}.

– PSW Direct Administration
  `.trim();

  const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #dc2626; font-size: 22px; margin: 0;">🚫 Account Deactivated</h1>
    <p style="color: #6b7280; margin: 8px 0 0;">PSW Direct Administration</p>
  </div>

  <p style="font-size: 15px; color: #1f2937;">Hi ${pswFirstName},</p>
  <p style="font-size: 15px; color: #1f2937;">We are writing to inform you that your PSW Direct account has been <strong>deactivated</strong> effective immediately.</p>

  <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px; font-weight: bold; color: #991b1b;">Reason for Removal:</p>
    <p style="margin: 0; color: #7f1d1d; font-size: 14px; white-space: pre-wrap;">${reason}</p>
  </div>

  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px; font-weight: bold; color: #374151;">What this means:</p>
    <ul style="margin: 0; padding-left: 18px; color: #4b5563; font-size: 14px;">
      <li>You will no longer be able to log in to the PSW Direct platform.</li>
      <li>You will not appear in the caregiver directory.</li>
      <li>You will not receive new shift notifications.</li>
      <li>Any pending payout requests will be processed as per our terms.</li>
    </ul>
  </div>

  <p style="font-size: 14px; color: #1f2937;">If you have questions or wish to appeal this decision, please contact our office at <strong>${officeNumber}</strong>.</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 13px; color: #9ca3af; text-align: center;">– PSW Direct Administration</p>
</div>
  `.trim();

  return sendEmail({
    to: pswEmail,
    subject,
    body,
    htmlBody,
    templateId: "psw-removal",
    templateName: "PSW Removal / Deactivation",
  });
};
