// PSW Performance & Accountability Table
// Shows each PSW with Total Shifts, Rush Shifts, Urban Bonuses, and Gross Earnings

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  MapPin, 
  TrendingUp,
  Printer
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PayrollEntry {
  id: string;
  shift_id: string;
  psw_id: string;
  psw_name: string;
  task_name: string;
  scheduled_date: string;
  hours_worked: number;
  hourly_rate: number;
  surcharge_applied: number | null;
  total_owed: number;
  status: string;
  cleared_at: string | null;
  created_at: string;
}

interface PSWPerformanceData {
  pswId: string;
  pswName: string;
  totalShifts: number;
  rushShifts: number;
  urbanBonusTotal: number;
  grossEarnings: number;
  totalHours: number;
  avgHourlyRate: number;
}

interface PSWPerformanceTableProps {
  payrollEntries: PayrollEntry[];
}

// Urban bonus rate (from payrollStore)
const URBAN_BONUS_RATE = 3;

export const PSWPerformanceTable = ({ payrollEntries }: PSWPerformanceTableProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate performance metrics per PSW
  const performanceData = useMemo((): PSWPerformanceData[] => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const yearlyEntries = payrollEntries.filter(
      e => new Date(e.scheduled_date) >= yearStart
    );

    const pswMap = new Map<string, PSWPerformanceData>();

    yearlyEntries.forEach(entry => {
      if (!pswMap.has(entry.psw_id)) {
        pswMap.set(entry.psw_id, {
          pswId: entry.psw_id,
          pswName: entry.psw_name,
          totalShifts: 0,
          rushShifts: 0,
          urbanBonusTotal: 0,
          grossEarnings: 0,
          totalHours: 0,
          avgHourlyRate: 0,
        });
      }

      const psw = pswMap.get(entry.psw_id)!;
      
      psw.totalShifts++;
      psw.grossEarnings += entry.total_owed;
      psw.totalHours += entry.hours_worked;

      // Detect Rush shifts (surcharge applied or ASAP in task name)
      const isRush = entry.surcharge_applied !== null && entry.surcharge_applied > 0;
      if (isRush) {
        psw.rushShifts++;
      }

      // Calculate urban bonus (applied to hospital/doctor visits in Toronto area)
      // This is a simplification - in production would check actual Toronto postal codes
      const isUrbanShift = entry.hourly_rate >= 25; // Hospital/Doctor visits
      if (isUrbanShift) {
        psw.urbanBonusTotal += URBAN_BONUS_RATE * entry.hours_worked;
      }
    });

    // Calculate average hourly rate
    pswMap.forEach(psw => {
      if (psw.totalHours > 0) {
        psw.avgHourlyRate = psw.grossEarnings / psw.totalHours;
      }
    });

    return Array.from(pswMap.values()).sort((a, b) => b.grossEarnings - a.grossEarnings);
  }, [payrollEntries]);

  // Print performance report
  const printPerformanceReport = () => {
    const year = new Date().getFullYear();
    const reportDate = format(new Date(), "MMMM d, yyyy");

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print reports");
      return;
    }

    // Calculate totals
    const totals = performanceData.reduce(
      (acc, psw) => ({
        shifts: acc.shifts + psw.totalShifts,
        rush: acc.rush + psw.rushShifts,
        urban: acc.urban + psw.urbanBonusTotal,
        earnings: acc.earnings + psw.grossEarnings,
        hours: acc.hours + psw.totalHours,
      }),
      { shifts: 0, rush: 0, urban: 0, earnings: 0, hours: 0 }
    );

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PSW Performance Report - ${year}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              max-width: 900px; 
              margin: 0 auto;
              color: #1a1a1a;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #7c3aed; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .header h1 { font-size: 28px; color: #7c3aed; }
            .header h2 { font-size: 16px; color: #6b7280; font-weight: normal; }
            .summary-grid { 
              display: grid; 
              grid-template-columns: repeat(5, 1fr); 
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card { 
              background: #f9fafb;
              padding: 15px; 
              border-radius: 8px;
              text-align: center;
            }
            .summary-card .value { 
              font-size: 24px; 
              font-weight: 700; 
              color: #7c3aed;
            }
            .summary-card .label { 
              font-size: 11px; 
              color: #6b7280;
              margin-top: 5px;
              text-transform: uppercase;
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
              font-size: 13px;
            }
            th, td { 
              padding: 12px 10px; 
              text-align: left; 
              border-bottom: 1px solid #e5e7eb;
            }
            th { 
              background: #f9fafb; 
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              color: #6b7280;
            }
            td.number { text-align: right; font-weight: 600; }
            tr:hover { background: #f9fafb; }
            .rush-badge { 
              background: #fef2f2; 
              color: #dc2626; 
              padding: 2px 8px; 
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
            }
            .urban-badge { 
              background: #fefce8; 
              color: #ca8a04; 
              padding: 2px 8px; 
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
            }
            .footer { 
              text-align: center; 
              margin-top: 40px; 
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #9ca3af;
              font-size: 12px;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PSW PERFORMANCE REPORT</h1>
            <h2>${year} Year-to-Date | Generated: ${reportDate}</h2>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="value">${performanceData.length}</div>
              <div class="label">Active PSWs</div>
            </div>
            <div class="summary-card">
              <div class="value">${totals.shifts}</div>
              <div class="label">Total Shifts</div>
            </div>
            <div class="summary-card">
              <div class="value">${totals.rush}</div>
              <div class="label">Rush Shifts</div>
            </div>
            <div class="summary-card">
              <div class="value">$${totals.urban.toFixed(2)}</div>
              <div class="label">Urban Bonuses</div>
            </div>
            <div class="summary-card">
              <div class="value">$${totals.earnings.toFixed(2)}</div>
              <div class="label">Gross Earnings</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>PSW Name</th>
                <th class="number">Total Shifts</th>
                <th class="number">Rush Shifts</th>
                <th class="number">Urban Bonus</th>
                <th class="number">Total Hours</th>
                <th class="number">Avg Rate</th>
                <th class="number">Gross Earnings</th>
              </tr>
            </thead>
            <tbody>
              ${performanceData.map(psw => `
                <tr>
                  <td><strong>${psw.pswName}</strong></td>
                  <td class="number">${psw.totalShifts}</td>
                  <td class="number">
                    ${psw.rushShifts > 0 ? `<span class="rush-badge">${psw.rushShifts}</span>` : '0'}
                  </td>
                  <td class="number">
                    ${psw.urbanBonusTotal > 0 ? `<span class="urban-badge">$${psw.urbanBonusTotal.toFixed(2)}</span>` : '$0.00'}
                  </td>
                  <td class="number">${psw.totalHours.toFixed(1)} hrs</td>
                  <td class="number">$${psw.avgHourlyRate.toFixed(2)}/hr</td>
                  <td class="number"><strong>$${psw.grossEarnings.toFixed(2)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>PSW Direct • Performance Report • ${year}</p>
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success("Printing performance report");
  };

  if (performanceData.length === 0) {
    return null;
  }

  // Calculate totals for display
  const totals = performanceData.reduce(
    (acc, psw) => ({
      shifts: acc.shifts + psw.totalShifts,
      rush: acc.rush + psw.rushShifts,
      urban: acc.urban + psw.urbanBonusTotal,
      earnings: acc.earnings + psw.grossEarnings,
    }),
    { shifts: 0, rush: 0, urban: 0, earnings: 0 }
  );

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-auto">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </Button>
              </CollapsibleTrigger>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  PSW Performance Summary
                </CardTitle>
                <CardDescription>
                  {new Date().getFullYear()} Year-to-Date • {performanceData.length} workers
                </CardDescription>
              </div>
            </div>
            <Button onClick={printPerformanceReport} size="sm" variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-2xl font-bold">{totals.shifts}</p>
                <p className="text-xs text-muted-foreground">Total Shifts</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-2xl font-bold text-red-600">{totals.rush}</p>
                <p className="text-xs text-red-600">Rush Shifts</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
                <p className="text-2xl font-bold text-yellow-600">${totals.urban.toFixed(0)}</p>
                <p className="text-xs text-yellow-600">Urban Bonuses</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-2xl font-bold text-primary">${totals.earnings.toFixed(0)}</p>
                <p className="text-xs text-primary">Gross Earnings</p>
              </div>
            </div>

            {/* Performance Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PSW Name</TableHead>
                    <TableHead className="text-right">Total Shifts</TableHead>
                    <TableHead className="text-right">Rush Shifts</TableHead>
                    <TableHead className="text-right">Urban Bonus</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Gross Earnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.map((psw) => (
                    <TableRow key={psw.pswId}>
                      <TableCell className="font-medium">{psw.pswName}</TableCell>
                      <TableCell className="text-right">{psw.totalShifts}</TableCell>
                      <TableCell className="text-right">
                        {psw.rushShifts > 0 ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <Zap className="w-3 h-3 mr-1" />
                            {psw.rushShifts}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {psw.urbanBonusTotal > 0 ? (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                            <MapPin className="w-3 h-3 mr-1" />
                            ${psw.urbanBonusTotal.toFixed(2)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">$0.00</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{psw.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${psw.grossEarnings.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
