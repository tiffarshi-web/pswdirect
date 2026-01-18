// Messaging Templates Section for Admin Panel
// Allows editing of email and SMS templates with dynamic placeholders

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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  getTemplates,
  saveTemplates,
  resetTemplates,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  PLACEHOLDER_TAGS,
  PRIVACY_FOOTER,
  getNotificationRecipients,
  saveNotificationRecipients,
  type MessageTemplate,
  type NotificationRecipients,
} from "@/lib/messageTemplates";
import { EmailHistoryTab } from "./EmailHistoryTab";

export const MessagingTemplatesSection = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>(getTemplates());
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<"templates" | "history" | "recipients">("templates");
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<NotificationRecipients>(getNotificationRecipients());
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [recipientType, setRecipientType] = useState<"adminCc" | "alertRecipients">("adminCc");

  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    emailSubject: "",
    emailBody: "",
    type: "email" as "email" | "sms" | "both",
  });

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

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

  const handleSave = () => {
    saveTemplates(templates);
    setHasChanges(false);
    toast.success("Templates saved successfully!");
  };

  const handleReset = () => {
    const defaultTemplates = resetTemplates();
    setTemplates(defaultTemplates);
    setHasChanges(false);
    toast.info("Templates reset to defaults");
  };

  const copyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }
    const updated = createTemplate({
      ...newTemplate,
      smsText: "",
    });
    setTemplates(updated);
    setShowNewTemplateDialog(false);
    setNewTemplate({
      name: "",
      description: "",
      emailSubject: "",
      emailBody: "",
      type: "email",
    });
    toast.success("Template created!");
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = deleteTemplate(templateId);
    setTemplates(updated);
    setDeleteConfirmId(null);
    toast.success("Template deleted");
  };

  const handleDuplicateTemplate = (templateId: string) => {
    const updated = duplicateTemplate(templateId);
    setTemplates(updated);
    toast.success("Template duplicated");
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
                disabled={!hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
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
                              {template.id === "care-sheet-delivery" && (
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
