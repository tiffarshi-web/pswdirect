import { useState } from "react";
import { Check, X, Clock, Mail, Phone, Award, Car, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface PendingPSW {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  yearsExperience: string;
  certifications: string;
  hasOwnTransport: string;
  availableShifts: string;
  coverLetter: string;
  appliedAt: string;
}

// Mock pending PSWs
const mockPendingPSWs: PendingPSW[] = [
  {
    id: "pending-1",
    firstName: "Emily",
    lastName: "Chen",
    email: "emily.chen@email.com",
    phone: "(416) 555-7890",
    yearsExperience: "3-5",
    certifications: "PSW Certificate, CPR, First Aid, Dementia Care",
    hasOwnTransport: "yes-car",
    availableShifts: "flexible",
    coverLetter: "I am passionate about providing compassionate care to seniors. I have experience with dementia patients and palliative care.",
    appliedAt: "2025-01-12T10:30:00Z",
  },
  {
    id: "pending-2",
    firstName: "Michael",
    lastName: "Brown",
    email: "michael.brown@email.com",
    phone: "(647) 555-4321",
    yearsExperience: "1-3",
    certifications: "PSW Certificate, First Aid",
    hasOwnTransport: "yes-transit",
    availableShifts: "weekdays",
    coverLetter: "Recently completed my PSW training and eager to start my career in healthcare.",
    appliedAt: "2025-01-11T14:15:00Z",
  },
];

export const PendingPSWSection = () => {
  const [pendingPSWs, setPendingPSWs] = useState<PendingPSW[]>(mockPendingPSWs);
  const [selectedPSW, setSelectedPSW] = useState<PendingPSW | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApprove = (psw: PendingPSW) => {
    setSelectedPSW(psw);
    setShowApproveDialog(true);
  };

  const handleReject = (psw: PendingPSW) => {
    setSelectedPSW(psw);
    setShowRejectDialog(true);
  };

  const confirmApprove = () => {
    if (!selectedPSW) return;
    
    // Remove from pending list
    setPendingPSWs(prev => prev.filter(p => p.id !== selectedPSW.id));
    
    toast.success(`${selectedPSW.firstName} ${selectedPSW.lastName} has been approved!`, {
      description: "Welcome email with platform policies has been sent.",
    });
    
    setShowApproveDialog(false);
    setSelectedPSW(null);
  };

  const confirmReject = () => {
    if (!selectedPSW) return;
    
    // Remove from pending list
    setPendingPSWs(prev => prev.filter(p => p.id !== selectedPSW.id));
    
    toast.success(`Application from ${selectedPSW.firstName} ${selectedPSW.lastName} has been rejected.`);
    
    setShowRejectDialog(false);
    setSelectedPSW(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getExperienceLabel = (exp: string) => {
    switch (exp) {
      case "0-1": return "< 1 year";
      case "1-3": return "1-3 years";
      case "3-5": return "3-5 years";
      case "5+": return "5+ years";
      default: return exp;
    }
  };

  const getTransportLabel = (transport: string) => {
    switch (transport) {
      case "yes-car": return "Has car";
      case "yes-transit": return "Public transit";
      case "no": return "No transportation";
      default: return transport;
    }
  };

  const getAvailabilityLabel = (availability: string) => {
    switch (availability) {
      case "weekdays": return "Weekdays only";
      case "weekends": return "Weekends only";
      case "flexible": return "Flexible";
      case "evenings": return "Evenings only";
      default: return availability;
    }
  };

  if (pendingPSWs.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Pending Applications</h3>
          <p className="text-muted-foreground">
            All PSW applications have been reviewed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Pending PSW Applications</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve new PSW applicants
        </p>
      </div>

      {/* Stats */}
      <Card className="shadow-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingPSWs.length}</p>
                <p className="text-sm text-muted-foreground">Awaiting Review</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending List */}
      <div className="space-y-4">
        {pendingPSWs.map((psw) => {
          const isExpanded = expandedId === psw.id;
          
          return (
            <Card key={psw.id} className="shadow-card overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {psw.firstName[0]}{psw.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {psw.firstName} {psw.lastName}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Applied {formatDate(psw.appliedAt)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Contact Info */}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {psw.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {psw.phone}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Award className="w-3 h-3" />
                    {getExperienceLabel(psw.yearsExperience)}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Car className="w-3 h-3" />
                    {getTransportLabel(psw.hasOwnTransport)}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Calendar className="w-3 h-3" />
                    {getAvailabilityLabel(psw.availableShifts)}
                  </Badge>
                </div>

                {/* Expandable Details */}
                {isExpanded && (
                  <div className="pt-4 border-t border-border space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Certifications</p>
                      <p className="text-sm text-muted-foreground">{psw.certifications}</p>
                    </div>
                    {psw.coverLetter && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">Cover Letter</p>
                        <p className="text-sm text-muted-foreground">{psw.coverLetter}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : psw.id)}
                  >
                    {isExpanded ? "Show Less" : "View Details"}
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(psw)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    variant="brand"
                    size="sm"
                    onClick={() => handleApprove(psw)}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve PSW Application</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to approve <strong>{selectedPSW?.firstName} {selectedPSW?.lastName}</strong> as a PSW on the platform.
              </p>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-foreground mb-1">This will:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Grant full access to the PSW portal</li>
                  <li>Allow them to view and accept shifts</li>
                  <li>Send a welcome email with the platform policy</li>
                  <li>Include the "Removal from Platform" policy</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} className="bg-primary">
              Approve & Send Welcome Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the application from{" "}
              <strong>{selectedPSW?.firstName} {selectedPSW?.lastName}</strong>?
              They will be notified via email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reject Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
