import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  UserPlus, 
  Calendar, 
  CheckCircle, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  Briefcase
} from "lucide-react";
import { toast } from "sonner";
import { 
  createTestPSW, 
  createTestBookings, 
  runFullTestScenario, 
  clearTestData, 
  getTestDataStats,
  type TestScenarioResult,
  type FullTestResult
} from "@/lib/testDataUtils";
import { syncCompletedShiftsToPayroll } from "@/components/admin/PayrollDashboardSection";
import { getStaffPayRates } from "@/lib/payrollStore";

export const TestingPanelSection = () => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<FullTestResult | null>(null);
  const [stats, setStats] = useState(getTestDataStats());
  const [logs, setLogs] = useState<string[]>([]);

  // Refresh stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getTestDataStats());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleCreateTestPSW = () => {
    addLog("Creating test PSW...");
    const result = createTestPSW();
    if (result.success) {
      toast.success("Test PSW created successfully");
      addLog(`✓ ${result.details}`);
    } else {
      toast.error("Failed to create test PSW");
      addLog(`✗ Error: ${result.error}`);
    }
    setStats(getTestDataStats());
  };

  const handleCreateTestBookings = async () => {
    addLog("Creating test bookings...");
    const result = await createTestBookings();
    if (result.success) {
      toast.success("Test bookings created successfully");
      addLog(`✓ ${result.details}`);
    } else {
      toast.error("Failed to create test bookings");
      addLog(`✗ Error: ${result.error}`);
    }
    setStats(getTestDataStats());
  };

  const handleRunFullTest = async () => {
    setIsRunningTest(true);
    setTestResults(null);
    setLogs([]);
    
    addLog("====== Starting Full E2E Test ======");
    
    try {
      // Use a test PSW ID
      const testPswId = `test-psw-${Date.now()}`;
      const testPswName = "Test Worker";
      
      addLog("Step 1: Creating test PSW profile...");
      addLog("Step 2: Creating test bookings (Standard, Hospital, Doctor)...");
      
      const results = await runFullTestScenario(testPswId, testPswName);
      
      // Log results
      addLog(`PSW Created: ${results.pswCreated.success ? '✓' : '✗'} ${results.pswCreated.details}`);
      addLog(`Bookings Created: ${results.bookingsCreated.success ? '✓' : '✗'} ${results.bookingsCreated.details}`);
      
      results.shiftsCompleted.forEach((shift, index) => {
        addLog(`Shift ${index + 1}: ${shift.success ? '✓' : '✗'} ${shift.details}`);
      });
      
      addLog("====== Expected Payroll Calculation ======");
      const payRates = getStaffPayRates();
      addLog(`Standard Home Care: 2 hrs × $${payRates.standardHomeCare}/hr = $${results.payrollExpected.standardPay.toFixed(2)}`);
      addLog(`Hospital Visit: 3 hrs × $${payRates.hospitalVisit}/hr = $${results.payrollExpected.hospitalPay.toFixed(2)}`);
      addLog(`Doctor Visit: 1.5 hrs × $${payRates.doctorVisit}/hr = $${results.payrollExpected.doctorPay.toFixed(2)}`);
      addLog(`TOTAL EXPECTED PAY: $${results.payrollExpected.totalPay.toFixed(2)}`);
      
      setTestResults(results);
      
      if (results.allPassed) {
        toast.success("All E2E tests passed!");
        addLog("====== ALL TESTS PASSED ======");
      } else {
        toast.warning("Some tests failed - check logs");
        addLog("====== SOME TESTS FAILED ======");
      }
    } catch (error: any) {
      toast.error("Test execution failed");
      addLog(`ERROR: ${error.message}`);
    } finally {
      setIsRunningTest(false);
      setStats(getTestDataStats());
    }
  };

  const handleSyncPayroll = async () => {
    addLog("Syncing completed shifts to payroll database...");
    try {
      const result = await syncCompletedShiftsToPayroll();
      if (result.success) {
        toast.success(`Synced ${result.count} payroll entries`);
        addLog(`✓ Synced ${result.count} entries to database`);
      } else {
        toast.error("Payroll sync failed");
        addLog(`✗ Sync failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error("Payroll sync error");
      addLog(`✗ Error: ${error.message}`);
    }
  };

  const handleClearTestData = () => {
    addLog("Clearing all test data...");
    clearTestData();
    setTestResults(null);
    setStats(getTestDataStats());
    toast.success("Test data cleared");
    addLog("✓ Test data cleared from localStorage");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            E2E Testing Panel
          </CardTitle>
          <CardDescription>
            Test the complete PSW intake → Job Completion → Payroll flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">PSWs</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stats.totalPSWs}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stats.approvedPSWs} approved, {stats.pendingPSWs} pending)
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Bookings</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stats.totalBookings}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stats.testBookings} test)
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Shifts</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stats.totalShifts}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stats.completedShifts} completed)
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Shift Status</span>
                </div>
                <div className="mt-1 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Available:</span>
                    <Badge variant="outline">{stats.availableShifts}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Active:</span>
                    <Badge variant="secondary">{stats.activeShifts}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Test Actions */}
          <div className="space-y-4">
            <h3 className="font-medium">Test Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={handleCreateTestPSW}
                variant="outline"
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create Test PSW
              </Button>
              
              <Button 
                onClick={handleCreateTestBookings}
                variant="outline"
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Create Test Bookings
              </Button>
              
              <Button 
                onClick={handleRunFullTest}
                disabled={isRunningTest}
                variant="brand"
                className="gap-2"
              >
                {isRunningTest ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isRunningTest ? "Running..." : "Run Full E2E Test"}
              </Button>
              
              <Button 
                onClick={handleSyncPayroll}
                variant="secondary"
                className="gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Sync to Payroll DB
              </Button>
              
              <Button 
                onClick={handleClearTestData}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Test Data
              </Button>
            </div>
          </div>

          <Separator />

          {/* Test Results */}
          {testResults && (
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                {testResults.allPassed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                Test Results
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Execution Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>PSW Creation:</span>
                      <Badge variant={testResults.pswCreated.success ? "default" : "destructive"}>
                        {testResults.pswCreated.success ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Bookings Creation:</span>
                      <Badge variant={testResults.bookingsCreated.success ? "default" : "destructive"}>
                        {testResults.bookingsCreated.success ? "Passed" : "Failed"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Shifts Completed:</span>
                      <Badge variant="secondary">
                        {testResults.shiftsCompleted.filter(s => s.success).length} / {testResults.shiftsCompleted.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Expected Payroll</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Standard Home Care:</span>
                      <span className="font-mono">${testResults.payrollExpected.standardPay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hospital Visit:</span>
                      <span className="font-mono">${testResults.payrollExpected.hospitalPay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Doctor Visit:</span>
                      <span className="font-mono">${testResults.payrollExpected.doctorPay.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="font-mono text-primary">${testResults.payrollExpected.totalPay.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <Separator />

          {/* Execution Log */}
          <div className="space-y-2">
            <h3 className="font-medium">Execution Log</h3>
            <Card className="bg-muted/30">
              <ScrollArea className="h-[200px]">
                <CardContent className="p-4">
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No logs yet. Run a test to see execution details.
                    </p>
                  ) : (
                    <div className="font-mono text-xs space-y-1">
                      {logs.map((log, index) => (
                        <div 
                          key={index} 
                          className={`${
                            log.includes('✓') ? 'text-green-600' : 
                            log.includes('✗') ? 'text-red-600' : 
                            log.includes('======') ? 'text-primary font-bold' :
                            'text-muted-foreground'
                          }`}
                        >
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </ScrollArea>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Export sync function for use in testing panel
export { syncCompletedShiftsToPayroll };
