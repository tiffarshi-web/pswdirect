/**
 * Test Data Utilities for End-to-End Testing
 * 
 * This module provides functions to create test data for PSW intake,
 * job cycles, and payroll verification.
 */

import { savePSWProfile, getPSWProfile, type PSWProfile } from './pswProfileStore';
import { addBooking, type BookingData } from './bookingStore';
import { 
  addShift, 
  getShifts, 
  claimShift, 
  checkInToShift, 
  signOutFromShift,
  getShiftById,
  updateShift,
  type ShiftRecord,
  type CareSheetData,
  OFFICE_PHONE_NUMBER
} from './shiftStore';
import { getStaffPayRates, getShiftType } from './payrollStore';
import { supabase } from '@/integrations/supabase/client';

// Test Data Constants
const TEST_PREFIX = 'TEST_';

export interface TestScenarioResult {
  success: boolean;
  step: string;
  details: string;
  data?: any;
  error?: string;
  timestamp?: string;
}

export interface PayrollVerificationResult {
  success: boolean;
  entriesFound: number;
  totalHours: number;
  totalPay: number;
  details: Array<{
    shiftId: string;
    pswName: string;
    taskType: string;
    hoursWorked: number;
    payRate: number;
    totalOwed: number;
  }>;
}

export interface FullTestResult {
  pswCreated: TestScenarioResult;
  clientsCreated: TestScenarioResult;
  bookingsCreated: TestScenarioResult;
  shiftsCompleted: TestScenarioResult[];
  payrollExpected: {
    standardPay: number;
    hospitalPay: number;
    doctorPay: number;
    totalPay: number;
    totalHours: number;
  };
  payrollVerification?: PayrollVerificationResult;
  allPassed: boolean;
}

/**
 * Create a test PSW profile with approved status
 */
export const createTestPSW = (): TestScenarioResult => {
  try {
    const timestamp = Date.now();
    const testPSW: PSWProfile = {
      id: `test-psw-${timestamp}`,
      firstName: 'Test',
      lastName: 'Worker',
      email: `test.worker.${timestamp}@testpsw.com`,
      phone: '416-555-0199',
      homePostalCode: 'M5V 1A1',
      homeCity: 'Toronto',
      languages: ['en', 'fr'],
      vettingStatus: 'approved',
      appliedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      yearsExperience: '3-5',
      certifications: 'PSW Certificate, First Aid, CPR',
      hasOwnTransport: 'yes-car',
      availableShifts: 'flexible',
      vettingNotes: `${TEST_PREFIX}Auto-generated test PSW`,
    };

    savePSWProfile(testPSW);
    console.log('[TEST] Created test PSW:', testPSW.id, testPSW.firstName, testPSW.lastName);
    
    return {
      success: true,
      step: 'Create Test PSW',
      details: `Created PSW: ${testPSW.firstName} ${testPSW.lastName} (${testPSW.email})`,
      data: testPSW
    };
  } catch (error: any) {
    console.error('[TEST] Failed to create test PSW:', error);
    return {
      success: false,
      step: 'Create Test PSW',
      details: 'Failed to create test PSW',
      error: error.message
    };
  }
};

/**
 * Create test bookings with different service types
 */
export const createTestBookings = async (): Promise<TestScenarioResult> => {
  try {
    const now = new Date();
    const baseDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const dateStr = baseDate.toISOString().split('T')[0];
    const timestamp = Date.now();
    
    const testBookings: Array<Omit<BookingData, 'id' | 'createdAt'>> = [
      {
        // Standard Home Care - 2 hours
        paymentStatus: 'paid',
        serviceType: ['Personal Care', 'Companionship'],
        date: dateStr,
        startTime: '09:00',
        endTime: '11:00',
        status: 'pending',
        hours: 2,
        hourlyRate: 55,
        subtotal: 110,
        surgeAmount: 0,
        total: 110,
        isAsap: false,
        wasRefunded: false,
        orderingClient: {
          name: 'Test Client Standard',
          address: '123 Test St, Toronto, ON M5V 1A1',
          postalCode: 'M5V 1A1',
          phone: '416-555-1001',
          email: `test.standard.${timestamp}@test.com`,
          isNewAccount: true,
        },
        patient: {
          name: 'Patient Standard',
          address: '123 Test St, Toronto, ON M5V 1A1',
          postalCode: 'M5V 1A1',
          relationship: 'Parent',
          preferredLanguages: ['en'],
        },
        pswAssigned: null,
        specialNotes: `${TEST_PREFIX}Standard home care test booking`,
        emailNotifications: { confirmationSent: false, reminderSent: false },
        adminNotifications: { notified: false },
      },
      {
        // Hospital Visit - 3 hours
        paymentStatus: 'paid',
        serviceType: ['Hospital Pick-up', 'Escort Services'],
        date: dateStr,
        startTime: '11:00',
        endTime: '14:00',
        status: 'pending',
        hours: 3,
        hourlyRate: 65,
        subtotal: 195,
        surgeAmount: 0,
        total: 195,
        isAsap: false,
        wasRefunded: false,
        orderingClient: {
          name: 'Test Client Hospital',
          address: '456 Hospital Ave, Toronto, ON M5V 2B2',
          postalCode: 'M5V 2B2',
          phone: '416-555-1002',
          email: `test.hospital.${timestamp}@test.com`,
          isNewAccount: true,
        },
        patient: {
          name: 'Patient Hospital',
          address: '456 Hospital Ave, Toronto, ON M5V 2B2',
          postalCode: 'M5V 2B2',
          relationship: 'Spouse',
          preferredLanguages: ['en'],
        },
        pswAssigned: null,
        specialNotes: `${TEST_PREFIX}Hospital visit test booking`,
        isTransportBooking: true,
        pickupAddress: 'Toronto General Hospital',
        pickupPostalCode: 'M5G 2C4',
        dropoffAddress: '456 Hospital Ave, Toronto, ON M5V 2B2',
        dropoffPostalCode: 'M5V 2B2',
        emailNotifications: { confirmationSent: false, reminderSent: false },
        adminNotifications: { notified: false },
      },
      {
        // Doctor Visit - 1.5 hours
        paymentStatus: 'paid',
        serviceType: ['Doctor Visit Escort', 'Medication Pickup'],
        date: dateStr,
        startTime: '14:00',
        endTime: '15:30',
        status: 'pending',
        hours: 1.5,
        hourlyRate: 60,
        subtotal: 90,
        surgeAmount: 0,
        total: 90,
        isAsap: false,
        wasRefunded: false,
        orderingClient: {
          name: 'Test Client Doctor',
          address: '789 Medical Dr, Toronto, ON M5V 3C3',
          postalCode: 'M5V 3C3',
          phone: '416-555-1003',
          email: `test.doctor.${timestamp}@test.com`,
          isNewAccount: true,
        },
        patient: {
          name: 'Patient Doctor',
          address: '789 Medical Dr, Toronto, ON M5V 3C3',
          postalCode: 'M5V 3C3',
          relationship: 'Child',
          preferredLanguages: ['en'],
        },
        pswAssigned: null,
        specialNotes: `${TEST_PREFIX}Doctor visit test booking`,
        isTransportBooking: true,
        emailNotifications: { confirmationSent: false, reminderSent: false },
        adminNotifications: { notified: false },
      }
    ];

    const createdBookings: BookingData[] = [];
    for (const booking of testBookings) {
      const created = await addBooking(booking);
      createdBookings.push(created);
    }
    
    console.log('[TEST] Created test bookings:', createdBookings.map(b => b.id));
    
    return {
      success: true,
      step: 'Create Test Bookings',
      details: `Created ${createdBookings.length} bookings (Standard, Hospital, Doctor)`,
      data: createdBookings
    };
  } catch (error: any) {
    console.error('[TEST] Failed to create test bookings:', error);
    return {
      success: false,
      step: 'Create Test Bookings',
      details: 'Failed to create test bookings',
      error: error.message
    };
  }
};

/**
 * Simulate a complete shift cycle (claim -> check-in -> sign-out)
 */
export const simulateShiftCycle = async (
  shiftId: string, 
  pswId: string, 
  pswName: string,
  hoursWorked: number = 2
): Promise<TestScenarioResult> => {
  try {
    // Step 1: Claim the shift
    console.log('[TEST] Claiming shift:', shiftId);
    claimShift(shiftId, pswId, pswName);
    
    // Step 2: Check in
    const mockLocation = { lat: 43.6532, lng: -79.3832 }; // Toronto
    console.log('[TEST] Checking in to shift:', shiftId);
    checkInToShift(shiftId, mockLocation);
    
    // Step 3: Get shift details for care sheet
    const shift = getShiftById(shiftId);
    if (!shift) throw new Error('Shift not found after check-in');
    
    // Step 4: Create care sheet and sign out
    const careSheet: CareSheetData = {
      moodOnArrival: 'calm and relaxed',
      moodOnDeparture: 'happy and comfortable',
      tasksCompleted: shift.services || ['Personal Care'],
      observations: `${TEST_PREFIX}Simulated shift completion - ${hoursWorked} hours worked`,
      pswFirstName: pswName.split(' ')[0] || 'Test',
      officeNumber: OFFICE_PHONE_NUMBER,
    };
    
    // Get client email from booking or use test email
    const clientEmail = `test.client.${Date.now()}@test.com`;
    
    console.log('[TEST] Signing out from shift:', shiftId);
    signOutFromShift(shiftId, careSheet, clientEmail);
    
    // Get updated shift to verify completion
    const completedShift = getShiftById(shiftId);
    const shiftType = getShiftType(completedShift?.services || []);
    
    console.log('[TEST] Shift completed:', {
      shiftId,
      status: completedShift?.status,
      shiftType,
      hoursWorked
    });
    
    return {
      success: true,
      step: `Complete Shift ${shiftId}`,
      details: `Shift completed: ${shiftType} type, ${hoursWorked} hours`,
      data: {
        shift: completedShift,
        shiftType,
        hoursWorked,
      }
    };
  } catch (error: any) {
    console.error('[TEST] Failed to complete shift cycle:', shiftId, error);
    return {
      success: false,
      step: `Complete Shift ${shiftId}`,
      details: 'Failed to complete shift cycle',
      error: error.message
    };
  }
};

/**
 * Get available test shifts (shifts created from test bookings)
 */
export const getTestShifts = (): ShiftRecord[] => {
  const allShifts = getShifts();
  // Get shifts that have TEST_ prefix in observations or are available
  return allShifts.filter(shift => 
    shift.careSheet?.observations?.includes(TEST_PREFIX) || 
    shift.status === 'available'
  );
};

/**
 * Calculate expected payroll for completed test shifts
 */
export const calculateExpectedPayroll = (shifts: ShiftRecord[]): FullTestResult['payrollExpected'] => {
  const payRates = getStaffPayRates();
  
  let standardPay = 0;
  let hospitalPay = 0;
  let doctorPay = 0;
  let totalHours = 0;
  
  shifts.forEach(shift => {
    if (shift.status !== 'completed') return;
    
    const shiftType = getShiftType(shift.services || []);
    
    // Calculate hours from scheduled times
    const start = shift.scheduledStart.split(':').map(Number);
    const end = shift.scheduledEnd.split(':').map(Number);
    const hours = (end[0] + end[1]/60) - (start[0] + start[1]/60);
    totalHours += hours;
    
    switch (shiftType) {
      case 'hospital':
        hospitalPay += hours * payRates.hospitalVisit;
        break;
      case 'doctor':
        doctorPay += hours * payRates.doctorVisit;
        break;
      default:
        standardPay += hours * payRates.standardHomeCare;
    }
  });
  
  return {
    standardPay,
    hospitalPay,
    doctorPay,
    totalPay: standardPay + hospitalPay + doctorPay,
    totalHours
  };
};

/**
 * Run full end-to-end test scenario
 * Now properly uses the created PSW for all shift operations
 */
export const runFullTestScenario = async (): Promise<FullTestResult> => {
  console.log('[TEST] ====== Starting Full E2E Test Scenario ======');
  
  // Step 1: Create test PSW and capture their actual ID
  const pswResult = createTestPSW();
  const createdPsw = pswResult.data as PSWProfile | undefined;
  const testPswId = createdPsw?.id || `test-psw-fallback-${Date.now()}`;
  const testPswName = createdPsw 
    ? `${createdPsw.firstName} ${createdPsw.lastName}` 
    : 'Test Worker';
  
  console.log('[TEST] Using PSW:', { id: testPswId, name: testPswName });
  
  // Step 2: Create test bookings (which creates shifts)
  const bookingsResult = await createTestBookings();
  const createdBookings = bookingsResult.data as BookingData[] | undefined;
  
  // Extract unique clients from bookings
  const clientsCreated: TestScenarioResult = {
    success: bookingsResult.success,
    step: 'Create Test Clients',
    details: createdBookings 
      ? `Created ${createdBookings.length} test clients: ${createdBookings.map(b => b.orderingClient.name).join(', ')}`
      : 'No clients created',
    data: createdBookings?.map(b => ({
      name: b.orderingClient.name,
      email: b.orderingClient.email,
      address: b.orderingClient.address,
    })),
    timestamp: new Date().toISOString(),
  };
  
  // Wait a moment for shifts to be created
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Step 3: Get available shifts created from test bookings and complete them
  const testShifts = getTestShifts().filter(s => s.status === 'available');
  console.log('[TEST] Found available test shifts:', testShifts.length);
  
  const shiftResults: TestScenarioResult[] = [];
  
  for (const shift of testShifts) {
    // Calculate hours from scheduled times
    const start = shift.scheduledStart.split(':').map(Number);
    const end = shift.scheduledEnd.split(':').map(Number);
    const hours = (end[0] + end[1]/60) - (start[0] + start[1]/60);
    
    // Use the ACTUAL created PSW ID and name
    const result = await simulateShiftCycle(
      shift.id, 
      testPswId,  // Use the created PSW's ID
      testPswName, // Use the created PSW's name
      hours
    );
    shiftResults.push(result);
    
    // Small delay between shifts
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Step 4: Calculate expected payroll from completed shifts
  const completedShifts = getShifts().filter(s => 
    s.status === 'completed' && 
    (s.careSheet?.observations?.includes(TEST_PREFIX) || s.pswId === testPswId)
  );
  const payrollExpected = calculateExpectedPayroll(completedShifts);
  
  console.log('[TEST] ====== E2E Test Scenario Complete ======');
  console.log('[TEST] Expected Payroll:', payrollExpected);
  console.log('[TEST] Shifts completed by PSW:', testPswName, '| Count:', completedShifts.length);
  
  const allPassed = pswResult.success && 
    bookingsResult.success && 
    shiftResults.every(r => r.success);
  
  return {
    pswCreated: pswResult,
    clientsCreated,
    bookingsCreated: bookingsResult,
    shiftsCompleted: shiftResults,
    payrollExpected,
    allPassed
  };
};

/**
 * Verify payroll entries in Supabase match expected values
 */
export const verifyPayrollEntries = async (
  testShiftIds: string[]
): Promise<PayrollVerificationResult> => {
  try {
    const { data, error } = await supabase
      .from('payroll_entries')
      .select('*')
      .in('shift_id', testShiftIds);
    
    if (error) {
      console.error('[TEST] Failed to fetch payroll entries:', error);
      return {
        success: false,
        entriesFound: 0,
        totalHours: 0,
        totalPay: 0,
        details: [],
      };
    }
    
    const entries = data || [];
    const totalHours = entries.reduce((sum, e) => sum + e.hours_worked, 0);
    const totalPay = entries.reduce((sum, e) => sum + e.total_owed, 0);
    
    return {
      success: entries.length > 0,
      entriesFound: entries.length,
      totalHours,
      totalPay,
      details: entries.map(e => ({
        shiftId: e.shift_id,
        pswName: e.psw_name,
        taskType: e.task_name,
        hoursWorked: e.hours_worked,
        payRate: e.hourly_rate,
        totalOwed: e.total_owed,
      })),
    };
  } catch (error: any) {
    console.error('[TEST] Error verifying payroll:', error);
    return {
      success: false,
      entriesFound: 0,
      totalHours: 0,
      totalPay: 0,
      details: [],
    };
  }
};

/**
 * Clear all test data from localStorage AND Supabase
 */
export const clearTestData = async (): Promise<{ success: boolean; details: string }> => {
  console.log('[TEST] Clearing all test data...');
  
  try {
    // Get test shift IDs before clearing (for Supabase cleanup)
    const shifts = JSON.parse(localStorage.getItem('pswdirect_shifts') || '[]');
    const testShiftIds = shifts
      .filter((s: any) => s.careSheet?.observations?.includes(TEST_PREFIX))
      .map((s: any) => s.id);
    
    // Clear test PSW profiles
    const profiles = JSON.parse(localStorage.getItem('pswdirect_psw_profiles') || '[]');
    const testPswCount = profiles.filter((p: any) => p.vettingNotes?.includes(TEST_PREFIX)).length;
    const filteredProfiles = profiles.filter((p: any) => !p.vettingNotes?.includes(TEST_PREFIX));
    localStorage.setItem('pswdirect_psw_profiles', JSON.stringify(filteredProfiles));
    
    // Clear test bookings
    const bookings = JSON.parse(localStorage.getItem('pswdirect_bookings') || '[]');
    const testBookingCount = bookings.filter((b: any) => b.specialNotes?.includes(TEST_PREFIX)).length;
    const filteredBookings = bookings.filter((b: any) => !b.specialNotes?.includes(TEST_PREFIX));
    localStorage.setItem('pswdirect_bookings', JSON.stringify(filteredBookings));
    
    // Clear test shifts (those with TEST_ in care sheet observations)
    const testShiftCount = shifts.filter((s: any) => s.careSheet?.observations?.includes(TEST_PREFIX)).length;
    const filteredShifts = shifts.filter((s: any) => !s.careSheet?.observations?.includes(TEST_PREFIX));
    localStorage.setItem('pswdirect_shifts', JSON.stringify(filteredShifts));
    
    // Clear test payroll entries from Supabase
    let payrollDeleteCount = 0;
    if (testShiftIds.length > 0) {
      const { error, count } = await supabase
        .from('payroll_entries')
        .delete()
        .in('shift_id', testShiftIds);
      
      if (!error) {
        payrollDeleteCount = count || testShiftIds.length;
      } else {
        console.warn('[TEST] Failed to clear Supabase payroll:', error);
      }
    }
    
    const details = `Cleared: ${testPswCount} PSWs, ${testBookingCount} bookings, ${testShiftCount} shifts, ${payrollDeleteCount} payroll entries`;
    console.log('[TEST]', details);
    
    return { success: true, details };
  } catch (error: any) {
    console.error('[TEST] Error clearing test data:', error);
    return { success: false, details: error.message };
  }
};

/**
 * Get test data statistics
 */
export const getTestDataStats = () => {
  const profiles = JSON.parse(localStorage.getItem('pswdirect_psw_profiles') || '[]');
  const bookings = JSON.parse(localStorage.getItem('pswdirect_bookings') || '[]');
  const shifts = getShifts();
  
  const testProfiles = profiles.filter((p: any) => p.vettingNotes?.includes(TEST_PREFIX));
  const testBookings = bookings.filter((b: any) => b.specialNotes?.includes(TEST_PREFIX));
  const testShifts = shifts.filter((s: any) => s.careSheet?.observations?.includes(TEST_PREFIX));
  
  return {
    totalPSWs: profiles.length,
    testPSWs: testProfiles.length,
    approvedPSWs: profiles.filter((p: any) => p.vettingStatus === 'approved').length,
    pendingPSWs: profiles.filter((p: any) => p.vettingStatus === 'pending').length,
    
    totalBookings: bookings.length,
    testBookings: testBookings.length,
    
    totalShifts: shifts.length,
    testShifts: testShifts.length,
    availableShifts: shifts.filter(s => s.status === 'available').length,
    claimedShifts: shifts.filter(s => s.status === 'claimed').length,
    activeShifts: shifts.filter(s => s.status === 'checked-in').length,
    completedShifts: shifts.filter(s => s.status === 'completed').length
  };
};
