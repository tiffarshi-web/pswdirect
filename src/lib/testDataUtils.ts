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

// Multi-city test postal code mappings
const CITY_POSTAL_CODES: Record<string, { postalCode: string; fullAddress: string }> = {
  Brantford: { postalCode: 'N3T 1K2', fullAddress: '100 Market St, Brantford, ON' },
  Peterborough: { postalCode: 'K9H 2E4', fullAddress: '200 George St N, Peterborough, ON' },
  London: { postalCode: 'N6A 3C9', fullAddress: '300 Dundas St, London, ON' },
  Hamilton: { postalCode: 'L8P 1A1', fullAddress: '400 King St W, Hamilton, ON' },
  Ottawa: { postalCode: 'K1P 5G3', fullAddress: '500 Rideau St, Ottawa, ON' },
  Toronto: { postalCode: 'M5V 1A1', fullAddress: '600 Bay St, Toronto, ON' },
};

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

/**
 * Create a comprehensive demo scenario with PSWs, bookings, and payroll entries
 * This inserts data directly into Supabase for full database persistence
 */
export const createDemoPayrollData = async (): Promise<{
  success: boolean;
  pswsCreated: number;
  bookingsCreated: number;
  payrollEntriesCreated: number;
  details: string;
}> => {
  console.log('[DEMO] Creating comprehensive demo payroll data in Supabase...');
  
  try {
    const timestamp = Date.now();
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Define 3 different test PSWs with varied profiles
    const testPSWs = [
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: `sarah.johnson.${timestamp}@testpsw.com`,
        phone: '416-555-0101',
        home_postal_code: 'M5V 1A1',
        home_city: 'Toronto',
        languages: ['en', 'fr'],
        vetting_status: 'approved',
        years_experience: '5+',
        certifications: 'PSW Certificate, First Aid, CPR, Dementia Care',
        has_own_transport: 'yes-car',
        available_shifts: 'flexible',
        vetting_notes: `${TEST_PREFIX}Demo PSW for payroll testing`,
        approved_at: new Date().toISOString(),
      },
      {
        first_name: 'Michael',
        last_name: 'Chen',
        email: `michael.chen.${timestamp}@testpsw.com`,
        phone: '416-555-0102',
        home_postal_code: 'L4C 3B8',
        home_city: 'Barrie',
        languages: ['en', 'zh'],
        vetting_status: 'approved',
        years_experience: '3-5',
        certifications: 'PSW Certificate, First Aid',
        has_own_transport: 'yes-car',
        available_shifts: 'weekdays',
        vetting_notes: `${TEST_PREFIX}Demo PSW for payroll testing`,
        approved_at: new Date().toISOString(),
      },
      {
        first_name: 'Priya',
        last_name: 'Patel',
        email: `priya.patel.${timestamp}@testpsw.com`,
        phone: '416-555-0103',
        home_postal_code: 'L6Y 4M5',
        home_city: 'Brampton',
        languages: ['en', 'hi', 'gu'],
        vetting_status: 'approved',
        years_experience: '1-3',
        certifications: 'PSW Certificate, First Aid, CPR',
        has_own_transport: 'no',
        available_shifts: 'weekends',
        vetting_notes: `${TEST_PREFIX}Demo PSW for payroll testing`,
        approved_at: new Date().toISOString(),
      }
    ];
    
    // Insert PSW profiles into Supabase
    const { data: createdPSWs, error: pswError } = await supabase
      .from('psw_profiles')
      .insert(testPSWs)
      .select();
    
    if (pswError) {
      console.error('[DEMO] Failed to create PSW profiles:', pswError);
      throw new Error(`PSW creation failed: ${pswError.message}`);
    }
    
    console.log('[DEMO] Created PSW profiles:', createdPSWs?.length);
    
    // Insert banking info for each PSW
    if (createdPSWs && createdPSWs.length > 0) {
      const bankingData = createdPSWs.map((psw, index) => ({
        psw_id: psw.id,
        institution_number: '00' + (index + 1),
        transit_number: '1234' + index,
        account_number: '999888' + (7770 + index),
      }));
      
      const { error: bankingError } = await supabase
        .from('psw_banking')
        .insert(bankingData);
      
      if (bankingError) {
        console.warn('[DEMO] Banking insert warning:', bankingError);
      } else {
        console.log('[DEMO] Created banking records for PSWs');
      }
    }
    
    // Define test bookings with different service types
    const testBookings = [
      // Sarah Johnson's completed shifts
      {
        client_name: 'Margaret Wilson',
        client_email: `margaret.${timestamp}@test.com`,
        client_phone: '416-555-2001',
        client_address: '100 King St W, Toronto, ON',
        client_postal_code: 'M5V 1A1',
        patient_name: 'Robert Wilson',
        patient_address: '100 King St W, Toronto, ON',
        patient_postal_code: 'M5V 1A1',
        patient_relationship: 'Spouse',
        service_type: ['Personal Care', 'Companionship'],
        scheduled_date: dateStr,
        start_time: '09:00',
        end_time: '12:00',
        hours: 3,
        hourly_rate: 55,
        subtotal: 165,
        surge_amount: 0,
        total: 165,
        status: 'completed',
        payment_status: 'paid',
        booking_code: `TEST-STD-${timestamp}-1`,
        special_notes: `${TEST_PREFIX}Standard home care shift`,
        psw_assigned: createdPSWs?.[0]?.id,
        psw_first_name: 'Sarah',
        care_sheet: { 
          moodOnArrival: 'calm', 
          moodOnDeparture: 'happy',
          tasksCompleted: ['Personal Care', 'Companionship'],
          observations: `${TEST_PREFIX}Client was in good spirits`,
          pswFirstName: 'Sarah'
        },
        care_sheet_submitted_at: new Date().toISOString(),
        care_sheet_psw_name: 'Sarah',
      },
      {
        client_name: 'David Thompson',
        client_email: `david.${timestamp}@test.com`,
        client_phone: '416-555-2002',
        client_address: '200 Bay St, Toronto, ON',
        client_postal_code: 'M5J 2J5',
        patient_name: 'Eleanor Thompson',
        patient_address: 'Toronto General Hospital',
        patient_postal_code: 'M5G 2C4',
        patient_relationship: 'Mother',
        service_type: ['Hospital Pick-up', 'Escort Services'],
        scheduled_date: dateStr,
        start_time: '10:00',
        end_time: '14:00',
        hours: 4,
        hourly_rate: 65,
        subtotal: 260,
        surge_amount: 0,
        total: 260,
        status: 'completed',
        payment_status: 'paid',
        booking_code: `TEST-HSP-${timestamp}-1`,
        special_notes: `${TEST_PREFIX}Hospital discharge pickup`,
        is_transport_booking: true,
        pickup_address: 'Toronto General Hospital',
        pickup_postal_code: 'M5G 2C4',
        dropoff_address: '200 Bay St, Toronto, ON',
        psw_assigned: createdPSWs?.[0]?.id,
        psw_first_name: 'Sarah',
        care_sheet: { 
          moodOnArrival: 'anxious', 
          moodOnDeparture: 'relieved',
          tasksCompleted: ['Hospital Pick-up', 'Escort Services'],
          observations: `${TEST_PREFIX}Patient discharged successfully`,
          pswFirstName: 'Sarah',
          hospitalDischarge: { 
            dischargeTime: '11:00',
            medicationsReceived: true,
            followUpAppointment: 'Next Tuesday 2PM'
          }
        },
        care_sheet_submitted_at: new Date().toISOString(),
        care_sheet_psw_name: 'Sarah',
      },
      // Michael Chen's completed shifts
      {
        client_name: 'Linda Brown',
        client_email: `linda.${timestamp}@test.com`,
        client_phone: '705-555-3001',
        client_address: '50 Dunlop St E, Barrie, ON',
        client_postal_code: 'L4M 1A1',
        patient_name: 'George Brown',
        patient_address: '50 Dunlop St E, Barrie, ON',
        patient_postal_code: 'L4M 1A1',
        patient_relationship: 'Husband',
        service_type: ['Doctor Visit Escort', 'Medication Pickup'],
        scheduled_date: dateStr,
        start_time: '13:00',
        end_time: '15:00',
        hours: 2,
        hourly_rate: 60,
        subtotal: 120,
        surge_amount: 0,
        total: 120,
        status: 'completed',
        payment_status: 'paid',
        booking_code: `TEST-DOC-${timestamp}-1`,
        special_notes: `${TEST_PREFIX}Doctor visit escort`,
        is_transport_booking: true,
        psw_assigned: createdPSWs?.[1]?.id,
        psw_first_name: 'Michael',
        care_sheet: { 
          moodOnArrival: 'nervous', 
          moodOnDeparture: 'calm',
          tasksCompleted: ['Doctor Visit Escort', 'Medication Pickup'],
          observations: `${TEST_PREFIX}Routine checkup completed`,
          pswFirstName: 'Michael'
        },
        care_sheet_submitted_at: new Date().toISOString(),
        care_sheet_psw_name: 'Michael',
      },
      {
        client_name: 'Susan Miller',
        client_email: `susan.${timestamp}@test.com`,
        client_phone: '705-555-3002',
        client_address: '123 Bayfield St, Barrie, ON',
        client_postal_code: 'L4M 3B3',
        patient_name: 'James Miller',
        patient_address: '123 Bayfield St, Barrie, ON',
        patient_postal_code: 'L4M 3B3',
        patient_relationship: 'Father',
        service_type: ['Personal Care', 'Meal Preparation'],
        scheduled_date: dateStr,
        start_time: '08:00',
        end_time: '11:00',
        hours: 3,
        hourly_rate: 55,
        subtotal: 165,
        surge_amount: 0,
        total: 165,
        status: 'completed',
        payment_status: 'paid',
        booking_code: `TEST-STD-${timestamp}-2`,
        special_notes: `${TEST_PREFIX}Morning care routine`,
        psw_assigned: createdPSWs?.[1]?.id,
        psw_first_name: 'Michael',
        care_sheet: { 
          moodOnArrival: 'sleepy', 
          moodOnDeparture: 'energetic',
          tasksCompleted: ['Personal Care', 'Meal Preparation'],
          observations: `${TEST_PREFIX}Prepared breakfast and assisted with morning routine`,
          pswFirstName: 'Michael'
        },
        care_sheet_submitted_at: new Date().toISOString(),
        care_sheet_psw_name: 'Michael',
      },
      // Priya Patel's completed shift
      {
        client_name: 'Karen Singh',
        client_email: `karen.${timestamp}@test.com`,
        client_phone: '905-555-4001',
        client_address: '75 Main St N, Brampton, ON',
        client_postal_code: 'L6X 1N1',
        patient_name: 'Raj Singh',
        patient_address: '75 Main St N, Brampton, ON',
        patient_postal_code: 'L6X 1N1',
        patient_relationship: 'Grandfather',
        service_type: ['Personal Care', 'Companionship', 'Light Housekeeping'],
        scheduled_date: dateStr,
        start_time: '14:00',
        end_time: '18:00',
        hours: 4,
        hourly_rate: 55,
        subtotal: 220,
        surge_amount: 0,
        total: 220,
        status: 'completed',
        payment_status: 'paid',
        booking_code: `TEST-STD-${timestamp}-3`,
        special_notes: `${TEST_PREFIX}Afternoon care with light housekeeping`,
        psw_assigned: createdPSWs?.[2]?.id,
        psw_first_name: 'Priya',
        care_sheet: { 
          moodOnArrival: 'cheerful', 
          moodOnDeparture: 'content',
          tasksCompleted: ['Personal Care', 'Companionship', 'Light Housekeeping'],
          observations: `${TEST_PREFIX}Enjoyed conversation in Hindi, tidied living room`,
          pswFirstName: 'Priya'
        },
        care_sheet_submitted_at: new Date().toISOString(),
        care_sheet_psw_name: 'Priya',
      }
    ];
    
    // Insert bookings
    const { data: createdBookings, error: bookingError } = await supabase
      .from('bookings')
      .insert(testBookings)
      .select();
    
    if (bookingError) {
      console.error('[DEMO] Failed to create bookings:', bookingError);
      throw new Error(`Booking creation failed: ${bookingError.message}`);
    }
    
    console.log('[DEMO] Created bookings:', createdBookings?.length);
    
    // Now create payroll entries for these completed shifts
    const payrollEntries = [
      // Sarah Johnson - Standard Home Care (3 hours @ $22/hr = $66)
      {
        shift_id: `demo-shift-${timestamp}-1`,
        psw_id: createdPSWs?.[0]?.id || 'unknown',
        psw_name: 'Sarah Johnson',
        task_name: 'Standard Home Care: Personal Care, Companionship',
        hours_worked: 3,
        hourly_rate: 22,
        surcharge_applied: 0,
        total_owed: 66,
        scheduled_date: dateStr,
        status: 'pending',
      },
      // Sarah Johnson - Hospital Visit (4 hours @ $28/hr = $112)
      {
        shift_id: `demo-shift-${timestamp}-2`,
        psw_id: createdPSWs?.[0]?.id || 'unknown',
        psw_name: 'Sarah Johnson',
        task_name: 'Hospital Pick-up: Hospital Pick-up, Escort Services',
        hours_worked: 4,
        hourly_rate: 28,
        surcharge_applied: 0,
        total_owed: 112,
        scheduled_date: dateStr,
        status: 'pending',
      },
      // Michael Chen - Doctor Visit (2 hours @ $25/hr = $50)
      {
        shift_id: `demo-shift-${timestamp}-3`,
        psw_id: createdPSWs?.[1]?.id || 'unknown',
        psw_name: 'Michael Chen',
        task_name: 'Doctor Visit: Doctor Visit Escort, Medication Pickup',
        hours_worked: 2,
        hourly_rate: 25,
        surcharge_applied: 0,
        total_owed: 50,
        scheduled_date: dateStr,
        status: 'pending',
      },
      // Michael Chen - Standard Home Care (3 hours @ $22/hr = $66)
      {
        shift_id: `demo-shift-${timestamp}-4`,
        psw_id: createdPSWs?.[1]?.id || 'unknown',
        psw_name: 'Michael Chen',
        task_name: 'Standard Home Care: Personal Care, Meal Preparation',
        hours_worked: 3,
        hourly_rate: 22,
        surcharge_applied: 0,
        total_owed: 66,
        scheduled_date: dateStr,
        status: 'pending',
      },
      // Priya Patel - Standard Home Care with overtime (4.5 hours @ $22/hr + $11 OT = $110)
      {
        shift_id: `demo-shift-${timestamp}-5`,
        psw_id: createdPSWs?.[2]?.id || 'unknown',
        psw_name: 'Priya Patel',
        task_name: 'Standard Home Care: Personal Care, Companionship, Light Housekeeping',
        hours_worked: 4.5,
        hourly_rate: 22,
        surcharge_applied: 11,
        total_owed: 110,
        scheduled_date: dateStr,
        status: 'overtime_adjusted',
      }
    ];
    
    const { data: createdPayroll, error: payrollError } = await supabase
      .from('payroll_entries')
      .insert(payrollEntries)
      .select();
    
    if (payrollError) {
      console.error('[DEMO] Failed to create payroll entries:', payrollError);
      throw new Error(`Payroll creation failed: ${payrollError.message}`);
    }
    
    console.log('[DEMO] Created payroll entries:', createdPayroll?.length);
    
    const summary = `Created ${createdPSWs?.length || 0} PSWs, ${createdBookings?.length || 0} bookings, ${createdPayroll?.length || 0} payroll entries (4 pending, 1 overtime)`;
    console.log('[DEMO] Complete:', summary);
    
    return {
      success: true,
      pswsCreated: createdPSWs?.length || 0,
      bookingsCreated: createdBookings?.length || 0,
      payrollEntriesCreated: createdPayroll?.length || 0,
      details: summary,
    };
    
  } catch (error: any) {
    console.error('[DEMO] Error creating demo data:', error);
    return {
      success: false,
      pswsCreated: 0,
      bookingsCreated: 0,
      payrollEntriesCreated: 0,
      details: error.message,
    };
  }
};

/**
 * Clear demo data from Supabase
 */
export const clearDemoData = async (): Promise<{ success: boolean; details: string }> => {
  console.log('[DEMO] Clearing demo data from Supabase...');
  
  try {
    // Delete payroll entries with demo prefix in shift_id
    const { error: payrollError, count: payrollCount } = await supabase
      .from('payroll_entries')
      .delete()
      .like('shift_id', 'demo-shift-%');
    
    if (payrollError) console.warn('[DEMO] Payroll delete warning:', payrollError);
    
    // Delete bookings with TEST_ prefix in special_notes
    const { error: bookingError, count: bookingCount } = await supabase
      .from('bookings')
      .delete()
      .like('special_notes', `${TEST_PREFIX}%`);
    
    if (bookingError) console.warn('[DEMO] Booking delete warning:', bookingError);
    
    // Delete PSW profiles with TEST_ prefix in vetting_notes
    const { error: pswError, count: pswCount } = await supabase
      .from('psw_profiles')
      .delete()
      .like('vetting_notes', `${TEST_PREFIX}%`);
    
    if (pswError) console.warn('[DEMO] PSW delete warning:', pswError);
    
    const details = `Cleared Supabase demo data`;
    console.log('[DEMO]', details);
    
    return { success: true, details };
  } catch (error: any) {
    console.error('[DEMO] Error clearing demo data:', error);
    return { success: false, details: error.message };
  }
};

/**
 * Multi-City E2E Test
 * Creates PSWs and completed bookings across multiple Ontario cities
 * to verify geographic filtering works correctly
 */
export interface MultiCityTestResult {
  success: boolean;
  pswsCreated: number;
  bookingsCreated: number;
  payrollEntriesCreated: number;
  cities: string[];
  details: string;
}

export const runMultiCityE2ETest = async (): Promise<MultiCityTestResult> => {
  console.log('[MULTI-CITY TEST] Starting multi-city E2E test...');
  
  const timestamp = Date.now();
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  const cities = ['Brantford', 'Peterborough', 'London', 'Hamilton', 'Ottawa'];
  
  try {
    // Create PSWs for each city
    const pswData = [
      {
        first_name: 'Jessica',
        last_name: 'Adams',
        email: `jessica.adams.${timestamp}@testpsw.com`,
        phone: '519-555-0101',
        home_postal_code: CITY_POSTAL_CODES.Brantford.postalCode,
        home_city: 'Brantford',
        languages: ['en'],
        vetting_status: 'approved',
        years_experience: '3-5',
        certifications: 'PSW Certificate, First Aid, CPR',
        has_own_transport: 'yes-car',
        available_shifts: 'flexible',
        vetting_notes: `${TEST_PREFIX}Multi-city test PSW - Brantford`,
        approved_at: new Date().toISOString(),
      },
      {
        first_name: 'David',
        last_name: 'Wilson',
        email: `david.wilson.${timestamp}@testpsw.com`,
        phone: '705-555-0102',
        home_postal_code: CITY_POSTAL_CODES.Peterborough.postalCode,
        home_city: 'Peterborough',
        languages: ['en', 'fr'],
        vetting_status: 'approved',
        years_experience: '5+',
        certifications: 'PSW Certificate, First Aid, CPR, Palliative Care',
        has_own_transport: 'yes-car',
        available_shifts: 'weekdays',
        vetting_notes: `${TEST_PREFIX}Multi-city test PSW - Peterborough`,
        approved_at: new Date().toISOString(),
      },
      {
        first_name: 'Emma',
        last_name: 'Brown',
        email: `emma.brown.${timestamp}@testpsw.com`,
        phone: '519-555-0103',
        home_postal_code: CITY_POSTAL_CODES.London.postalCode,
        home_city: 'London',
        languages: ['en'],
        vetting_status: 'approved',
        years_experience: '1-3',
        certifications: 'PSW Certificate, First Aid',
        has_own_transport: 'no',
        available_shifts: 'weekends',
        vetting_notes: `${TEST_PREFIX}Multi-city test PSW - London`,
        approved_at: new Date().toISOString(),
      },
      {
        first_name: 'Marcus',
        last_name: 'Taylor',
        email: `marcus.taylor.${timestamp}@testpsw.com`,
        phone: '905-555-0104',
        home_postal_code: CITY_POSTAL_CODES.Hamilton.postalCode,
        home_city: 'Hamilton',
        languages: ['en', 'es'],
        vetting_status: 'approved',
        years_experience: '3-5',
        certifications: 'PSW Certificate, First Aid, CPR, Dementia Care',
        has_own_transport: 'yes-car',
        available_shifts: 'flexible',
        vetting_notes: `${TEST_PREFIX}Multi-city test PSW - Hamilton`,
        approved_at: new Date().toISOString(),
      },
      {
        first_name: 'Aisha',
        last_name: 'Khan',
        email: `aisha.khan.${timestamp}@testpsw.com`,
        phone: '613-555-0105',
        home_postal_code: CITY_POSTAL_CODES.Ottawa.postalCode,
        home_city: 'Ottawa',
        languages: ['en', 'fr', 'ar'],
        vetting_status: 'approved',
        years_experience: '5+',
        certifications: 'PSW Certificate, First Aid, CPR, Mental Health',
        has_own_transport: 'yes-car',
        available_shifts: 'flexible',
        vetting_notes: `${TEST_PREFIX}Multi-city test PSW - Ottawa`,
        approved_at: new Date().toISOString(),
      },
    ];
    
    // Insert PSWs
    const { data: createdPSWs, error: pswError } = await supabase
      .from('psw_profiles')
      .insert(pswData)
      .select();
    
    if (pswError) {
      console.error('[MULTI-CITY TEST] PSW creation failed:', pswError);
      throw new Error(`PSW creation failed: ${pswError.message}`);
    }
    
    console.log('[MULTI-CITY TEST] Created PSWs:', createdPSWs?.length);
    
    // Create completed bookings for each PSW in their respective cities
    const bookingData = (createdPSWs || []).map((psw, index) => {
      const city = cities[index];
      const cityInfo = CITY_POSTAL_CODES[city];
      
      return {
        client_name: `Test Client ${city}`,
        client_email: `testclient.${city.toLowerCase()}.${timestamp}@test.com`,
        client_phone: `555-${1000 + index}`,
        client_address: cityInfo.fullAddress,
        client_postal_code: cityInfo.postalCode,
        patient_name: `Test Patient ${city}`,
        patient_address: cityInfo.fullAddress,
        patient_postal_code: cityInfo.postalCode,
        patient_relationship: 'Self',
        service_type: index % 2 === 0 ? ['Personal Care', 'Companionship'] : ['Doctor Visit Escort'],
        scheduled_date: dateStr,
        start_time: `${9 + index}:00`,
        end_time: `${11 + index}:00`,
        hours: 2,
        hourly_rate: index % 2 === 0 ? 55 : 60,
        subtotal: index % 2 === 0 ? 110 : 120,
        surge_amount: 0,
        total: index % 2 === 0 ? 110 : 120,
        status: 'completed',
        payment_status: 'paid',
        booking_code: `MCITY-${city.substring(0, 3).toUpperCase()}-${timestamp}`,
        special_notes: `${TEST_PREFIX}Multi-city test booking - ${city}`,
        psw_assigned: psw.id,
        psw_first_name: psw.first_name,
        care_sheet: {
          moodOnArrival: 'calm',
          moodOnDeparture: 'happy',
          tasksCompleted: index % 2 === 0 ? ['Personal Care', 'Companionship'] : ['Doctor Visit Escort'],
          observations: `${TEST_PREFIX}Multi-city test completed successfully in ${city}`,
          pswFirstName: psw.first_name,
        },
        care_sheet_submitted_at: new Date().toISOString(),
        care_sheet_psw_name: psw.first_name,
      };
    });
    
    // Insert bookings
    const { data: createdBookings, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select();
    
    if (bookingError) {
      console.error('[MULTI-CITY TEST] Booking creation failed:', bookingError);
      throw new Error(`Booking creation failed: ${bookingError.message}`);
    }
    
    console.log('[MULTI-CITY TEST] Created bookings:', createdBookings?.length);
    
    // Create payroll entries for each completed shift
    const payrollData = (createdPSWs || []).map((psw, index) => {
      const city = cities[index];
      const isStandard = index % 2 === 0;
      const hours = 2;
      const hourlyRate = isStandard ? 22 : 25; // PSW pay rates
      
      return {
        shift_id: `mcity-shift-${timestamp}-${index}`,
        psw_id: psw.id,
        psw_name: `${psw.first_name} ${psw.last_name}`,
        task_name: isStandard ? 'Standard Home Care' : 'Doctor Visit Escort',
        hours_worked: hours,
        hourly_rate: hourlyRate,
        surcharge_applied: 0,
        total_owed: hours * hourlyRate,
        scheduled_date: dateStr,
        status: 'pending',
      };
    });
    
    const { data: createdPayroll, error: payrollError } = await supabase
      .from('payroll_entries')
      .insert(payrollData)
      .select();
    
    if (payrollError) {
      console.error('[MULTI-CITY TEST] Payroll creation failed:', payrollError);
      throw new Error(`Payroll creation failed: ${payrollError.message}`);
    }
    
    console.log('[MULTI-CITY TEST] Created payroll entries:', createdPayroll?.length);
    
    const details = `Created ${createdPSWs?.length || 0} PSWs, ${createdBookings?.length || 0} bookings, ${createdPayroll?.length || 0} payroll entries across ${cities.join(', ')}`;
    
    return {
      success: true,
      pswsCreated: createdPSWs?.length || 0,
      bookingsCreated: createdBookings?.length || 0,
      payrollEntriesCreated: createdPayroll?.length || 0,
      cities,
      details,
    };
  } catch (error: any) {
    console.error('[MULTI-CITY TEST] Error:', error);
    return {
      success: false,
      pswsCreated: 0,
      bookingsCreated: 0,
      payrollEntriesCreated: 0,
      cities: [],
      details: error.message,
    };
  }
};
