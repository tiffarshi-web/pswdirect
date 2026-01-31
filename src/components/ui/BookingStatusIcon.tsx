// Booking Status Icon Component
// Displays visual icons based on booking status

import { Clock, CheckCircle2, Car, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingStatus = "pending" | "active" | "in-progress" | "completed" | "cancelled" | "archived";

interface BookingStatusIconProps {
  status: string;
  pswAssigned?: string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const getBookingStatusInfo = (status: string, pswAssigned?: string | null) => {
  // In-progress takes precedence
  if (status === "in-progress") {
    return {
      icon: Car,
      label: "In Progress",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      borderColor: "border-blue-300 dark:border-blue-700",
    };
  }
  
  // If PSW is assigned (active/confirmed status)
  if (pswAssigned && (status === "active" || status === "confirmed")) {
    return {
      icon: CheckCircle2,
      label: "Confirmed",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      borderColor: "border-green-300 dark:border-green-700",
    };
  }
  
  // Pending (no PSW assigned yet)
  if (status === "pending") {
    return {
      icon: Clock,
      label: "Pending",
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      borderColor: "border-amber-300 dark:border-amber-700",
    };
  }
  
  // Completed
  if (status === "completed") {
    return {
      icon: CheckCircle2,
      label: "Completed",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      borderColor: "border-green-300 dark:border-green-700",
    };
  }
  
  // Archived
  if (status === "archived") {
    return {
      icon: Archive,
      label: "Archived",
      color: "text-muted-foreground",
      bgColor: "bg-muted/50",
      borderColor: "border-muted",
    };
  }
  
  // Default/cancelled
  return {
    icon: Clock,
    label: status,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
  };
};

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const containerSizeClasses = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

export const BookingStatusIcon = ({
  status,
  pswAssigned,
  size = "md",
  showLabel = false,
  className,
}: BookingStatusIconProps) => {
  const statusInfo = getBookingStatusInfo(status, pswAssigned);
  const Icon = statusInfo.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          containerSizeClasses[size],
          statusInfo.bgColor
        )}
      >
        <Icon className={cn(sizeClasses[size], statusInfo.color)} />
      </div>
      {showLabel && (
        <span className={cn("text-sm font-medium", statusInfo.color)}>
          {statusInfo.label}
        </span>
      )}
    </div>
  );
};

export default BookingStatusIcon;
