// Shared types for admin map renderers (Leaflet + Google).
// Kept identical so the renderers are interchangeable behind UnifiedAdminMap.

export type OrderBucket =
  | "open"
  | "pending"
  | "assigned"
  | "active"
  | "unserved"
  | "completed";

export interface PSWRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  postalCode: string;
  languages: string[];
  hasVehicle: boolean;
  gender: string | null;
  status: "available" | "on_shift" | "assigned";
  coords: { lat: number; lng: number };
}

export interface OrderRow {
  id: string;
  bookingCode: string;
  clientName: string;
  clientPhone: string | null;
  patientName: string;
  serviceType: string[];
  scheduledDate: string;
  startTime: string;
  endTime: string;
  city: string;
  postalCode: string | null;
  preferredLanguages: string[];
  requiresVehicle: boolean;
  pswAssigned: string | null;
  pswFirstName: string | null;
  pswPhone: string | null;
  bucket: OrderBucket;
  coords: { lat: number; lng: number };
}

export interface MapViewTarget {
  lat: number;
  lng: number;
  zoom: number;
}

export interface AdminMapRendererProps {
  center: MapViewTarget;
  flyTarget: MapViewTarget | null;
  psws: PSWRow[];
  orders: OrderRow[];
  showRadii: boolean;
  visibleRadii: Set<string>;
  radiusKm: number;
  onToggleRadius: (id: string) => void;
  onCopy: (text: string, label: string) => void;
  onAssign: (order: OrderRow) => void;
}
