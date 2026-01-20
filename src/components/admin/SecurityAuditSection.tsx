// Security Audit Log - Hidden admin view of all sensitive data access
// PHIPA compliance requirement for tracking access to health/banking data

import { useState, useEffect, useMemo } from "react";
import { format, parseISO, subDays } from "date-fns";
import { 
  Shield, 
  Eye, 
  Download, 
  Lock, 
  AlertTriangle,
  User,
  FileText,
  CreditCard,
  MapPin,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  getRecentAuditLogs, 
  type AuditLogEntry 
} from "@/lib/securityStore";

const getDataTypeIcon = (dataType: AuditLogEntry["dataType"]) => {
  switch (dataType) {
    case "banking": return <CreditCard className="w-4 h-4" />;
    case "health": return <FileText className="w-4 h-4" />;
    case "address": return <MapPin className="w-4 h-4" />;
    case "police_check": return <Shield className="w-4 h-4" />;
    case "payroll": return <Download className="w-4 h-4" />;
    default: return <Eye className="w-4 h-4" />;
  }
};

const getActionBadge = (action: AuditLogEntry["action"]) => {
  switch (action) {
    case "view":
      return <Badge variant="secondary">View</Badge>;
    case "access":
      return <Badge variant="outline">Access</Badge>;
    case "update":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Update</Badge>;
    case "export":
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Export</Badge>;
    case "decrypt":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Decrypt</Badge>;
    default:
      return <Badge variant="outline">{action}</Badge>;
  }
};

const getRoleBadge = (role: AuditLogEntry["userRole"]) => {
  switch (role) {
    case "admin":
      return <Badge className="bg-red-100 text-red-700 border-red-200">Admin</Badge>;
    case "psw":
      return <Badge className="bg-green-100 text-green-700 border-green-200">PSW</Badge>;
    case "client":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Client</Badge>;
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
};

export const SecurityAuditSection = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDataType, setFilterDataType] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<string>("all");

  useEffect(() => {
    setLogs(getRecentAuditLogs(200));
  }, []);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          log.userName.toLowerCase().includes(searchLower) ||
          log.targetDescription?.toLowerCase().includes(searchLower) ||
          log.targetId?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Data type filter
      if (filterDataType !== "all" && log.dataType !== filterDataType) return false;
      
      // Action filter
      if (filterAction !== "all" && log.action !== filterAction) return false;
      
      // Role filter
      if (filterRole !== "all" && log.userRole !== filterRole) return false;
      
      return true;
    });
  }, [logs, searchTerm, filterDataType, filterAction, filterRole]);

  // Statistics
  const stats = useMemo(() => {
    const last24h = subDays(new Date(), 1);
    const recentLogs = logs.filter(l => new Date(l.timestamp) > last24h);
    
    return {
      total: logs.length,
      last24h: recentLogs.length,
      bankingAccess: logs.filter(l => l.dataType === "banking").length,
      healthAccess: logs.filter(l => l.dataType === "health").length,
      decryptions: logs.filter(l => l.action === "decrypt").length,
      exports: logs.filter(l => l.action === "export").length,
    };
  }, [logs]);

  const exportAuditLog = () => {
    const headers = ["Timestamp", "User", "Role", "Action", "Data Type", "Target", "Description"];
    const rows = filteredLogs.map(log => [
      format(parseISO(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      log.userName,
      log.userRole,
      log.action,
      log.dataType,
      log.targetId || "",
      log.targetDescription || "",
    ]);
    
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `security_audit_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                PHIPA Security Audit Log
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                This log records all access to sensitive health and banking information. 
                Access to this page is restricted to authorized administrators only.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Events</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.last24h}</p>
            <p className="text-xs text-muted-foreground">Last 24 Hours</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.bankingAccess}</p>
            <p className="text-xs text-muted-foreground">Banking Access</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.healthAccess}</p>
            <p className="text-xs text-muted-foreground">Health Access</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.decryptions}</p>
            <p className="text-xs text-muted-foreground">Decryptions</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.exports}</p>
            <p className="text-xs text-muted-foreground">Data Exports</p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Security Event Log
              </CardTitle>
              <CardDescription>
                All sensitive data access events are recorded here
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportAuditLog}>
              <Download className="w-4 h-4 mr-2" />
              Export Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 flex-wrap">
            <div className="flex-1">
              <Input
                placeholder="Search by user name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterDataType} onValueChange={setFilterDataType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Data Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="banking">Banking</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="address">Address</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="police_check">Police Check</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="access">Access</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="decrypt">Decrypt</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="psw">PSW</SelectItem>
                <SelectItem value="client">Client</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Log Table */}
          <ScrollArea className="h-[500px]">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No security events recorded</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(parseISO(log.timestamp), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          {log.userName}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(log.userRole)}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {getDataTypeIcon(log.dataType)}
                          <span className="text-xs capitalize">{log.dataType.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                        {log.targetDescription || log.targetId || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
