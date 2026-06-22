// Shared popup contents for both Leaflet and Google admin map renderers.
// Renderers wrap these in their native popup container.

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, Copy, UserPlus } from "lucide-react";
import type { OrderBucket, OrderRow, PSWRow } from "./types";

export const bucketBadge = (b: OrderBucket) => {
  const map: Record<OrderBucket, { label: string; cls: string }> = {
    open: { label: "Open", cls: "bg-red-500/10 text-red-700 border-red-300" },
    pending: { label: "Pending Payment", cls: "bg-orange-500/10 text-orange-700 border-orange-300" },
    assigned: { label: "Assigned", cls: "bg-blue-500/10 text-blue-700 border-blue-300" },
    active: { label: "Active / Live", cls: "bg-green-500/10 text-green-700 border-green-300" },
    in_progress: { label: "In Progress", cls: "bg-purple-500/10 text-purple-700 border-purple-300" },
    unserved: { label: "Unserved", cls: "bg-yellow-500/10 text-yellow-700 border-yellow-300" },
    completed: { label: "Completed", cls: "bg-muted text-muted-foreground border-border" },
  };
  return <Badge variant="outline" className={map[b].cls}>{map[b].label}</Badge>;
};

export const PSWPopupContent = ({
  p,
  radiusVisible,
  onToggleRadius,
  onCopy,
}: {
  p: PSWRow;
  radiusVisible: boolean;
  onToggleRadius: (id: string) => void;
  onCopy: (text: string, label: string) => void;
}) => (
  <div className="text-sm min-w-[220px] space-y-1">
    <p className="font-semibold">{p.firstName} {p.lastName}</p>
    <p className="text-xs text-muted-foreground">
      {p.city || "Unknown"} · {p.postalCode}
    </p>
    <div className="flex flex-wrap gap-1 pt-1">
      <Badge variant="outline" className="text-[10px]">
        {p.status === "on_shift" ? "On shift" : "Available"}
      </Badge>
      {p.hasVehicle && (
        <Badge variant="outline" className="text-[10px]">
          <Car className="w-3 h-3 mr-1" /> Vehicle
        </Badge>
      )}
      {p.languages.slice(0, 3).map((l) => (
        <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
      ))}
      {p.gender && <Badge variant="outline" className="text-[10px]">{p.gender}</Badge>}
    </div>
    <p className="text-[11px] text-muted-foreground pt-1 break-all">{p.email}</p>
    {p.phone && <p className="text-[11px] text-muted-foreground break-all">{p.phone}</p>}
    <div className="flex gap-2 pt-2 flex-wrap">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCopy(p.email, "Email")}>
        <Copy className="w-3 h-3 mr-1" /> Email
      </Button>
      {p.phone && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCopy(p.phone, "Phone")}>
          <Copy className="w-3 h-3 mr-1" /> Phone
        </Button>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onToggleRadius(p.id)}>
        {radiusVisible ? "Hide" : "Show"} radius
      </Button>
    </div>
  </div>
);

export const OrderPopupContent = ({
  o,
  onCopy,
  onAssign,
}: {
  o: OrderRow;
  onCopy: (text: string, label: string) => void;
  onAssign: (order: OrderRow) => void;
}) => (
  <div className="text-sm min-w-[240px] space-y-1">
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold">{o.bookingCode}</span>
      {bucketBadge(o.bucket)}
    </div>
    <p className="text-xs">
      <span className="text-muted-foreground">Client:</span> {o.clientName}
    </p>
    {o.clientPhone && (
      <p className="text-[11px] text-muted-foreground break-all">{o.clientPhone}</p>
    )}
    {o.patientName && o.patientName !== o.clientName && (
      <p className="text-xs">
        <span className="text-muted-foreground">Patient:</span> {o.patientName}
      </p>
    )}
    <p className="text-xs text-muted-foreground">{o.serviceType.join(", ") || "General Care"}</p>
    <p className="text-xs">{o.scheduledDate} · {o.startTime}–{o.endTime}</p>
    <p className="text-xs text-muted-foreground">{o.city} · {o.postalCode || "—"}</p>
    <div className="flex flex-wrap gap-1 pt-1">
      {o.requiresVehicle && (
        <Badge variant="outline" className="text-[10px]">
          <Car className="w-3 h-3 mr-1" /> Vehicle req.
        </Badge>
      )}
      {o.preferredLanguages.slice(0, 3).map((l) => (
        <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
      ))}
    </div>
    {o.pswFirstName && (
      <p className="text-xs">
        <span className="text-muted-foreground">PSW:</span> {o.pswFirstName}
      </p>
    )}
    {o.pswPhone && (
      <p className="text-[11px] text-muted-foreground break-all">{o.pswPhone}</p>
    )}
    <div className="flex flex-wrap gap-2 pt-2">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCopy(o.bookingCode, "Booking code")}>
        <Copy className="w-3 h-3 mr-1" /> Code
      </Button>
      {o.clientPhone && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCopy(o.clientPhone!, "Client phone")}>
          <Copy className="w-3 h-3 mr-1" /> Client #
        </Button>
      )}
      {o.pswPhone && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onCopy(o.pswPhone!, "PSW phone")}>
          <Copy className="w-3 h-3 mr-1" /> PSW #
        </Button>
      )}
      {(o.bucket === "open" || o.bucket === "pending" || o.bucket === "unserved") && (
        <Button size="sm" variant="brand" className="h-7 text-xs" onClick={() => onAssign(o)}>
          <UserPlus className="w-3 h-3 mr-1" /> Assign PSW
        </Button>
      )}
    </div>
  </div>
);
