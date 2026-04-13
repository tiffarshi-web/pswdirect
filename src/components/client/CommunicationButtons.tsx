import { Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CommunicationButtonsProps {
  role: "client" | "psw";
  bookingId: string;
}

export const CommunicationButtons = ({ role, bookingId }: CommunicationButtonsProps) => {
  const handleCall = () => {
    toast.info("Calling will be available shortly. We are finalizing secure communication.", {
      duration: 4000,
    });
  };

  const handleMessage = () => {
    toast.info("Messaging will be available shortly. We are finalizing secure communication.", {
      duration: 4000,
    });
  };

  const targetLabel = role === "client" ? "PSW" : "Client";

  return (
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
  );
};
