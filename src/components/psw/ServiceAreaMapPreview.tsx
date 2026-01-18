// Service Area Map Preview - Shows 1km radius circle for privacy before job claim
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import { MapPin, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCoordinatesFromPostalCode } from "@/lib/postalCodeUtils";
import "leaflet/dist/leaflet.css";

interface ServiceAreaMapPreviewProps {
  postalCode: string;
  cityName?: string;
}

// Component to recenter map when coordinates change
const MapRecenter = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
};

export const ServiceAreaMapPreview = ({ postalCode, cityName }: ServiceAreaMapPreviewProps) => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (postalCode) {
      const coords = getCoordinatesFromPostalCode(postalCode);
      if (coords) {
        // Add slight random offset for privacy (up to 500m)
        const offsetLat = (Math.random() - 0.5) * 0.009; // ~500m
        const offsetLng = (Math.random() - 0.5) * 0.012; // ~500m
        setCoordinates({
          lat: coords.lat + offsetLat,
          lng: coords.lng + offsetLng,
        });
      }
    }
  }, [postalCode]);

  if (!coordinates) {
    return (
      <div className="h-24 bg-muted rounded-lg flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <MapPin className="w-4 h-4" />
          <span>{cityName || "Location preview unavailable"}</span>
        </div>
      </div>
    );
  }

  const MapContent = ({ height = "h-24" }: { height?: string }) => (
    <MapContainer
      center={[coordinates.lat, coordinates.lng]}
      zoom={13}
      scrollWheelZoom={false}
      dragging={isExpanded}
      zoomControl={isExpanded}
      className={`${height} w-full rounded-lg`}
      attributionControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapRecenter lat={coordinates.lat} lng={coordinates.lng} />
      {/* 1km radius circle */}
      <Circle
        center={[coordinates.lat, coordinates.lng]}
        radius={1000}
        pathOptions={{
          color: "#16a34a",
          fillColor: "#16a34a",
          fillOpacity: 0.15,
          weight: 2,
        }}
      />
    </MapContainer>
  );

  return (
    <>
      <div className="relative">
        <MapContent />
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-2 right-2 h-7 w-7 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsExpanded(true)}
        >
          <Maximize2 className="w-3 h-3" />
        </Button>
        <div className="absolute top-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1">
          <p className="text-xs font-medium text-foreground">{cityName || "Service Area"}</p>
          <p className="text-xs text-muted-foreground">~1km radius</p>
        </div>
      </div>

      {/* Expanded Map Dialog */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Service Area
            </DialogTitle>
          </DialogHeader>
          <div className="h-[400px] rounded-lg overflow-hidden">
            <MapContent height="h-full" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Exact address will be revealed after you accept this job
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
