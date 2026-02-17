// Messaging Templates Section for Admin Panel
// Allows editing of email and SMS templates with dynamic placeholders
// Templates are persisted in Supabase message_templates table

import { useState, useEffect } from "react";
import {
  Mail,
  MessageSquare,
  Save,
  RotateCcw,
  Tag,
  Copy,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  History,
  FileText,
  CopyPlus,
  Users,
  X,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  PLACEHOLDER_TAGS,
  PRIVACY_FOOTER,
  getNotificationRecipients,
  saveNotificationRecipients,
  type MessageTemplate,
  type NotificationRecipients,
  DEFAULT_TEMPLATES,
} from "@/lib/messageTemplates";
import { EmailHistoryTab } from "./EmailHistoryTab";
import { supabase } from "@/integrations/supabase/client";

// Map from old template IDs to stable template_key values
const TEMPLATE_KEY_MAP: Record<string, string> = {
  "psa-signup": "new_psa_signup",
  "psw-signup": "new_psa_signup",
  "psa-approved": "psa_approved",
  "psw-approved": "psa_approved",
  "new-job-alert": "new_job_alert",
  "booking-confirmation": "booking_confirmation",
  "job-claimed": "job_claimed",
  "psw-arrived": "psw_arrived",
  "care-sheet-delivery": "care_sheet_delivery",
  "hospital-discharge-delivery": "hospital_discharge_delivery",
};

// Convert DB row to MessageTemplate
interface DbTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string;
  channel: string;
  enabled: boolean;
  subject: string;
  html: string;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

const dbToLocal = (row: DbTemplate): MessageTemplate => ({
  id: row.template_key,
  name: row.name,
  description: row.description || "",
  emailSubject: row.subject,
  emailBody: row.html,
  smsText: "",
  type: (row.channel as "email" | "sms" | "both") || "email",
  isCustom: row.is_custom,
});

const localToDbRow = (t: MessageTemplate) => ({
  template_key: TEMPLATE_KEY_MAP[t.id] || t.id,
  name: t.name,
  description: t.description,
  channel: t.type,
  enabled: true,
  subject: t.emailSubject,
  html: t.emailBody,
  is_custom: t.isCustom || false,
});

export const MessagingTemplatesSection = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"templates" | "history" | "recipients">("templates");
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<NotificationRecipients>(getNotificationRecipients());
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [recipientType, setRecipientType] = useState<"adminCc" | "alertRecipients">("adminCc");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    emailSubject: "",
    emailBody: "",
    type: "email" as "email" | "sms" | "both",
  });

  // Load templates from Supabase on mount
  useEffect(() => {
    loadTemplatesFromDB();
  }, []);

  const loadTemplatesFromDB = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("name");

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed defaults
        await seedDefaults();
        return;
      }

      setTemplates((data as DbTemplate[]).map(dbToLocal));
    } catch (err: any) {
      console.error("Failed to load templates:", err);
      toast.error("Failed to load templates from database");
      // Fallback to code defaults
      setTemplates(DEFAULT_TEMPLATES);
    } finally {
      setIsLoading(false);
    }
  };

  const seedDefaults = async () => {
    try {
      const rows = DEFAULT_TEMPLATES.map(localToDbRow);
      const { error } = await supabase
        .from("message_templates")
        .upsert(rows, { onConflict: "template_key" });

      if (error) throw error;

      toast.success("Default templates seeded to database");
      await loadTemplatesFromDB();
    } catch (err: any) {
      console.error("Failed to seed defaults:", err);
      setTemplates(DEFAULT_TEMPLATES);
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (
    templateId: string,
    field: keyof MessageTemplate,
    value: string
  ) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === templateId ? { ...t, [field]: value } : t))
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const rows = templates.map(localToDbRow);
      const { error } = await supabase
        .from("message_templates")
        .upsert(rows, { onConflict: "template_key" });

      if (error) throw error;

      setHasChanges(false);
      toast.success("Templates saved to database!");
    } catch (err: any) {
      console.error("Failed to save templates:", err);
      toast.error("Failed to save templates");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      // Delete all custom templates
      await supabase.from("message_templates").delete().eq("is_custom", true);
      // Upsert defaults
      const rows = DEFAULT_TEMPLATES.map(localToDbRow);
      await supabase
        .from("message_templates")
        .upsert(rows, { onConflict: "template_key" });

      await loadTemplatesFromDB();
      setHasChanges(false);
      toast.info("Templates reset to defaults");
    } catch (err: any) {
      console.error("Failed to reset:", err);
      toast.error("Failed to reset templates");
    }
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    const key = `custom_${Date.now()}`;
    const row = {
      template_key: key,
      name: newTemplate.name,
      description: newTemplate.description,
      channel: newTemplate.type,
      enabled: true,
      subject: newTemplate.emailSubject,
      html: newTemplate.emailBody,
      is_custom: true,
    };

    try {
      const { error } = await supabase.from("message_templates").insert(row);
      if (error) throw error;

      await loadTemplatesFromDB();
      setShowNewTemplateDialog(false);
      setNewTemplate({ name: "", description: "", emailSubject: "", emailBody: "", type: "email" });
      toast.success("Template created!");
    } catch (err: any) {
      console.error("Failed to create template:", err);
      toast.error("Failed to create template");
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const templateKey = TEMPLATE_KEY_MAP[templateId] || templateId;
    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("template_key", templateKey)
        .eq("is_custom", true);

      if (error) throw error;

      await loadTemplatesFromDB();
      setDeleteConfirmId(null);
      toast.success("Template deleted");
    } catch (err: any) {
      console.error("Failed to delete:", err);
      toast.error("Failed to delete template");
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    const original = templates.find((t) => t.id === templateId);
    if (!original) return;

    const key = `custom_${Date.now()}`;
    const row = {
      template_key: key,
      name: `${original.name} (Copy)`,
      description: original.description,
      channel: original.type,
      enabled: true,
      subject: original.emailSubject,
      html: original.emailBody,
      is_custom: true,
    };

    try {
      const { error } = await supabase.from("message_templates").insert(row);
      if (error) throw error;
      await loadTemplatesFromDB();
      toast.success("Template duplicated");
    } catch (err: any) {
      console.error("Failed to duplicate:", err);
      toast.error("Failed to duplicate template");
    }
  };

  const handleAddRecipient = () => {
    const email = newRecipientEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (recipients[recipientType].includes(email)) {
      toast.error("Email already added");
      return;
    }
    const updated = {
      ...recipients,
      [recipientType]: [...recipients[recipientType], email],
    };
    setRecipients(updated);
    saveNotificationRecipients(updated);
    setNewRecipientEmail("");
    toast.success("Recipient added");
  };

  const handleRemoveRecipient = (type: "adminCc" | "alertRecipients", email: string) => {
    const updated = {
      ...recipients,
      [type]: recipients[type].filter((e) => e !== email),
    };
    setRecipients(updated);
    saveNotificationRecipients(updated);
  };

  const getTypeIcon = (type: MessageTemplate["type"]) => {
    switch (type) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "both":
        return (
          <div className="flex gap-1">
            <Mail className="w-4 h-4" />
            <MessageSquare className="w-4 h-4" />
          </div>
        );
    }
  };

  const getTypeBadge = (type: MessageTemplate["type"]) => {
    switch (type) {
      case "email":
        return <Badge variant="secondary">Email Only</Badge>;
      case "sms":
        return <Badge variant="outline">SMS Only</Badge>;
      case "both":
        return <Badge>Email & SMS</Badge>;
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      {/* Header with Save/Reset */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-semibold">Message Templates</h2>
          <p className="text-sm text-muted-foreground">
            Customize automated emails and manage recipients
          </p>
        </div>
        <div className="flex gap-2">
          {activeMainTab === "templates" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewTemplateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeMainTab}
        onValueChange={(v) => setActiveMainTab(v as typeof activeMainTab)}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-3 shrink-0">
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Email History
          </TabsTrigger>
          <TabsTrigger value="recipients">
            <Users className="w-4 h-4 mr-2" />
            Recipients
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading templates...</span>
            </div>
          ) : (
          <div className="space-y-4">
              {/* Placeholder Tags Reference */}
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    <CardTitle className="text-base">Dynamic Placeholders</CardTitle>
                  </div>
                  <CardDescription>
                    Click to copy. These tags are automatically replaced with real
                    data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {PLACEHOLDER_TAGS.map(({ tag, description }) => (
                      <button
                        key={tag}
                        onClick={() => copyTag(tag)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-primary/10 rounded-md text-xs font-mono transition-colors group"
                        title={description}
                      >
                        {copiedTag === tag ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                        )}
                        {tag}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Template Editors */}
              <Accordion type="single" collapsible className="space-y-3">
                {templates.map((template) => (
                  <AccordionItem
                    key={template.id}
                    value={template.id}
                    className="border rounded-lg shadow-card overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-3 text-left flex-1">
                        <div className="text-muted-foreground">
                          {getTypeIcon(template.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{template.name}</p>
                            {template.isCustom && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                Custom
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {template.description}
                          </p>
                        </div>
                        {getTypeBadge(template.type)}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      {/* Action buttons */}
                      <div className="flex gap-2 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTemplate(template.id);
                          }}
                        >
                          <CopyPlus className="w-4 h-4 mr-2" />
                          Duplicate
                        </Button>
                        {template.isCustom && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(template.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        )}
                      </div>

                      <Tabs defaultValue="email" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger
                            value="email"
                            disabled={template.type === "sms"}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Email
                          </TabsTrigger>
                          <TabsTrigger
                            value="sms"
                            disabled={template.type === "email"}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            SMS
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="email" className="space-y-4">
                          {template.type !== "sms" && (
                            <>
                              <div className="space-y-2">
                                <Label htmlFor={`${template.id}-subject`}>
                                  Email Subject
                                </Label>
                                <Input
                                  id={`${template.id}-subject`}
                                  value={template.emailSubject}
                                  onChange={(e) =>
                                    handleTemplateChange(
                                      template.id,
                                      "emailSubject",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter email subject..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`${template.id}-body`}>
                                  Email Body
                                </Label>
                                <Textarea
                                  id={`${template.id}-body`}
                                  value={template.emailBody}
                                  onChange={(e) =>
                                    handleTemplateChange(
                                      template.id,
                                      "emailBody",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Enter email body..."
                                  rows={10}
                                  className="font-mono text-sm"
                                />
                              </div>

                              {/* Privacy Footer Notice */}
                              {(template.id === "care-sheet-delivery" || template.id === "care_sheet_delivery") && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                        Privacy Footer (Auto-Added)
                                      </p>
                                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-mono whitespace-pre-line">
                                        {PRIVACY_FOOTER}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </TabsContent>

                        <TabsContent value="sms" className="space-y-4">
                          {template.type !== "email" && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`${template.id}-sms`}>
                                  SMS Text
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                  {template.smsText.length} / 160 chars
                                </span>
                              </div>
                              <Textarea
                                id={`${template.id}-sms`}
                                value={template.smsText}
                                onChange={(e) =>
                                  handleTemplateChange(
                                    template.id,
                                    "smsText",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter SMS text..."
                                rows={3}
                                maxLength={320}
                              />
                              {template.smsText.length > 160 && (
                                <p className="text-xs text-amber-600">
                                  ⚠️ Message exceeds 160 characters and may be
                                  split into multiple SMS
                                </p>
                              )}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
          </div>
          )}
        </TabsContent>

        {/* Email History Tab */}
        <TabsContent value="history" className="mt-4">
          <EmailHistoryTab />
        </TabsContent>

        {/* Recipients Tab */}
        <TabsContent value="recipients" className="mt-4">
          <div className="space-y-6">
              {/* Admin CC */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin CC Recipients</CardTitle>
                  <CardDescription>
                    These emails will be CC'd on all client-facing notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter email address..."
                      value={recipientType === "adminCc" ? newRecipientEmail : ""}
                      onChange={(e) => {
                        setRecipientType("adminCc");
                        setNewRecipientEmail(e.target.value);
                      }}
                      onFocus={() => setRecipientType("adminCc")}
                    />
                    <Button
                      onClick={handleAddRecipient}
                      disabled={recipientType !== "adminCc"}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recipients.adminCc.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No CC recipients configured
                      </p>
                    ) : (
                      recipients.adminCc.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {email}
                          <button
                            onClick={() => handleRemoveRecipient("adminCc", email)}
                            className="ml-1 p-0.5 hover:bg-muted rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Alert Recipients */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Alert Recipients</CardTitle>
                  <CardDescription>
                    These emails receive overtime alerts and administrative
                    notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter email address..."
                      value={recipientType === "alertRecipients" ? newRecipientEmail : ""}
                      onChange={(e) => {
                        setRecipientType("alertRecipients");
                        setNewRecipientEmail(e.target.value);
                      }}
                      onFocus={() => setRecipientType("alertRecipients")}
                    />
                    <Button
                      onClick={handleAddRecipient}
                      disabled={recipientType !== "alertRecipients"}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recipients.alertRecipients.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No alert recipients configured
                      </p>
                    ) : (
                      recipients.alertRecipients.map((email) => (
                        <Badge
                          key={email}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {email}
                          <button
                            onClick={() =>
                              handleRemoveRecipient("alertRecipients", email)
                            }
                            className="ml-1 p-0.5 hover:bg-muted rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Template Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a custom email template for notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Template Name</Label>
              <Input
                id="new-name"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Follow-up Reminder"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-desc">Description</Label>
              <Input
                id="new-desc"
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Brief description of when this template is used"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-subject">Email Subject</Label>
              <Input
                id="new-subject"
                value={newTemplate.emailSubject}
                onChange={(e) =>
                  setNewTemplate((p) => ({ ...p, emailSubject: e.target.value }))
                }
                placeholder="Enter subject line..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-body">Email Body</Label>
              <Textarea
                id="new-body"
                value={newTemplate.emailBody}
                onChange={(e) =>
                  setNewTemplate((p) => ({ ...p, emailBody: e.target.value }))
                }
                placeholder="Enter email content... Use {{placeholders}} for dynamic data"
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewTemplateDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The template will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteTemplate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
