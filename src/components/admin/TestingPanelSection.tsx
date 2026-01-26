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
  Briefcase,
  Database,
  Map,
  Hospital
} from "lucide-react";
import { toast } from "sonner";
import { 
  createTestPSW, 
  createTestBookings, 
  runFullTestScenario, 
  clearTestData, 
  getTestDataStats,
  getTestShifts,
  verifyPayrollEntries,
  createDemoPayrollData,
  clearDemoData,
  runMultiCityE2ETest,
  createMockDischargeDocument,
  type TestScenarioResult,
  type FullTestResult,
  type PayrollVerificationResult,
  type MultiCityTestResult
} from "@/lib/testDataUtils";
import { sendHospitalDischargeEmail } from "@/lib/notificationService";
import { syncCompletedShiftsToPayroll } from "@/components/admin/PayrollDashboardSection";
import { getStaffPayRates } from "@/lib/payrollStore";

export const TestingPanelSection = () => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [isRunningMultiCity, setIsRunningMultiCity] = useState(false);
  const [isRunningDischargeTest, setIsRunningDischargeTest] = useState(false);
  const [testResults, setTestResults] = useState<FullTestResult | null>(null);
  const [multiCityResults, setMultiCityResults] = useState<MultiCityTestResult | null>(null);
  const [payrollVerification, setPayrollVerification] = useState<PayrollVerificationResult | null>(null);
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
    setPayrollVerification(null);
    setLogs([]);
    
    addLog("====== Starting Full E2E Test ======");
    
    try {
      addLog("Step 1: Creating test PSW profile...");
      addLog("Step 2: Creating test clients and bookings...");
      
      // Run full test scenario - no longer needs PSW ID/name as arguments
      const results = await runFullTestScenario();
      
      // Log results
      addLog(`✓ PSW Created: ${results.pswCreated.details}`);
      addLog(`✓ Clients Created: ${results.clientsCreated.details}`);
      addLog(`✓ Bookings Created: ${results.bookingsCreated.details}`);
      
      results.shiftsCompleted.forEach((shift, index) => {
        addLog(`Shift ${index + 1}: ${shift.success ? '✓' : '✗'} ${shift.details}`);
      });
      
      addLog("====== Expected Payroll Calculation ======");
      const payRates = getStaffPayRates();
      addLog(`Standard Home Care: $${payRates.standardHomeCare}/hr → $${results.payrollExpected.standardPay.toFixed(2)}`);
      addLog(`Hospital Visit: $${payRates.hospitalVisit}/hr → $${results.payrollExpected.hospitalPay.toFixed(2)}`);
      addLog(`Doctor Visit: $${payRates.doctorVisit}/hr → $${results.payrollExpected.doctorPay.toFixed(2)}`);
      addLog(`TOTAL: ${results.payrollExpected.totalHours.toFixed(1)} hours = $${results.payrollExpected.totalPay.toFixed(2)}`);
      
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
        
        // Verify payroll entries
        const testShifts = getTestShifts();
        const testShiftIds = testShifts.filter(s => s.status === 'completed').map(s => s.id);
        if (testShiftIds.length > 0) {
          addLog("Verifying payroll entries in database...");
          const verification = await verifyPayrollEntries(testShiftIds);
          setPayrollVerification(verification);
          addLog(`✓ Found ${verification.entriesFound} entries: ${verification.totalHours.toFixed(1)} hrs = $${verification.totalPay.toFixed(2)}`);
        }
      } else {
        toast.error("Payroll sync failed");
        addLog(`✗ Sync failed: ${result.error}`);
      }
    } catch (error: any) {
      toast.error("Payroll sync error");
      addLog(`✗ Error: ${error.message}`);
    }
  };

  const handleClearTestData = async () => {
    addLog("Clearing all test data (localStorage + Supabase)...");
    const result = await clearTestData();
    // Also clear demo data from Supabase
    const demoResult = await clearDemoData();
    setTestResults(null);
    setPayrollVerification(null);
    setStats(getTestDataStats());
    if (result.success && demoResult.success) {
      toast.success("All test data cleared");
      addLog(`✓ ${result.details}`);
      addLog(`✓ ${demoResult.details}`);
    } else {
      toast.warning("Partial cleanup");
      addLog(`⚠ ${result.details}`);
      addLog(`⚠ ${demoResult.details}`);
    }
  };

  const handleCreateDemoData = async () => {
    setIsCreatingDemo(true);
    addLog("====== Creating Demo Payroll Data ======");
    addLog("Inserting PSW profiles, bookings, and payroll entries into database...");
    
    try {
      const result = await createDemoPayrollData();
      
      if (result.success) {
        toast.success(`Created ${result.payrollEntriesCreated} payroll entries awaiting payment`);
        addLog(`✓ ${result.details}`);
        addLog("====== Demo Data Created Successfully ======");
        addLog("Go to 'Payroll Dashboard' or 'Payroll Approval' tabs to see pending payments!");
      } else {
        toast.error("Failed to create demo data");
        addLog(`✗ Error: ${result.details}`);
      }
    } catch (error: any) {
      toast.error("Demo data creation failed");
      addLog(`✗ Error: ${error.message}`);
    } finally {
      setIsCreatingDemo(false);
      setStats(getTestDataStats());
    }
  };

  const handleRunMultiCityTest = async () => {
    setIsRunningMultiCity(true);
    setMultiCityResults(null);
    addLog("====== Starting Multi-City E2E Test ======");
    addLog("Creating PSWs and bookings across Ontario cities: Brantford, Peterborough, London, Hamilton, Ottawa...");
    
    try {
      const result = await runMultiCityE2ETest();
      setMultiCityResults(result);
      
      if (result.success) {
        toast.success(`Multi-city test completed! Created data in ${result.cities.length} cities`);
        addLog(`✓ Created ${result.pswsCreated} PSWs across cities`);
        addLog(`✓ Created ${result.bookingsCreated} completed bookings`);
        addLog(`✓ Created ${result.payrollEntriesCreated} payroll entries`);
        addLog(`📍 Cities: ${result.cities.join(", ")}`);
        addLog("====== Multi-City Test Complete ======");
        addLog("Go to 'Orders/Calendar' tab → PSW Order Completions to test city filters!");
      } else {
        toast.error("Multi-city test failed");
        addLog(`✗ Error: ${result.details}`);
      }
    } catch (error: any) {
      toast.error("Multi-city test error");
      addLog(`✗ Error: ${error.message}`);
    } finally {
      setIsRunningMultiCity(false);
    setStats(getTestDataStats());
    }
  };

  const handleRunHospitalDischargeTest = async () => {
    setIsRunningDischargeTest(true);
    addLog("====== Hospital Discharge E2E Test ======");
    addLog("Testing hospital discharge email with mock attachment...");
    
    try {
      // Create mock discharge document
      const mockDoc = createMockDischargeDocument();
      addLog("✓ Created mock discharge document");
      
      // Send hospital discharge email
      addLog("Sending hospital discharge email with attachment...");
      const emailSent = await sendHospitalDischargeEmail(
        "tiffarshi@gmail.com", // Admin test recipient
        "Test Client",
        "Test PSW",
        undefined, // No photo for test
        new Date().toLocaleDateString(),
        ["Hospital Pick-up", "Escort Services", "Personal Care"],
        "Patient was safely discharged from hospital and transported home. Patient is stable and comfortable.",
        mockDoc.base64,
        mockDoc.fileName
      );
      
      if (emailSent) {
        toast.success("Hospital discharge email sent successfully!");
        addLog("✓ Hospital discharge email sent with attachment");
        addLog("📧 Check the Email History tab to verify the email was logged");
        addLog("====== Discharge Test Complete ======");
      } else {
        toast.error("Failed to send hospital discharge email");
        addLog("✗ Email sending failed - check console for errors");
      }
    } catch (error: any) {
      toast.error("Hospital discharge test failed");
      addLog(`✗ Error: ${error.message}`);
    } finally {
      setIsRunningDischargeTest(false);
    }
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

              <Separator orientation="vertical" className="h-8" />
              
              <Button 
                onClick={handleRunMultiCityTest}
                disabled={isRunningMultiCity}
                variant="default"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isRunningMultiCity ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Map className="w-4 h-4" />
                )}
                {isRunningMultiCity ? "Running..." : "Run Multi-City E2E Test"}
              </Button>

              <Button 
                onClick={handleRunHospitalDischargeTest}
                disabled={isRunningDischargeTest}
                variant="default"
                className="gap-2 bg-amber-600 hover:bg-amber-700"
              >
                {isRunningDischargeTest ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Hospital className="w-4 h-4" />
                )}
                {isRunningDischargeTest ? "Testing..." : "Test Hospital Discharge Email"}
              </Button>
              
              <Button 
                onClick={handleCreateDemoData}
                disabled={isCreatingDemo}
                variant="default"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isCreatingDemo ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                {isCreatingDemo ? "Creating..." : "Create Demo Payroll Data"}
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
              
              <div className="grid md:grid-cols-3 gap-4">
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
                      <span>Clients Created:</span>
                      <Badge variant={testResults.clientsCreated.success ? "default" : "destructive"}>
                        {testResults.clientsCreated.success ? "Passed" : "Failed"}
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
                      <span>Total ({testResults.payrollExpected.totalHours.toFixed(1)} hrs):</span>
                      <span className="font-mono text-primary">${testResults.payrollExpected.totalPay.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Payroll Verification Card */}
                <Card className={payrollVerification ? "" : "opacity-50"}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Database Verification
                      {payrollVerification?.success && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {payrollVerification ? (
                      <>
                        <div className="flex justify-between">
                          <span>Entries Found:</span>
                          <Badge>{payrollVerification.entriesFound}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Hours:</span>
                          <span className="font-mono">{payrollVerification.totalHours.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Pay:</span>
                          <span className="font-mono">${payrollVerification.totalPay.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="text-xs text-muted-foreground">
                          {payrollVerification.details.map((d, i) => (
                            <div key={i} className="truncate">{d.taskType.split(':')[0]}: ${d.totalOwed.toFixed(2)}</div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        Click "Sync to Payroll DB" after test to verify database entries
                      </p>
                    )}
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
