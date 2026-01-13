// Messaging Templates Section for Admin Panel
// Allows editing of email and SMS templates with dynamic placeholders

import { useState, useEffect } from "react";
import { Mail, MessageSquare, Save, RotateCcw, Tag, Copy, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  getTemplates,
  saveTemplates,
  resetTemplates,
  PLACEHOLDER_TAGS,
  PRIVACY_FOOTER,
  type MessageTemplate,
} from "@/lib/messageTemplates";

export const MessagingTemplatesSection = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>(getTemplates());
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const handleTemplateChange = (
    templateId: string,
    field: keyof MessageTemplate,
    value: string
  ) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === templateId ? { ...t, [field]: value } : t
      )
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
    <div className="space-y-6">
      {/* Header with Save/Reset */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Message Templates</h2>
          <p className="text-sm text-muted-foreground">
            Customize automated emails and SMS notifications
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      {/* Placeholder Tags Reference */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Dynamic Placeholders</CardTitle>
          </div>
          <CardDescription>
            Click to copy. These tags are automatically replaced with real data.
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
              <div className="flex items-center gap-3 text-left">
                <div className="text-muted-foreground">
                  {getTypeIcon(template.type)}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </div>
                {getTypeBadge(template.type)}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
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
                        <Label htmlFor={`${template.id}-sms`}>SMS Text</Label>
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
                          ⚠️ Message exceeds 160 characters and may be split into
                          multiple SMS
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

      {hasChanges && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50">
          <Button
            variant="brand"
            size="lg"
            onClick={handleSave}
            className="shadow-elevated"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};
