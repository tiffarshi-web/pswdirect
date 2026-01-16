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
}

// Available placeholder tags
export const PLACEHOLDER_TAGS = [
  { tag: "{{client_name}}", description: "Client's full name" },
  { tag: "{{psw_first_name}}", description: "PSW's first name only" },
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
export const DEFAULT_OFFICE_NUMBER = "(613) 555-0100";

// Privacy footer (hard-coded, cannot be edited)
export const PRIVACY_FOOTER = `
---
For your privacy, please use our office number for all follow-up communication. Do not contact the PSW directly.
Office: {{office_number}}`;

// Default templates
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "psw-signup",
    name: "New PSW Sign-up",
    description: "Welcome message sent when a PSW submits their application",
    type: "email",
    emailSubject: "Welcome to PSW Direct! 🎉",
    emailBody: `Hi {{psw_first_name}},

Welcome to PSW Direct! Your application has been received and is under review.

Once approved, you'll be able to:
- View and claim available shifts in your area
- Track your earnings and hours
- Connect with clients who need your care

Our team will review your credentials within 2-3 business days.

Questions? Call us at {{office_number}}

Best regards,
The PSW Direct Team`,
    smsText: "",
  },
  {
    id: "psw-approved",
    name: "PSW Approved",
    description: "Welcome to the team message with shift warning",
    type: "email",
    emailSubject: "You're Approved! Welcome to the PSW Direct Team 🎊",
    emailBody: `Hi {{psw_first_name}},

Congratulations! Your application has been approved and you're now part of the PSW Direct team.

You can now:
✅ View and claim available shifts in your area
✅ Track your earnings and completed visits
✅ Build your reputation with client reviews

⚠️ IMPORTANT PROFESSIONAL STANDARDS:
By accepting shifts, you agree to arrive on time and complete all scheduled visits. Any missed or late shifts will result in immediate removal from the platform.

Open the app to view available shifts near you!

Questions? Call us at {{office_number}}

Welcome aboard!
The PSW Direct Team`,
    smsText: "",
  },
  {
    id: "new-job-alert",
    name: "New Job Alert",
    description: "Sent to all vetted PSWs when a new booking is available",
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
    id: "job-claimed",
    name: "Job Claimed",
    description: "Sent to the client when a PSW claims their booking",
    type: "email",
    emailSubject: "Your PSW is Confirmed! - Booking {{booking_id}}",
    emailBody: `Hi {{client_name}},

Great news! A qualified PSW has claimed your booking.

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

// Reset templates to defaults
export const resetTemplates = (): MessageTemplate[] => {
  saveTemplates(DEFAULT_TEMPLATES);
  return DEFAULT_TEMPLATES;
};

// Replace placeholders in a template string
export const replacePlaceholders = (
  template: string,
  data: Record<string, string>
): string => {
  let result = template;
  
  // Always include office number
  if (!data.office_number) {
    data.office_number = getOfficeNumber();
  }
  
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
