// Email History Tab - Shows all sent emails from the database with view and recall
import { useState, useEffect } from "react";
import { Mail, RefreshCw, Search, CheckCircle, XCircle, Clock, Eye, RotateCcw, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface EmailLog {
  id: string;
  created_at: string;
  template_id: string | null;
  template_name: string | null;
  recipient_email: string;
  subject: string;
  body: string | null;
  status: string;
  error_message: string | null;
  is_recalled: boolean | null;
  recalled_at: string | null;
  recall_reason: string | null;
}

export const EmailHistoryTab = () => {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTemplate, setFilterTemplate] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRecallDialog, setShowRecallDialog] = useState(false);
  const [recallReason, setRecallReason] = useState("");
  const [isRecalling, setIsRecalling] = useState(false);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setEmails((data || []) as EmailLog[]);
    } catch (error) {
      console.error("Failed to fetch email logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.recipient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (email.template_name?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterTemplate === "all" || 
      (filterTemplate === "care-sheet" && email.template_name?.toLowerCase().includes("care")) ||
      email.template_name === filterTemplate;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (email: EmailLog) => {
    if (email.is_recalled) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          <RotateCcw className="w-3 h-3 mr-1" />
          Recalled
        </Badge>
      );
    }
    
    switch (email.status) {
      case "sent":
        return (
          <Badge variant="default" className="bg-emerald-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            {email.status}
          </Badge>
        );
    }
  };

  const handleViewEmail = (email: EmailLog) => {
    setSelectedEmail(email);
    setShowViewDialog(true);
  };

  const handleRecallClick = (email: EmailLog) => {
    setSelectedEmail(email);
    setRecallReason("");
    setShowRecallDialog(true);
  };

  const handleConfirmRecall = async () => {
    if (!selectedEmail) return;
    
    setIsRecalling(true);
    try {
      const { error } = await supabase
        .from("email_logs")
        .update({
          is_recalled: true,
          recalled_at: new Date().toISOString(),
          recall_reason: recallReason || "No reason provided",
        })
        .eq("id", selectedEmail.id);

      if (error) throw error;

      toast.success("Email marked as recalled", {
        description: "A correction notice can be sent manually if needed.",
      });
      
      setShowRecallDialog(false);
      fetchEmails();
    } catch (error) {
      console.error("Failed to recall email:", error);
      toast.error("Failed to recall email");
    } finally {
      setIsRecalling(false);
    }
  };

  // Get unique template names for filter
  const templateNames = [...new Set(emails.map(e => e.template_name).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search emails by recipient, subject, or template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={filterTemplate} onValueChange={setFilterTemplate}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              <SelectItem value="care-sheet">Care Sheet Reports</SelectItem>
              {templateNames.map((name) => (
                <SelectItem key={name} value={name!}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchEmails} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg">No emails found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || filterTemplate !== "all"
                  ? "Try adjusting your search or filter"
                  : "Sent emails will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEmails.map((email) => (
              <Card key={email.id} className={`hover:bg-muted/50 transition-colors ${email.is_recalled ? "opacity-75" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{email.subject}</span>
                        {email.template_name && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {email.template_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        To: {email.recipient_email}
                      </p>
                      {email.error_message && (
                        <p className="text-xs text-destructive mt-1 truncate">
                          Error: {email.error_message}
                        </p>
                      )}
                      {email.is_recalled && email.recall_reason && (
                        <p className="text-xs text-amber-600 mt-1">
                          Recall reason: {email.recall_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {getStatusBadge(email)}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(email.created_at), "MMM d, h:mm a")}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleViewEmail(email)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        {email.status === "sent" && !email.is_recalled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-amber-600 hover:text-amber-700"
                            onClick={() => handleRecallClick(email)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Recall
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      <p className="text-xs text-muted-foreground text-center">
        Showing last 100 emails
      </p>

      {/* View Email Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedEmail?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">To:</span>{" "}
                <span className="font-medium">{selectedEmail?.recipient_email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Sent:</span>{" "}
                <span className="font-medium">
                  {selectedEmail?.created_at && format(new Date(selectedEmail.created_at), "PPpp")}
                </span>
              </div>
              {selectedEmail?.template_name && (
                <div>
                  <span className="text-muted-foreground">Template:</span>{" "}
                  <Badge variant="outline">{selectedEmail.template_name}</Badge>
                </div>
              )}
            </div>
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              {selectedEmail?.body ? (
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              ) : (
                <p className="text-muted-foreground italic">Email body not available</p>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recall Email Dialog */}
      <Dialog open={showRecallDialog} onOpenChange={setShowRecallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="w-5 h-5" />
              Recall Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Mark this email as recalled. This does not unsend the email but records it as needing correction.
            </p>
            <div className="space-y-2">
              <Label>Reason for recall (optional)</Label>
              <Textarea
                placeholder="e.g., Incorrect information, wrong recipient..."
                value={recallReason}
                onChange={(e) => setRecallReason(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">Email to recall:</p>
              <p className="text-muted-foreground">{selectedEmail?.subject}</p>
              <p className="text-muted-foreground">To: {selectedEmail?.recipient_email}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecallDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="default" 
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleConfirmRecall}
              disabled={isRecalling}
            >
              {isRecalling ? "Recalling..." : "Confirm Recall"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
