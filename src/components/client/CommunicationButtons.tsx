import { useState } from "react";
import { Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookingChatPanel } from "@/components/messaging/BookingChatPanel";

interface CommunicationButtonsProps {
  role: "client" | "psw";
  bookingId: string;
}

export const CommunicationButtons = ({ role, bookingId }: CommunicationButtonsProps) => {
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  const handleCall = () => {
    toast.info("Calling will be available shortly. We are finalizing secure communication.", {
      duration: 4000,
    });
  };

  const handleMessage = () => {
    setMessageDialogOpen(true);
  };

  const targetLabel = role === "client" ? "PSW" : "Client";

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleCall}
        >
          <Phone className="w-4 h-4 mr-2" />
          Call {targetLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleMessage}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Message {targetLabel}
        </Button>
      </div>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-w-[95vw] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message {targetLabel}
            </DialogTitle>
            <DialogDescription>
              Secure messaging stays inside PSW Direct. Phone numbers and email addresses are blocked.
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-4">
            <BookingChatPanel
              bookingId={bookingId}
              viewerRole={role}
              compact
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
