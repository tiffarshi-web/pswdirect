import { useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  FileText,
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getShifts, type ShiftRecord, type CareSheetData } from "@/lib/shiftStore";
import { getBookings, type BookingData } from "@/lib/bookingStore";
import { formatServiceType } from "@/lib/businessConfig";
import { format, parseISO } from "date-fns";

interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  completedOrders: number;
  activeOrders: number;
  lastServiceDate?: string;
  orders: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    services: string[];
    pswAssigned: string | null;
    careSheet?: CareSheetData & {
      isHospitalDischarge?: boolean;
      dischargeDocuments?: string;
    };
  }>;
}

export const ClientRecordsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [careSheetToView, setCareSheetToView] = useState<{
    careSheet: CareSheetData & { isHospitalDischarge?: boolean; dischargeDocuments?: string };
    orderId: string;
    date: string;
  } | null>(null);

  // Build client records from shifts and bookings
  const clientRecords = useMemo((): ClientRecord[] => {
    const shifts = getShifts();
    const bookings = getBookings();
    const clientMap = new Map<string, ClientRecord>();

    // Process bookings
    bookings.forEach(booking => {
      const clientKey = booking.orderingClient.email.toLowerCase();
      const existing = clientMap.get(clientKey);
      
      const order = {
        id: booking.id,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        services: booking.serviceType,
        pswAssigned: booking.pswAssigned,
      };

      if (existing) {
        existing.orders.push(order);
        if (booking.status === "completed") existing.completedOrders++;
        if (booking.status === "active" || booking.status === "pending") existing.activeOrders++;
      } else {
        clientMap.set(clientKey, {
          id: clientKey,
          name: booking.orderingClient.name,
          email: booking.orderingClient.email,
          phone: booking.orderingClient.phone,
          address: booking.orderingClient.address,
          postalCode: booking.orderingClient.postalCode,
          completedOrders: booking.status === "completed" ? 1 : 0,
          activeOrders: booking.status === "active" || booking.status === "pending" ? 1 : 0,
          orders: [order],
        });
      }
    });

    // Process shifts (for completed orders with care sheets)
    shifts.forEach(shift => {
      if (shift.careSheetEmailTo) {
        const clientKey = shift.careSheetEmailTo.toLowerCase();
        const existing = clientMap.get(clientKey);
        
        const order = {
          id: shift.id,
          date: shift.scheduledDate,
          startTime: shift.scheduledStart,
          endTime: shift.scheduledEnd,
          status: shift.status,
          services: shift.services,
          pswAssigned: shift.pswName,
          careSheet: shift.careSheet as CareSheetData & { isHospitalDischarge?: boolean; dischargeDocuments?: string },
        };

        if (existing) {
          // Check if this shift isn't already added via booking
          if (!existing.orders.find(o => o.id === shift.id)) {
            existing.orders.push(order);
            if (shift.status === "completed") existing.completedOrders++;
          } else {
            // Update existing order with care sheet
            const existingOrder = existing.orders.find(o => o.id === shift.id);
            if (existingOrder) {
              existingOrder.careSheet = shift.careSheet as CareSheetData & { isHospitalDischarge?: boolean; dischargeDocuments?: string };
            }
          }
          if (!existing.lastServiceDate || shift.scheduledDate > existing.lastServiceDate) {
            existing.lastServiceDate = shift.scheduledDate;
          }
        } else {
          clientMap.set(clientKey, {
            id: clientKey,
            name: shift.clientName,
            email: shift.careSheetEmailTo,
            phone: "",
            address: shift.patientAddress,
            postalCode: shift.postalCode,
            completedOrders: shift.status === "completed" ? 1 : 0,
            activeOrders: 0,
            lastServiceDate: shift.scheduledDate,
            orders: [order],
          });
        }
      }
    });

    // Sort orders by date for each client
    clientMap.forEach(client => {
      client.orders.sort((a, b) => b.date.localeCompare(a.date));
      if (client.orders.length > 0 && !client.lastServiceDate) {
        const completedOrder = client.orders.find(o => o.status === "completed");
        if (completedOrder) client.lastServiceDate = completedOrder.date;
      }
    });

    return Array.from(clientMap.values()).sort((a, b) => 
      (b.lastServiceDate || "").localeCompare(a.lastServiceDate || "")
    );
  }, []);

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clientRecords;
    
    const query = searchQuery.toLowerCase();
    return clientRecords.filter(client =>
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.phone.includes(query) ||
      client.postalCode.toLowerCase().includes(query)
    );
  }, [clientRecords, searchQuery]);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-primary/10 text-primary border-primary/30">Completed</Badge>;
      case "active":
      case "in-progress":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Client detail view
  if (selectedClient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">{selectedClient.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
          </div>
        </div>

        {/* Client Info Card */}
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{selectedClient.email}</span>
              </div>
              {selectedClient.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href={`tel:${selectedClient.phone}`} className="text-primary hover:underline">
                    {selectedClient.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm col-span-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{selectedClient.address}</span>
              </div>
            </div>
            <div className="flex gap-4 pt-3 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{selectedClient.completedOrders}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{selectedClient.activeOrders}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{selectedClient.orders.length}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order History */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Order History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedClient.orders.map(order => (
              <div 
                key={order.id} 
                className={`p-4 rounded-lg border ${
                  order.careSheet?.isHospitalDischarge 
                    ? "border-red-500 bg-red-50/50 dark:bg-red-950/20" 
                    : "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm">{order.id}</span>
                      {order.careSheet?.isHospitalDischarge && (
                        <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">
                          Hospital Discharge
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(order.date)}</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{order.startTime} - {order.endTime}</span>
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {order.services.map((service, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {typeof service === "string" && service.includes("-") 
                        ? formatServiceType(service) 
                        : service}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <div className="text-sm">
                    <span className="text-muted-foreground">PSW: </span>
                    <span className="font-medium">{order.pswAssigned || "Unassigned"}</span>
                  </div>
                  
                  {order.careSheet && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary"
                      onClick={() => setCareSheetToView({
                        careSheet: order.careSheet!,
                        orderId: order.id,
                        date: order.date,
                      })}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View Care Sheet
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Care Sheet Dialog */}
        <Dialog open={!!careSheetToView} onOpenChange={() => setCareSheetToView(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Care Sheet - {careSheetToView?.orderId}
              </DialogTitle>
            </DialogHeader>
            {careSheetToView && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {formatDate(careSheetToView.date)}
                </div>
                
                {careSheetToView.careSheet.isHospitalDischarge && (
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Hospital/Doctor Discharge
                    </div>
                    {careSheetToView.careSheet.dischargeDocuments && (
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-red-600"
                        onClick={() => window.open(careSheetToView.careSheet.dischargeDocuments, "_blank")}
                      >
                        View Discharge Documents
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Mood on Arrival</p>
                    <p className="font-medium capitalize">{careSheetToView.careSheet.moodOnArrival}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Mood on Departure</p>
                    <p className="font-medium capitalize">{careSheetToView.careSheet.moodOnDeparture}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Tasks Completed</p>
                  <div className="space-y-1">
                    {careSheetToView.careSheet.tasksCompleted.map((task, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>{task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {careSheetToView.careSheet.observations && (
                  <div>
                    <p className="text-sm font-medium mb-2">Observations</p>
                    <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                      {careSheetToView.careSheet.observations}
                    </p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground pt-3 border-t border-border">
                  <p>PSW: {careSheetToView.careSheet.pswFirstName}</p>
                  <p>Office: {careSheetToView.careSheet.officeNumber}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Client Records
          </CardTitle>
          <CardDescription>
            Searchable database of all clients with order history and care sheet access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or postal code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-primary">{clientRecords.length}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-emerald-600">
                {clientRecords.filter(c => c.activeOrders > 0).length}
              </p>
              <p className="text-xs text-muted-foreground">With Active Orders</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {clientRecords.reduce((sum, c) => sum + c.completedOrders, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Completed Orders</p>
            </div>
          </div>

          {/* Client List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No clients match your search" : "No clients found"}
              </div>
            ) : (
              filteredClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          {client.completedOrders} completed
                        </p>
                        {client.activeOrders > 0 && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                            {client.activeOrders} active
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
