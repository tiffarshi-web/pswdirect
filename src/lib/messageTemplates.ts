// Message Templates Configuration
// Manages email templates with dynamic placeholders

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  emailSubject: string;
  emailBody: string;
  smsText: string; // Kept for potential future use
  type: "email" | "sms" | "both";
  isCustom?: boolean; // Marks user-created templates
}

// Available placeholder tags
export const PLACEHOLDER_TAGS = [
  { tag: "{{client_name}}", description: "Client's full name" },
  { tag: "{{psa_first_name}}", description: "PSA's first name only" },
  { tag: "{{psa_photo_url}}", description: "PSA's profile photo URL" },
  { tag: "{{job_time}}", description: "Scheduled job time" },
  { tag: "{{job_date}}", description: "Scheduled job date" },
  { tag: "{{office_number}}", description: "Office phone number" },
  { tag: "{{booking_id}}", description: "Unique booking reference" },
  { tag: "{{services}}", description: "List of booked services" },
  { tag: "{{tasks_completed}}", description: "List of completed tasks" },
  { tag: "{{observations}}", description: "Care notes/observations" },
  { tag: "{{address}}", description: "Service address" },
] as const;

// Default office number
export const DEFAULT_OFFICE_NUMBER = "(249) 288-4787";

// Privacy footer (hard-coded, cannot be edited)
export const PRIVACY_FOOTER = `
---
For your privacy, please use our office number for all follow-up communication. Do not contact the PSA directly.
Office: {{office_number}}`;

// Default templates
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "psa-signup",
    name: "New PSA Sign-up",
    description: "Welcome message sent when a PSA submits their application",
    type: "email",
    emailSubject: "Welcome to PSA Direct! 🎉",
    emailBody: `Hi {{psa_first_name}},

Welcome to PSA Direct! Your application has been received and is under review.

Once approved, you'll be able to:
- View and claim available shifts in your area
- Track your earnings and hours
- Connect with clients who need your care

Our team will review your credentials within 2-3 business days.

Questions? Call us at {{office_number}}

Best regards,
The PSA Direct Team`,
    smsText: "",
  },
  {
    id: "psa-approved",
    name: "PSA Approved",
    description: "Welcome to the team message with shift warning",
    type: "email",
    emailSubject: "You're Approved! Welcome to the PSA Direct Team 🎊",
    emailBody: `Hi {{psa_first_name}},

Congratulations! Your application has been approved and you're now part of the PSA Direct team.

You can now:
✅ View and claim available shifts in your area
✅ Track your earnings and completed visits
✅ Build your reputation with client reviews

⚠️ IMPORTANT PROFESSIONAL STANDARDS:
By accepting shifts, you agree to arrive on time and complete all scheduled visits. Any missed or late shifts will result in immediate removal from the platform.

Open the app to view available shifts near you!

Questions? Call us at {{office_number}}

Welcome aboard!
The PSA Direct Team`,
    smsText: "",
  },
  {
    id: "new-job-alert",
    name: "New Job Alert",
    description: "Sent to all vetted PSAs when a new booking is available",
    type: "email",
    emailSubject: "New Shift Available! 📋",
    emailBody: `New shift available!

Date: {{job_date}}
Time: {{job_time}}
Location: {{address}}

Open the app to claim it before someone else does!`,
    smsText: "",
  },
  {
    id: "booking-confirmation",
    name: "Booking Confirmation",
    description: "Sent to client immediately after placing a booking",
    type: "email",
    emailSubject: "Booking Received - {{booking_id}}",
    emailBody: `Hi {{client_name}},

Thank you for your booking! We have received your care request.

📋 Booking ID: {{booking_id}}
📅 Date: {{job_date}}
⏰ Time: {{job_time}}
🏥 Services: {{services}}

We are now matching you with a qualified caregiver. You will receive another email once a PSW accepts your booking.

Questions? Call our office at {{office_number}}

Thank you for choosing PSW Direct!`,
    smsText: "",
  },
  {
    id: "job-claimed",
    name: "Job Claimed",
    description: "Sent to the client when a PSW claims their booking",
    type: "email",
    emailSubject: "Your PSW is Confirmed! - Booking {{booking_id}}",
    emailBody: `Hi {{client_name}},

Great news! A qualified PSW has claimed your booking.

{{#psw_photo_url}}
<div style="text-align: center; margin: 20px 0;">
  <img src="{{psw_photo_url}}" alt="Your PSW" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #0077B5;" />
  <p style="margin-top: 10px; font-weight: bold; color: #333;">{{psw_first_name}}</p>
</div>
{{/psw_photo_url}}

Booking Details:
📋 Booking ID: {{booking_id}}
📅 Date: {{job_date}}
⏰ Time: {{job_time}}
👤 Your PSW: {{psw_first_name}}

Your PSW will arrive at your location at the scheduled time.

IMPORTANT: Cancellations within 4 hours are non-refundable.

Questions or need to reschedule? Call our office at {{office_number}}

Thank you for choosing PSW Direct!`,
    smsText: "",
  },
  {
    id: "psw-arrived",
    name: "PSW Arrived",
    description: "Sent to client when PSW checks in at location",
    type: "email",
    emailSubject: "Your PSW Has Arrived - {{booking_id}}",
    emailBody: `Hi {{client_name}},

Your caregiver {{psw_first_name}} has just checked in and is now with your loved one.

{{#psw_photo_url}}
<div style="text-align: center; margin: 20px 0;">
  <img src="{{psw_photo_url}}" alt="Your PSW" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #28a745;" />
</div>
{{/psw_photo_url}}

📋 Booking ID: {{booking_id}}
📅 Date: {{job_date}}
⏰ Check-in Time: {{job_time}}
👤 PSW: {{psw_first_name}}

You will receive a care summary report when the visit is complete.

If you have any concerns during the visit, please contact our office at {{office_number}}

Thank you for choosing PSW Direct!`,
    smsText: "",
  },
  {
    id: "care-sheet-delivery",
    name: "Care Sheet Delivery",
    description: "Post-visit summary sent to the client after PSW signs out",
    type: "email",
    emailSubject: "Care Visit Summary - {{job_date}}",
    emailBody: `Hi {{client_name}},

Here's a summary of today's care visit:

📅 Date: {{job_date}}
👤 PSW: {{psw_first_name}}

Tasks Completed:
{{tasks_completed}}

Observations:
{{observations}}`,
    smsText: "",
  },
  {
    id: "hospital-discharge-delivery",
    name: "Hospital Discharge Delivery",
    description: "Sent to client when patient is discharged from hospital with PSW care",
    type: "email",
    emailSubject: "Hospital Discharge Summary - {{job_date}}",
    emailBody: `Hi {{client_name}},

Your loved one has been safely discharged from the hospital and is now home with the care of {{psw_first_name}}.

{{#psw_photo_url}}
<div style="text-align: center; margin: 20px 0;">
  <img src="{{psw_photo_url}}" alt="Your PSW" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #0077B5;" />
  <p style="margin-top: 10px; font-weight: bold; color: #333;">{{psw_first_name}}</p>
</div>
{{/psw_photo_url}}

📅 Date: {{job_date}}
🏥 Discharge From: Hospital
👤 Caregiver: {{psw_first_name}}

<div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 16px; margin: 20px 0;">
  <strong>📎 Discharge Papers Attached</strong>
  <p style="margin: 8px 0 0 0; font-size: 14px;">The official hospital discharge documents are attached to this email for your records.</p>
</div>

Tasks Completed:
{{tasks_completed}}

Observations:
{{observations}}

If you have any questions about the discharge instructions or ongoing care, please contact our office at {{office_number}}.

Thank you for choosing PSW Direct!`,
    smsText: "",
  },
];

// Get templates from localStorage or defaults
export const getTemplates = (): MessageTemplate[] => {
  const stored = localStorage.getItem("pswdirect_message_templates");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_TEMPLATES;
    }
  }
  return DEFAULT_TEMPLATES;
};

// Save templates to localStorage
export const saveTemplates = (templates: MessageTemplate[]): void => {
  localStorage.setItem("pswdirect_message_templates", JSON.stringify(templates));
};

// Update a single template
export const updateTemplate = (templateId: string, updates: Partial<MessageTemplate>): MessageTemplate[] => {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === templateId);
  if (index !== -1) {
    templates[index] = { ...templates[index], ...updates };
    saveTemplates(templates);
  }
  return templates;
};

// Create a new custom template
export const createTemplate = (template: Omit<MessageTemplate, "id" | "isCustom">): MessageTemplate[] => {
  const templates = getTemplates();
  const newTemplate: MessageTemplate = {
    ...template,
    id: `custom-${Date.now()}`,
    isCustom: true,
  };
  templates.push(newTemplate);
  saveTemplates(templates);
  return templates;
};

// Delete a template (only custom templates can be deleted)
export const deleteTemplate = (templateId: string): MessageTemplate[] => {
  const templates = getTemplates();
  const template = templates.find(t => t.id === templateId);
  
  // Only allow deleting custom templates
  if (template?.isCustom) {
    const filtered = templates.filter(t => t.id !== templateId);
    saveTemplates(filtered);
    return filtered;
  }
  
  return templates;
};

// Duplicate a template
export const duplicateTemplate = (templateId: string): MessageTemplate[] => {
  const templates = getTemplates();
  const original = templates.find(t => t.id === templateId);
  
  if (original) {
    const duplicate: MessageTemplate = {
      ...original,
      id: `custom-${Date.now()}`,
      name: `${original.name} (Copy)`,
      isCustom: true,
    };
    templates.push(duplicate);
    saveTemplates(templates);
  }
  
  return templates;
};

// Reset templates to defaults
export const resetTemplates = (): MessageTemplate[] => {
  saveTemplates(DEFAULT_TEMPLATES);
  return DEFAULT_TEMPLATES;
};

// Replace placeholders in a template string
// Supports conditional blocks: {{#field}}...{{/field}} - shown only if field has a value
export const replacePlaceholders = (
  template: string,
  data: Record<string, string>
): string => {
  let result = template;
  
  // Always include office number
  if (!data.office_number) {
    data.office_number = getOfficeNumber();
  }
  
  // Handle conditional blocks: {{#field}}content{{/field}}
  // If field exists and has value, show content; otherwise remove entire block
  const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(conditionalRegex, (match, field, content) => {
    if (data[field] && data[field].trim()) {
      // Field has value - render content with placeholders replaced
      return content;
    }
    // Field is empty - remove the entire block
    return '';
  });
  
  // Replace standard placeholders
  Object.entries(data).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  return result;
};

// Get a specific template by ID
export const getTemplate = (templateId: string): MessageTemplate | undefined => {
  return getTemplates().find(t => t.id === templateId);
};

// Office number configuration stored in localStorage
export interface OfficeConfig {
  officeNumber: string;
}

const DEFAULT_OFFICE_CONFIG: OfficeConfig = {
  officeNumber: DEFAULT_OFFICE_NUMBER,
};

// Get office config from localStorage
export const getOfficeConfig = (): OfficeConfig => {
  const stored = localStorage.getItem("pswdirect_office_config");
  if (stored) {
    try {
      return { ...DEFAULT_OFFICE_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_OFFICE_CONFIG;
    }
  }
  return DEFAULT_OFFICE_CONFIG;
};

// Save office config to localStorage
export const saveOfficeConfig = (config: Partial<OfficeConfig>): OfficeConfig => {
  const current = getOfficeConfig();
  const updated = { ...current, ...config };
  localStorage.setItem("pswdirect_office_config", JSON.stringify(updated));
  return updated;
};

// Get office number
export const getOfficeNumber = (): string => {
  return getOfficeConfig().officeNumber || DEFAULT_OFFICE_NUMBER;
};

// API config interface for email settings
export interface APIConfig {
  emailApiKey: string;
  emailProvider: "resend" | "sendgrid";
  officeNumber: string;
}

// Get API config - returns config with office number only
// API keys should be configured as secrets, not stored here
export const getAPIConfig = (): APIConfig => {
  const officeConfig = getOfficeConfig();
  return {
    emailApiKey: "",
    emailProvider: "resend",
    officeNumber: officeConfig.officeNumber,
  };
};

// Save API config - only saves office number, ignores API keys
export const saveAPIConfig = (config: Partial<APIConfig>): APIConfig => {
  if (config.officeNumber) {
    saveOfficeConfig({ officeNumber: config.officeNumber });
  }
  return getAPIConfig();
};

// Email is configured if the RESEND_API_KEY secret exists (checked server-side)
export const isEmailConfigured = (): boolean => {
  return true; // Secret is configured server-side
};

// Notification recipients management
export interface NotificationRecipients {
  adminCc: string[];
  alertRecipients: string[];
}

const DEFAULT_RECIPIENTS: NotificationRecipients = {
  adminCc: [],
  alertRecipients: ["admin@pswdirect.ca"],
};

export const getNotificationRecipients = (): NotificationRecipients => {
  const stored = localStorage.getItem("pswdirect_notification_recipients");
  if (stored) {
    try {
      return { ...DEFAULT_RECIPIENTS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_RECIPIENTS;
    }
  }
  return DEFAULT_RECIPIENTS;
};

export const saveNotificationRecipients = (recipients: NotificationRecipients): void => {
  localStorage.setItem("pswdirect_notification_recipients", JSON.stringify(recipients));
};
