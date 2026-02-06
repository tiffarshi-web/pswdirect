import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { User, Printer, Users, ChevronDown, ChevronUp, TrendingUp, Calendar, DollarSign, Clock } from "lucide-react";
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

interface PerPswEarnings {
  pswId: string;
  pswName: string;
  weekly: { total: number; hours: number; count: number };
  monthly: { total: number; hours: number; count: number };
  yearly: { total: number; hours: number; count: number };
  allTime: { total: number; hours: number; count: number };
  yearlyEntries: PayrollEntry[];
}

interface PerPswEarningsSectionProps {
  payrollEntries: PayrollEntry[];
}

export const PerPswEarningsSection = ({ payrollEntries }: PerPswEarningsSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate per-PSW earnings breakdown
  const perPswEarnings = useMemo((): PerPswEarnings[] => {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const pswMap = new Map<string, PerPswEarnings>();

    payrollEntries.forEach(entry => {
      const entryDate = new Date(entry.scheduled_date);

      if (!pswMap.has(entry.psw_id)) {
        pswMap.set(entry.psw_id, {
          pswId: entry.psw_id,
          pswName: entry.psw_name,
          weekly: { total: 0, hours: 0, count: 0 },
          monthly: { total: 0, hours: 0, count: 0 },
          yearly: { total: 0, hours: 0, count: 0 },
          allTime: { total: 0, hours: 0, count: 0 },
          yearlyEntries: []
        });
      }

      const psw = pswMap.get(entry.psw_id)!;

      // All-time totals
      psw.allTime.total += entry.total_owed;
      psw.allTime.hours += entry.hours_worked;
      psw.allTime.count++;

      // Yearly (current year)
      if (entryDate >= yearStart) {
        psw.yearly.total += entry.total_owed;
        psw.yearly.hours += entry.hours_worked;
        psw.yearly.count++;
        psw.yearlyEntries.push(entry);
      }

      // Monthly (current month)
      if (entryDate >= monthStart) {
        psw.monthly.total += entry.total_owed;
        psw.monthly.hours += entry.hours_worked;
        psw.monthly.count++;
      }

      // Weekly (last 7 days)
      if (entryDate >= weekAgo) {
        psw.weekly.total += entry.total_owed;
        psw.weekly.hours += entry.hours_worked;
        psw.weekly.count++;
      }
    });

    return Array.from(pswMap.values()).sort((a, b) => b.yearly.total - a.yearly.total);
  }, [payrollEntries]);

  // Print single PSW yearly report with Base Pay vs Surge/Rush Pay separation
  const printPswYearlyReport = (pswId: string) => {
    const psw = perPswEarnings.find(p => p.pswId === pswId);
    if (!psw) return;

    const year = new Date().getFullYear();
    const reportDate = format(new Date(), "MMMM d, yyyy");

    // Group yearly entries by month
    const monthlyBreakdown: Record<string, { total: number; hours: number; count: number; basePay: number; surgePay: number }> = {};
    psw.yearlyEntries.forEach(entry => {
      const month = format(new Date(entry.scheduled_date), "MMMM");
      if (!monthlyBreakdown[month]) {
        monthlyBreakdown[month] = { total: 0, hours: 0, count: 0, basePay: 0, surgePay: 0 };
      }
      monthlyBreakdown[month].total += entry.total_owed;
      monthlyBreakdown[month].hours += entry.hours_worked;
      monthlyBreakdown[month].count++;
      
      // Separate base pay from surge/rush pay
      const surcharge = entry.surcharge_applied || 0;
      monthlyBreakdown[month].basePay += (entry.total_owed - surcharge);
      monthlyBreakdown[month].surgePay += surcharge;
    });

    // Calculate shift type breakdown with surge separation
    const shiftTypeBreakdown = {
      standard: { count: 0, total: 0, basePay: 0, surgePay: 0 },
      hospital: { count: 0, total: 0, basePay: 0, surgePay: 0 },
      doctor: { count: 0, total: 0, basePay: 0, surgePay: 0 }
    };

    // Calculate total base vs surge
    let totalBasePay = 0;
    let totalSurgePay = 0;
    let rushShiftCount = 0;

    psw.yearlyEntries.forEach(entry => {
      const taskLower = entry.task_name.toLowerCase();
      const surcharge = entry.surcharge_applied || 0;
      const basePay = entry.total_owed - surcharge;
      
      totalBasePay += basePay;
      totalSurgePay += surcharge;
      if (surcharge > 0) rushShiftCount++;

      if (taskLower.includes("hospital")) {
        shiftTypeBreakdown.hospital.count++;
        shiftTypeBreakdown.hospital.total += entry.total_owed;
        shiftTypeBreakdown.hospital.basePay += basePay;
        shiftTypeBreakdown.hospital.surgePay += surcharge;
      } else if (taskLower.includes("doctor")) {
        shiftTypeBreakdown.doctor.count++;
        shiftTypeBreakdown.doctor.total += entry.total_owed;
        shiftTypeBreakdown.doctor.basePay += basePay;
        shiftTypeBreakdown.doctor.surgePay += surcharge;
      } else {
        shiftTypeBreakdown.standard.count++;
        shiftTypeBreakdown.standard.total += entry.total_owed;
        shiftTypeBreakdown.standard.basePay += basePay;
        shiftTypeBreakdown.standard.surgePay += surcharge;
      }
    });

    const monthOrder = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print reports");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Yearly Earnings Report - ${psw.pswName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto;
              color: #1a1a1a;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #7c3aed; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .header h1 { 
              font-size: 28px; 
              color: #7c3aed; 
              margin-bottom: 5px;
            }
            .header h2 { 
              font-size: 18px; 
              color: #6b7280;
              font-weight: normal;
            }
            .meta { 
              display: flex; 
              justify-content: space-between; 
              background: #f9fafb; 
              padding: 15px 20px; 
              border-radius: 8px;
              margin-bottom: 25px;
            }
            .meta-item { }
            .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
            .meta-value { font-size: 14px; font-weight: 600; }
            .section { margin-bottom: 30px; }
            .section-title { 
              font-size: 16px; 
              font-weight: 600; 
              color: #374151; 
              border-bottom: 1px solid #e5e7eb; 
              padding-bottom: 8px;
              margin-bottom: 15px;
            }
            .summary-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 15px;
            }
            .summary-card { 
              background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
              padding: 20px; 
              border-radius: 8px;
              text-align: center;
            }
            .summary-card .value { 
              font-size: 28px; 
              font-weight: 700; 
              color: #7c3aed;
            }
            .summary-card .label { 
              font-size: 12px; 
              color: #6b7280;
              margin-top: 5px;
            }
            .breakdown-table { 
              width: 100%; 
              border-collapse: collapse;
            }
            .breakdown-table th, .breakdown-table td { 
              padding: 10px 15px; 
              text-align: left; 
              border-bottom: 1px solid #e5e7eb;
            }
            .breakdown-table th { 
              background: #f9fafb; 
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              color: #6b7280;
            }
            .breakdown-table td:last-child { text-align: right; font-weight: 600; }
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
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>YEARLY EARNINGS REPORT</h1>
            <h2>${year}</h2>
          </div>

          <div class="meta">
            <div class="meta-item">
              <div class="meta-label">PSW Name</div>
              <div class="meta-value">${psw.pswName}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">PSW ID</div>
              <div class="meta-value">${psw.pswId.slice(0, 8)}...</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Report Generated</div>
              <div class="meta-value">${reportDate}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">EARNINGS SUMMARY</div>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="value">${psw.yearly.hours.toFixed(1)}</div>
                <div class="label">Total Hours Worked</div>
              </div>
              <div class="summary-card">
                <div class="value">${psw.yearly.count}</div>
                <div class="label">Total Shifts Completed</div>
              </div>
              <div class="summary-card">
                <div class="value">$${psw.yearly.total.toFixed(2)}</div>
                <div class="label">Total Gross Earnings</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">TAX-READY PAY BREAKDOWN</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
              <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #a7f3d0;">
                <div style="font-size: 24px; font-weight: 700; color: #059669;">$${totalBasePay.toFixed(2)}</div>
                <div style="font-size: 11px; color: #047857; text-transform: uppercase; margin-top: 5px;">Base Pay</div>
              </div>
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #fecaca;">
                <div style="font-size: 24px; font-weight: 700; color: #dc2626;">$${totalSurgePay.toFixed(2)}</div>
                <div style="font-size: 11px; color: #b91c1c; text-transform: uppercase; margin-top: 5px;">Surge/Rush Pay</div>
              </div>
              <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #d8b4fe;">
                <div style="font-size: 24px; font-weight: 700; color: #7c3aed;">${rushShiftCount}</div>
                <div style="font-size: 11px; color: #6d28d9; text-transform: uppercase; margin-top: 5px;">Rush Shifts</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">BREAKDOWN BY SHIFT TYPE</div>
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th>Shift Type</th>
                  <th>Shifts</th>
                  <th>Base Pay</th>
                  <th>Surge/Rush</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Standard Home Care</td>
                  <td>${shiftTypeBreakdown.standard.count}</td>
                  <td>$${shiftTypeBreakdown.standard.basePay.toFixed(2)}</td>
                  <td style="color: ${shiftTypeBreakdown.standard.surgePay > 0 ? '#dc2626' : '#9ca3af'};">$${shiftTypeBreakdown.standard.surgePay.toFixed(2)}</td>
                  <td>$${shiftTypeBreakdown.standard.total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Hospital Visits</td>
                  <td>${shiftTypeBreakdown.hospital.count}</td>
                  <td>$${shiftTypeBreakdown.hospital.basePay.toFixed(2)}</td>
                  <td style="color: ${shiftTypeBreakdown.hospital.surgePay > 0 ? '#dc2626' : '#9ca3af'};">$${shiftTypeBreakdown.hospital.surgePay.toFixed(2)}</td>
                  <td>$${shiftTypeBreakdown.hospital.total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Doctor Visits</td>
                  <td>${shiftTypeBreakdown.doctor.count}</td>
                  <td>$${shiftTypeBreakdown.doctor.basePay.toFixed(2)}</td>
                  <td style="color: ${shiftTypeBreakdown.doctor.surgePay > 0 ? '#dc2626' : '#9ca3af'};">$${shiftTypeBreakdown.doctor.surgePay.toFixed(2)}</td>
                  <td>$${shiftTypeBreakdown.doctor.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">MONTHLY BREAKDOWN</div>
            <table class="breakdown-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Shifts</th>
                  <th>Hours</th>
                  <th>Earnings</th>
                </tr>
              </thead>
              <tbody>
                ${monthOrder
                  .filter(month => monthlyBreakdown[month])
                  .map(month => `
                    <tr>
                      <td>${month}</td>
                      <td>${monthlyBreakdown[month].count}</td>
                      <td>${monthlyBreakdown[month].hours.toFixed(1)}</td>
                      <td>$${monthlyBreakdown[month].total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>

          <div class="footer">
            <p>This report is generated for tax and accounting purposes.</p>
            <p>PSW Direct • Generated on ${reportDate}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Printing yearly report for ${psw.pswName}`);
  };

  // Print all PSW yearly reports
  const printAllYearlyReports = () => {
    if (perPswEarnings.length === 0) {
      toast.error("No PSW earnings data to print");
      return;
    }

    const year = new Date().getFullYear();
    const reportDate = format(new Date(), "MMMM d, yyyy");

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print reports");
      return;
    }

    // Calculate grand totals
    const grandTotal = {
      hours: perPswEarnings.reduce((sum, p) => sum + p.yearly.hours, 0),
      shifts: perPswEarnings.reduce((sum, p) => sum + p.yearly.count, 0),
      earnings: perPswEarnings.reduce((sum, p) => sum + p.yearly.total, 0)
    };

    const generatePswSection = (psw: PerPswEarnings) => {
      // Monthly breakdown for this PSW
      const monthlyBreakdown: Record<string, { total: number; hours: number; count: number }> = {};
      psw.yearlyEntries.forEach(entry => {
        const month = format(new Date(entry.scheduled_date), "MMMM");
        if (!monthlyBreakdown[month]) {
          monthlyBreakdown[month] = { total: 0, hours: 0, count: 0 };
        }
        monthlyBreakdown[month].total += entry.total_owed;
        monthlyBreakdown[month].hours += entry.hours_worked;
        monthlyBreakdown[month].count++;
      });

      const monthOrder = ["January", "February", "March", "April", "May", "June", 
                          "July", "August", "September", "October", "November", "December"];

      return `
        <div class="psw-page">
          <div class="psw-header">
            <h2>${psw.pswName}</h2>
            <span class="psw-id">ID: ${psw.pswId.slice(0, 8)}...</span>
          </div>
          
          <div class="summary-row">
            <div class="summary-item">
              <span class="value">${psw.yearly.hours.toFixed(1)} hrs</span>
              <span class="label">Hours</span>
            </div>
            <div class="summary-item">
              <span class="value">${psw.yearly.count}</span>
              <span class="label">Shifts</span>
            </div>
            <div class="summary-item highlight">
              <span class="value">$${psw.yearly.total.toFixed(2)}</span>
              <span class="label">Total Earnings</span>
            </div>
          </div>

          <table class="monthly-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Shifts</th>
                <th>Hours</th>
                <th>Earnings</th>
              </tr>
            </thead>
            <tbody>
              ${monthOrder
                .filter(month => monthlyBreakdown[month])
                .map(month => `
                  <tr>
                    <td>${month}</td>
                    <td>${monthlyBreakdown[month].count}</td>
                    <td>${monthlyBreakdown[month].hours.toFixed(1)}</td>
                    <td>$${monthlyBreakdown[month].total.toFixed(2)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>All PSW Yearly Reports - ${year}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 30px;
              color: #1a1a1a;
            }
            .cover-page {
              text-align: center;
              padding: 60px 20px;
              page-break-after: always;
            }
            .cover-page h1 { 
              font-size: 36px; 
              color: #7c3aed;
              margin-bottom: 10px;
            }
            .cover-page h2 { 
              font-size: 24px;
              color: #6b7280;
              font-weight: normal;
            }
            .cover-stats {
              display: flex;
              justify-content: center;
              gap: 40px;
              margin-top: 50px;
            }
            .cover-stat {
              text-align: center;
            }
            .cover-stat .value {
              font-size: 42px;
              font-weight: 700;
              color: #7c3aed;
            }
            .cover-stat .label {
              font-size: 14px;
              color: #6b7280;
            }
            .psw-page { 
              page-break-after: always; 
              margin-bottom: 30px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 25px;
            }
            .psw-page:last-child { page-break-after: auto; }
            .psw-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #7c3aed;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .psw-header h2 { color: #7c3aed; font-size: 20px; }
            .psw-id { color: #9ca3af; font-size: 12px; }
            .summary-row {
              display: flex;
              gap: 15px;
              margin-bottom: 20px;
            }
            .summary-item {
              flex: 1;
              background: #f9fafb;
              padding: 15px;
              border-radius: 6px;
              text-align: center;
            }
            .summary-item.highlight {
              background: linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%);
            }
            .summary-item .value {
              display: block;
              font-size: 22px;
              font-weight: 700;
              color: #374151;
            }
            .summary-item.highlight .value { color: #7c3aed; }
            .summary-item .label {
              display: block;
              font-size: 11px;
              color: #9ca3af;
              text-transform: uppercase;
              margin-top: 3px;
            }
            .monthly-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 13px;
            }
            .monthly-table th, .monthly-table td {
              padding: 8px 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            .monthly-table th {
              background: #f9fafb;
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              color: #6b7280;
            }
            .monthly-table td:last-child { 
              text-align: right; 
              font-weight: 600; 
            }
            .footer {
              text-align: center;
              color: #9ca3af;
              font-size: 11px;
              margin-top: 30px;
            }
            @media print {
              body { padding: 15px; }
              .psw-page { border: none; padding: 20px 0; }
            }
          </style>
        </head>
        <body>
          <div class="cover-page">
            <h1>PSW YEARLY EARNINGS REPORT</h1>
            <h2>${year} Summary - All Workers</h2>
            <p style="color: #9ca3af; margin-top: 20px;">Report Generated: ${reportDate}</p>
            
            <div class="cover-stats">
              <div class="cover-stat">
                <div class="value">${perPswEarnings.length}</div>
                <div class="label">PSWs</div>
              </div>
              <div class="cover-stat">
                <div class="value">${grandTotal.shifts}</div>
                <div class="label">Total Shifts</div>
              </div>
              <div class="cover-stat">
                <div class="value">${grandTotal.hours.toFixed(0)}</div>
                <div class="label">Total Hours</div>
              </div>
              <div class="cover-stat">
                <div class="value">$${grandTotal.earnings.toFixed(2)}</div>
                <div class="label">Total Paid</div>
              </div>
            </div>
          </div>

          ${perPswEarnings.map(psw => generatePswSection(psw)).join('')}

          <div class="footer">
            <p>PSW Direct • All PSW Yearly Reports • ${year}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Printing yearly reports for ${perPswEarnings.length} PSWs`);
  };

  if (perPswEarnings.length === 0) {
    return null;
  }

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
                  Per-PSW Earnings Summary
                </CardTitle>
                <CardDescription>
                  Individual earnings breakdown by time period ({perPswEarnings.length} workers)
                </CardDescription>
              </div>
            </div>
            <Button onClick={printAllYearlyReports} size="sm" variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print All Yearly Reports
            </Button>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {perPswEarnings.map(psw => (
              <Card key={psw.pswId} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {psw.pswName}
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={() => printPswYearlyReport(psw.pswId)}>
                      <Printer className="w-3 h-3 mr-1" />
                      Print Yearly
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* This Week */}
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                        <p className="text-xs font-medium text-emerald-600">This Week</p>
                      </div>
                      <p className="text-lg font-bold text-emerald-700">${psw.weekly.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {psw.weekly.count} shifts · {psw.weekly.hours.toFixed(1)} hrs
                      </p>
                    </div>

                    {/* This Month */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <p className="text-xs font-medium text-blue-600">This Month</p>
                      </div>
                      <p className="text-lg font-bold text-blue-700">${psw.monthly.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {psw.monthly.count} shifts · {psw.monthly.hours.toFixed(1)} hrs
                      </p>
                    </div>

                    {/* This Year */}
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="flex items-center gap-1 mb-1">
                        <DollarSign className="w-3 h-3 text-purple-600" />
                        <p className="text-xs font-medium text-purple-600">This Year</p>
                      </div>
                      <p className="text-lg font-bold text-purple-700">${psw.yearly.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {psw.yearly.count} shifts · {psw.yearly.hours.toFixed(1)} hrs
                      </p>
                    </div>

                    {/* All-Time */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <p className="text-xs font-medium text-primary">All-Time</p>
                      </div>
                      <p className="text-lg font-bold text-primary">${psw.allTime.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {psw.allTime.count} shifts · {psw.allTime.hours.toFixed(1)} hrs
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
