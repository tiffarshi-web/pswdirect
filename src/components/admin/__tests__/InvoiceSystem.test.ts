import { describe, it, expect } from "vitest";
import { generateInvoiceHtml, buildInvoiceDataFromBooking } from "@/components/admin/InvoiceDocument";
import type { InvoiceData } from "@/components/admin/InvoiceDocument";

// Helper to create a mock booking
const mockBooking = (overrides: Record<string, any> = {}) => ({
  id: "uuid-001",
  booking_code: "CDT-000001",
  client_name: "Jane Doe",
  client_email: "jane@example.com",
  client_phone: "416-555-1234",
  client_address: "123 Main St, Toronto",
  patient_address: "123 Main St, Toronto",
  patient_name: "Jane Doe",
  scheduled_date: "2026-03-25",
  start_time: "09:00",
  end_time: "10:00",
  hours: 1,
  subtotal: 35,
  surge_amount: 0,
  total: 35,
  status: "completed",
  payment_status: "paid",
  service_type: ["Personal Care"],
  psw_first_name: "Sarah",
  was_refunded: false,
  refund_amount: null,
  refunded_at: null,
  stripe_payment_intent_id: "pi_test123",
  is_transport_booking: false,
  created_at: "2026-03-25T08:00:00Z",
  ...overrides,
});

const mockInvoice = (overrides: Record<string, any> = {}) => ({
  invoice_number: "PSW-INV-2026-00001",
  subtotal: 35,
  tax: 0,
  surge_amount: 0,
  rush_amount: 0,
  total: 35,
  currency: "CAD",
  service_type: "Personal Care",
  duration_hours: 1,
  document_status: "paid",
  created_at: "2026-03-25T08:00:00Z",
  ...overrides,
});

describe("Invoice System Tests", () => {

  describe("1. Paid Home Care Invoice", () => {
    it("should generate correct invoice for 1-hour home care", () => {
      const booking = mockBooking();
      const inv = mockInvoice();
      const data = buildInvoiceDataFromBooking(booking, inv);

      expect(data.documentStatus).toBe("paid");
      expect(data.total).toBe(35);
      expect(data.taxAmount).toBe(0); // Home care = no HST
      expect(data.invoiceNumber).toBe("PSW-INV-2026-00001");
      expect(data.serviceType).toBe("Personal Care");

      const html = generateInvoiceHtml(data);
      expect(html).toContain("PAID");
      expect(html).toContain("$35.00");
      expect(html).toContain("PSW-INV-2026-00001");
      expect(html).toContain("Jane Doe");
    });
  });

  describe("2. Paid Home Care 1.5h Invoice", () => {
    it("should show correct total for 1.5 hours", () => {
      const booking = mockBooking({ hours: 1.5, subtotal: 50, total: 50 });
      const inv = mockInvoice({ subtotal: 50, total: 50, duration_hours: 1.5 });
      const data = buildInvoiceDataFromBooking(booking, inv);

      expect(data.total).toBe(50);
      expect(data.durationHours).toBe(1.5);
    });
  });

  describe("3. Paid Doctor Escort Invoice", () => {
    it("should include HST and show correct total", () => {
      const booking = mockBooking({
        service_type: ["Doctor Escort"],
        is_transport_booking: true,
        subtotal: 40,
        total: 45.20,
        hours: 1,
      });
      const inv = mockInvoice({
        subtotal: 40,
        tax: 5.20,
        total: 45.20,
        service_type: "Doctor Escort",
      });
      const data = buildInvoiceDataFromBooking(booking, inv);

      expect(data.total).toBe(45.20);
      expect(data.taxAmount).toBe(5.20);
      expect(data.documentStatus).toBe("paid");

      const html = generateInvoiceHtml(data);
      expect(html).toContain("HST (13%)");
      expect(html).toContain("$5.20");
    });
  });

  describe("4. Paid Doctor Escort 2h Invoice", () => {
    it("should calculate 2-hour doctor escort correctly", () => {
      const booking = mockBooking({
        service_type: ["Doctor Escort"],
        subtotal: 80,
        total: 90.40,
        hours: 2,
      });
      const inv = mockInvoice({
        subtotal: 80,
        tax: 10.40,
        total: 90.40,
        duration_hours: 2,
        service_type: "Doctor Escort",
      });
      const data = buildInvoiceDataFromBooking(booking, inv);
      expect(data.total).toBe(90.40);
      expect(data.durationHours).toBe(2);
    });
  });

  describe("5. Paid Hospital Discharge Invoice", () => {
    it("should handle hospital discharge with HST", () => {
      const booking = mockBooking({
        service_type: ["Hospital Discharge"],
        is_transport_booking: true,
        subtotal: 45,
        total: 50.85,
        hours: 1,
      });
      const inv = mockInvoice({
        subtotal: 45,
        tax: 5.85,
        total: 50.85,
        service_type: "Hospital Discharge",
      });
      const data = buildInvoiceDataFromBooking(booking, inv);

      expect(data.total).toBe(50.85);
      expect(data.taxAmount).toBe(5.85);

      const html = generateInvoiceHtml(data);
      expect(html).toContain("Hospital Discharge");
      expect(html).toContain("PAID");
    });
  });

  describe("6. Hospital 1.5h Invoice", () => {
    it("should show correct 1.5h hospital total", () => {
      const booking = mockBooking({
        service_type: ["Hospital Discharge"],
        subtotal: 67.50,
        total: 76.28,
        hours: 1.5,
      });
      const inv = mockInvoice({
        subtotal: 67.50,
        tax: 8.78,
        total: 76.28,
        duration_hours: 1.5,
        service_type: "Hospital Discharge",
      });
      const data = buildInvoiceDataFromBooking(booking, inv);
      expect(data.total).toBe(76.28);
      expect(data.durationHours).toBe(1.5);
    });
  });

  describe("7. Rush Booking Invoice", () => {
    it("should include rush fee in invoice", () => {
      const booking = mockBooking({
        subtotal: 35,
        surge_amount: 8.75,
        total: 43.75,
        is_asap: true,
      });
      const inv = mockInvoice({
        subtotal: 35,
        rush_amount: 8.75,
        surge_amount: 8.75,
        total: 43.75,
      });
      const data = buildInvoiceDataFromBooking(booking, inv);

      expect(data.total).toBe(43.75);
      expect(data.rushAmount).toBe(8.75);

      const html = generateInvoiceHtml(data);
      expect(html).toContain("Rush Fee");
      expect(html).toContain("$8.75");
    });
  });

  describe("8. Surge Booking Invoice", () => {
    it("should include surge fee in invoice", () => {
      const booking = mockBooking({
        subtotal: 35,
        surge_amount: 5.25,
        total: 40.25,
      });
      const inv = mockInvoice({
        subtotal: 35,
        surge_amount: 5.25,
        total: 40.25,
      });
      const data = buildInvoiceDataFromBooking(booking, inv);

      expect(data.surgeAmount).toBe(5.25);

      const html = generateInvoiceHtml(data);
      expect(html).toContain("Surge Fee");
    });
  });

  describe("9. Cancelled Order Document", () => {
    it("should generate cancelled status invoice", () => {
      const booking = mockBooking({
        status: "cancelled",
        payment_status: "invoice-pending",
        total: 35,
      });
      const data = buildInvoiceDataFromBooking(booking);

      expect(data.documentStatus).toBe("cancelled");

      const html = generateInvoiceHtml(data);
      expect(html).toContain("CANCELLED");
    });
  });

  describe("10. Partially Refunded Order", () => {
    it("should show original total, refund, and net paid", () => {
      const booking = mockBooking({
        was_refunded: true,
        refund_amount: 15,
        total: 35,
        refunded_at: "2026-03-26T12:00:00Z",
      });
      const inv = mockInvoice({
        total: 35,
        refund_amount: 15,
        document_status: "partially_refunded",
      });
      const data = buildInvoiceDataFromBooking(booking, inv);

      expect(data.documentStatus).toBe("partially_refunded");
      expect(data.total).toBe(35);
      expect(data.refundAmount).toBe(15);

      const html = generateInvoiceHtml(data);
      expect(html).toContain("PARTIALLY REFUNDED");
      expect(html).toContain("-$15.00");
      expect(html).toContain("Net Paid");
      expect(html).toContain("$20.00");
    });
  });

  describe("11. Fully Refunded Order", () => {
    it("should show full refund with net paid = $0", () => {
      const booking = mockBooking({
        was_refunded: true,
        refund_amount: 35,
        total: 35,
        refunded_at: "2026-03-26T12:00:00Z",
      });
      const data = buildInvoiceDataFromBooking(booking);

      expect(data.documentStatus).toBe("refunded");
      expect(data.refundAmount).toBe(35);

      const html = generateInvoiceHtml(data);
      expect(html).toContain("REFUNDED");
      expect(html).toContain("-$35.00");
      expect(html).toContain("$0.00");
    });
  });

  describe("12. Invoice Total = Stripe Total = Order Total", () => {
    it("should ensure all totals match across the system", () => {
      const total = 45.20;
      const booking = mockBooking({ total, subtotal: 40, surge_amount: 0 });
      const inv = mockInvoice({ total, subtotal: 40, tax: 5.20 });
      const data = buildInvoiceDataFromBooking(booking, inv);

      // Invoice total must match booking total
      expect(data.total).toBe(booking.total);
      // Invoice total must match stored invoice total
      expect(data.total).toBe(inv.total);
      // All three must be the same value
      expect(booking.total).toBe(inv.total);
    });
  });

  describe("13. Invoice HTML Contains Required Sections", () => {
    it("should include business info, client info, service details, pricing", () => {
      const data = buildInvoiceDataFromBooking(mockBooking(), mockInvoice());
      const html = generateInvoiceHtml(data);

      // Business info
      expect(html).toContain("PSW Direct");
      expect(html).toContain("pswdirect.com");

      // Client info
      expect(html).toContain("Jane Doe");
      expect(html).toContain("jane@example.com");

      // Service details
      expect(html).toContain("CDT-000001");
      expect(html).toContain("Personal Care");

      // Pricing
      expect(html).toContain("Subtotal");
      expect(html).toContain("Total Charged");

      // Payment
      expect(html).toContain("Payment Status");
    });
  });

  describe("14. buildInvoiceDataFromBooking Handles Missing Invoice", () => {
    it("should build invoice data from booking alone when no invoice record", () => {
      const booking = mockBooking();
      const data = buildInvoiceDataFromBooking(booking);

      expect(data.invoiceNumber).toBe("CDT-000001"); // Falls back to booking code
      expect(data.total).toBe(35);
      expect(data.documentStatus).toBe("paid");
    });
  });
});
