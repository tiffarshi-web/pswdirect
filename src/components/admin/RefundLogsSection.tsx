import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CreditCard, RefreshCw, Search, DollarSign, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface RefundLog {
  id: string;
  bookingId: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  reason: string;
  status: "pending" | "processed" | "failed" | "dry-run";
  stripeRefundId?: string;
  processedAt?: string;
  processedBy: string;
  createdAt: string;
  isDryRun: boolean;
}

const getRefundLogs = (): RefundLog[] => {
  const stored = localStorage.getItem("refund_logs");
  return stored ? JSON.parse(stored) : [];
};

export const addRefundLog = (log: Omit<RefundLog, "id" | "createdAt">): RefundLog => {
  const logs = getRefundLogs();
  const newLog: RefundLog = {
    ...log,
    id: `REF-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  logs.unshift(newLog);
  localStorage.setItem("refund_logs", JSON.stringify(logs.slice(0, 500)));
  return newLog;
};

export const RefundLogsSection = () => {
  const [logs, setLogs] = useState<RefundLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLogs(getRefundLogs());
      setIsLoading(false);
    }, 300);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const search = searchTerm.toLowerCase();
    return (
      log.bookingId.toLowerCase().includes(search) ||
      log.clientName.toLowerCase().includes(search) ||
      log.clientEmail.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (log: RefundLog) => {
    if (log.isDryRun) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Dry Run
        </Badge>
      );
    }
    switch (log.status) {
      case "processed":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Processed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{log.status}</Badge>;
    }
  };

  const totalRefunded = logs
    .filter(l => l.status === "processed" && !l.isDryRun)
    .reduce((sum, l) => sum + l.amount, 0);

  const dryRunCount = logs.filter(l => l.isDryRun).length;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Refund Logs
            </CardTitle>
            <CardDescription>
              Track all refund transactions (real and dry-run)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold text-foreground">{logs.length}</p>
            <p className="text-xs text-muted-foreground">Total Refunds</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">${totalRefunded.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Refunded</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-600">{dryRunCount}</p>
            <p className="text-xs text-muted-foreground">Dry Run Tests</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by booking ID, client name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[400px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No refund logs found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(parseISO(log.createdAt), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.bookingId}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{log.clientName}</p>
                        <p className="text-xs text-muted-foreground">{log.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      ${log.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">
                      {log.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(log)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
