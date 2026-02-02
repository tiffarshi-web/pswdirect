// Admin Gear Box Section - QR Code Management, Infrastructure Status, Data Reset
// Generate and manage QR codes for Clients and PSWs

import { useState, useEffect } from "react";
import { QrCode, Users, UserCheck, Search, ExternalLink, Copy, RefreshCw, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { BrandedQRCode } from "@/components/ui/BrandedQRCode";
import { getBaseDomain } from "@/lib/domainConfig";
import { toast } from "sonner";
import { InfrastructureStatusCard } from "./InfrastructureStatusCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ClientProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  phone: string | null;
}

interface PSWProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  vetting_status: string | null;
  home_city: string | null;
}

type EntityType = "clients" | "psws";

export const GearBoxSection = () => {
  const [activeTab, setActiveTab] = useState<EntityType>("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [psws, setPsws] = useState<PSWProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<{ url: string; name: string; type: EntityType } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  // Data reset functions
  const handleResetBookings = async () => {
    setResetting("bookings");
    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows
      
      if (error) {
        console.error("Error resetting bookings:", error);
        toast.error("Failed to reset bookings: " + error.message);
      } else {
        toast.success("All bookings have been deleted");
      }
    } catch (err) {
      console.error("Reset bookings error:", err);
      toast.error("Failed to reset bookings");
    } finally {
      setResetting(null);
    }
  };

  const handleResetPSWs = async () => {
    setResetting("psws");
    try {
      // First delete related banking info
      const { error: bankingError } = await supabase
        .from("psw_banking")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (bankingError) {
        console.error("Error resetting PSW banking:", bankingError);
      }

      // Then delete PSW profiles
      const { error } = await supabase
        .from("psw_profiles")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (error) {
        console.error("Error resetting PSW profiles:", error);
        toast.error("Failed to reset PSW profiles: " + error.message);
      } else {
        toast.success("All PSW profiles have been deleted");
        fetchData();
      }
    } catch (err) {
      console.error("Reset PSWs error:", err);
      toast.error("Failed to reset PSW profiles");
    } finally {
      setResetting(null);
    }
  };

  const handleResetPayroll = async () => {
    setResetting("payroll");
    try {
      const { error } = await supabase
        .from("payroll_entries")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (error) {
        console.error("Error resetting payroll:", error);
        toast.error("Failed to reset payroll: " + error.message);
      } else {
        toast.success("All payroll entries have been deleted");
      }
    } catch (err) {
      console.error("Reset payroll error:", err);
      toast.error("Failed to reset payroll");
    } finally {
      setResetting(null);
    }
  };

  const handleResetClients = async () => {
    setResetting("clients");
    try {
      const { error } = await supabase
        .from("client_profiles")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      
      if (error) {
        console.error("Error resetting client profiles:", error);
        toast.error("Failed to reset client profiles: " + error.message);
      } else {
        toast.success("All client profiles have been deleted");
        fetchData();
      }
    } catch (err) {
      console.error("Reset clients error:", err);
      toast.error("Failed to reset client profiles");
    } finally {
      setResetting(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    
    if (activeTab === "clients") {
      const { data, error } = await supabase
        .from("client_profiles")
        .select("id, user_id, email, full_name, first_name, phone")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching clients:", error);
      } else {
        setClients(data || []);
      }
    } else {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("id, email, first_name, last_name, vetting_status, home_city")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching PSWs:", error);
      } else {
        setPsws(data || []);
      }
    }
    
    setLoading(false);
  };

  const getVerifyUrl = (type: EntityType, id: string) => {
    const baseDomain = getBaseDomain();
    return `${baseDomain}/verify/${type === "clients" ? "client" : "psw"}/${id}`;
  };

  const filteredClients = clients.filter((c) =>
    (c.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (c.first_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPSWs = psws.filter((p) =>
    p.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewQR = (url: string, name: string, type: EntityType) => {
    setSelectedQR({ url, name, type });
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard");
  };

  const getVettingBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status || "Unknown"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Infrastructure Status */}
      <InfrastructureStatusCard />

      {/* Data Reset Section */}
      <Card className="shadow-card border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Data Reset (GCC Pitch Mode)
          </CardTitle>
          <CardDescription>
            Clear database tables to start fresh. This action is irreversible!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Reset Bookings */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                  {resetting === "bookings" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Reset Bookings
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Delete All Bookings?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all booking records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetBookings}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Reset PSWs */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                  {resetting === "psws" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Reset PSWs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Delete All PSW Profiles?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all caregiver profiles and their banking info. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetPSWs}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Reset Clients */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                  {resetting === "clients" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Reset Clients
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Delete All Client Profiles?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all client profile records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetClients}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Reset Payroll */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                  {resetting === "payroll" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Reset Payroll
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Delete All Payroll Entries?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all payroll records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleResetPayroll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* QR Management Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Code Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage verification QR codes for clients and caregivers
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as EntityType)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Clients ({clients.length})
          </TabsTrigger>
          <TabsTrigger value="psws" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Caregivers ({psws.length})
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Client QR Codes</CardTitle>
              <CardDescription>
                Each QR code points to a dynamic verification URL that reflects live profile data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No clients found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => {
                        const displayName = client.full_name || client.first_name || "Client";
                        const qrUrl = getVerifyUrl("clients", client.id);
                        
                        return (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{displayName}</TableCell>
                            <TableCell>{client.email}</TableCell>
                            <TableCell>{client.phone || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewQR(qrUrl, displayName, "clients")}
                                >
                                  <QrCode className="w-4 h-4 mr-1" />
                                  QR
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyUrl(qrUrl)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PSWs Tab */}
        <TabsContent value="psws">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Caregiver QR Codes</CardTitle>
              <CardDescription>
                QR codes for caregiver verification - updates instantly when profile changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredPSWs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No caregivers found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPSWs.map((psw) => {
                        const displayName = `${psw.first_name} ${psw.last_name}`;
                        const qrUrl = getVerifyUrl("psws", psw.id);
                        
                        return (
                          <TableRow key={psw.id}>
                            <TableCell className="font-medium">{displayName}</TableCell>
                            <TableCell>{psw.email}</TableCell>
                            <TableCell>{psw.home_city || "-"}</TableCell>
                            <TableCell>{getVettingBadge(psw.vetting_status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewQR(qrUrl, displayName, "psws")}
                                >
                                  <QrCode className="w-4 h-4 mr-1" />
                                  QR
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyUrl(qrUrl)}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              {selectedQR?.type === "clients" ? "Client" : "Caregiver"} QR Code
            </DialogTitle>
          </DialogHeader>
          
          {selectedQR && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                QR Code for <strong>{selectedQR.name}</strong>
              </p>
              
              <BrandedQRCode url={selectedQR.url} size={200} logoSize={50} />
              
              <div className="w-full p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Verification URL</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs break-all flex-1">{selectedQR.url}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyUrl(selectedQR.url)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                This QR code points to a dynamic URL. Profile updates are reflected instantly without regenerating the code.
              </p>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(selectedQR.url, "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Verification Page
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GearBoxSection;
