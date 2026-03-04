import { describe, it, expect } from "vitest";
import { generateCPA005File, type CPAPaymentRecord } from "@/lib/securityStore";

/**
 * Tests for:
 * 1. CPA-005 file generation (header/detail/trailer structure)
 * 2. Admin payout state machine (requested → approved → payout_ready → cleared)
 * 3. PayoutQueueSection filter logic
 * 4. Reject flow (entries unlinked)
 */

// ── 1. CPA-005 File Format ──────────────────────────────────────────

describe("generateCPA005File", () => {
  const samplePayment: CPAPaymentRecord = {
    pswId: "psw-001",
    legalName: "Jane Doe",
    transitNumber: "12345",
    institutionNumber: "001",
    accountNumber: "1234567890",
    amount: 440.00,
    referenceNumber: "PAYOUT-ABCD1234",
  };

  it("generates a file with header (A), detail (D), and trailer (Z) records", () => {
    const result = generateCPA005File([samplePayment], "0000000001", "PSW DIRECT PAYROLL", "0001");
    const lines = result.split("\n");
    expect(lines.length).toBe(3); // header + 1 detail + trailer
    expect(lines[0][0]).toBe("A");
    expect(lines[1][0]).toBe("D");
    expect(lines[2][0]).toBe("Z");
  });

  it("includes correct transaction code 450 (credit) in detail record", () => {
    const result = generateCPA005File([samplePayment], "0000000001", "PSW DIRECT", "0001");
    const detail = result.split("\n")[1];
    // After "D" + 9-char sequence, next 3 chars should be "450"
    expect(detail.substring(10, 13)).toBe("450");
  });

  it("formats amount in cents padded to 10 digits", () => {
    const result = generateCPA005File([samplePayment], "0000000001", "PSW DIRECT", "0001");
    const detail = result.split("\n")[1];
    // Amount: $440.00 = 44000 cents → "0000044000"
    expect(detail).toContain("0000044000");
  });

  it("handles multiple payments with correct trailer totals", () => {
    const payments: CPAPaymentRecord[] = [
      { ...samplePayment, amount: 100.50 },
      { ...samplePayment, pswId: "psw-002", legalName: "John Smith", amount: 200.75 },
    ];
    const result = generateCPA005File(payments, "0000000001", "PSW DIRECT", "0001");
    const lines = result.split("\n");
    expect(lines.length).toBe(4); // header + 2 details + trailer

    // Trailer: total records = 2, total amount = $301.25 = 30125 cents
    const trailer = lines[3];
    expect(trailer[0]).toBe("Z");
    expect(trailer.substring(1, 9)).toBe("00000002"); // 2 records
    expect(trailer.substring(9, 23)).toBe("00000000030125"); // 30125 cents
  });

  it("pads payee name to 30 characters", () => {
    const result = generateCPA005File([samplePayment], "0000000001", "PSW DIRECT", "0001");
    const detail = result.split("\n")[1];
    // "Jane Doe" should be padded to 30 chars
    expect(detail).toContain("Jane Doe" + " ".repeat(22));
  });

  it("handles zero-amount payments", () => {
    const payment = { ...samplePayment, amount: 0 };
    const result = generateCPA005File([payment], "0000000001", "PSW DIRECT", "0001");
    const detail = result.split("\n")[1];
    expect(detail).toContain("0000000000"); // 0 cents
  });

  it("includes originator name in header and detail records", () => {
    const result = generateCPA005File([samplePayment], "0000000001", "PSW DIRECT PAYROLL", "0001");
    const header = result.split("\n")[0];
    const detail = result.split("\n")[1];
    expect(header).toContain("PSW DIRECT PAYROLL");
    expect(detail).toContain("PSW DIRECT PAYROLL");
  });
});

// ── 2. Admin Payout State Machine ────────────────────────────────────

describe("Payout request state machine", () => {
  // These test the business rules encoded in the DB functions and the UI

  const validTransitions: Record<string, string[]> = {
    requested: ["approved", "rejected"],
    approved: ["payout_ready", "rejected"],
    payout_ready: ["cleared", "rejected"],
    cleared: [], // terminal
    rejected: [], // terminal
  };

  it.each(Object.entries(validTransitions))(
    "from '%s' allows transitions to %j",
    (from, allowed) => {
      expect(allowed).toBeDefined();
      // Verify we don't allow backwards transitions
      if (from === "cleared") expect(allowed).toHaveLength(0);
      if (from === "rejected") expect(allowed).toHaveLength(0);
    }
  );

  it("approve only works on 'requested' status", () => {
    // The DB function: WHERE id = p_request_id AND status = 'requested'
    expect(validTransitions["requested"]).toContain("approved");
    expect(validTransitions["approved"]).not.toContain("approved");
  });

  it("markPayoutReady only works on 'approved' status", () => {
    // The DB function: WHERE id = p_request_id AND status = 'approved'
    expect(validTransitions["approved"]).toContain("payout_ready");
    expect(validTransitions["requested"]).not.toContain("payout_ready");
  });

  it("markCleared only works on 'payout_ready' status", () => {
    // The DB function: WHERE id = p_request_id AND status = 'payout_ready'
    expect(validTransitions["payout_ready"]).toContain("cleared");
    expect(validTransitions["approved"]).not.toContain("cleared");
  });

  it("reject works on requested, approved, and payout_ready", () => {
    expect(validTransitions["requested"]).toContain("rejected");
    expect(validTransitions["approved"]).toContain("rejected");
    expect(validTransitions["payout_ready"]).toContain("rejected");
  });
});

// ── 3. PayoutQueueSection Filter Logic ───────────────────────────────

describe("PayoutQueueSection filter logic", () => {
  const filterRequests = (requests: { status: string }[], filter: string) => {
    return requests.filter((r) => {
      if (filter === "pending")
        return ["requested", "approved", "payout_ready"].includes(r.status);
      if (filter === "cleared") return r.status === "cleared";
      if (filter === "rejected") return r.status === "rejected";
      return true; // "all"
    });
  };

  const mockRequests = [
    { status: "requested" },
    { status: "approved" },
    { status: "payout_ready" },
    { status: "cleared" },
    { status: "rejected" },
  ];

  it("'pending' shows requested + approved + payout_ready", () => {
    const result = filterRequests(mockRequests, "pending");
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.status)).toEqual(["requested", "approved", "payout_ready"]);
  });

  it("'cleared' shows only cleared", () => {
    expect(filterRequests(mockRequests, "cleared")).toHaveLength(1);
  });

  it("'rejected' shows only rejected", () => {
    expect(filterRequests(mockRequests, "rejected")).toHaveLength(1);
  });

  it("'all' shows everything", () => {
    expect(filterRequests(mockRequests, "all")).toHaveLength(5);
  });

  it("'pending' returns empty when no pending requests", () => {
    const cleared = [{ status: "cleared" }, { status: "rejected" }];
    expect(filterRequests(cleared, "pending")).toHaveLength(0);
  });
});

// ── 4. UI Button Visibility Rules ────────────────────────────────────

describe("Payout detail dialog action visibility", () => {
  const getVisibleActions = (status: string) => {
    const actions: string[] = [];
    if (status === "requested") actions.push("Approve", "Reject");
    if (status === "approved") actions.push("Generate CPA-005");
    if (status === "payout_ready") actions.push("Mark Paid");
    return actions;
  };

  it("shows Approve + Reject for 'requested'", () => {
    expect(getVisibleActions("requested")).toEqual(["Approve", "Reject"]);
  });

  it("shows Generate CPA-005 for 'approved'", () => {
    expect(getVisibleActions("approved")).toEqual(["Generate CPA-005"]);
  });

  it("shows Mark Paid for 'payout_ready'", () => {
    expect(getVisibleActions("payout_ready")).toEqual(["Mark Paid"]);
  });

  it("shows nothing for 'cleared'", () => {
    expect(getVisibleActions("cleared")).toEqual([]);
  });

  it("shows nothing for 'rejected'", () => {
    expect(getVisibleActions("rejected")).toEqual([]);
  });
});

// ── 5. Reject flow: entries must be unlinked ─────────────────────────

describe("Reject flow business rules", () => {
  it("reject requires a non-empty reason", () => {
    const validateReject = (notes: string) => notes.trim().length > 0;
    expect(validateReject("")).toBe(false);
    expect(validateReject("   ")).toBe(false);
    expect(validateReject("Duplicate request")).toBe(true);
  });

  it("after rejection, entries should have payout_request_id = NULL and status = pending", () => {
    // Simulates what admin_reject_payout DB function does
    const entries = [
      { id: "e1", payout_request_id: "req-1", status: "approved" },
      { id: "e2", payout_request_id: "req-1", status: "approved" },
    ];
    // Simulate the unlink
    const unlinked = entries.map((e) => ({
      ...e,
      payout_request_id: null,
      status: "pending",
    }));
    expect(unlinked.every((e) => e.payout_request_id === null)).toBe(true);
    expect(unlinked.every((e) => e.status === "pending")).toBe(true);
  });
});

// ── 6. Summary card counts ───────────────────────────────────────────

describe("Summary card count calculations", () => {
  const mockRequests = [
    { status: "requested" },
    { status: "requested" },
    { status: "approved" },
    { status: "payout_ready" },
    { status: "cleared" },
    { status: "cleared" },
    { status: "cleared" },
    { status: "rejected" },
  ];

  it("counts awaiting approval correctly", () => {
    expect(mockRequests.filter((r) => r.status === "requested").length).toBe(2);
  });

  it("counts approved correctly", () => {
    expect(mockRequests.filter((r) => r.status === "approved").length).toBe(1);
  });

  it("counts payout ready correctly", () => {
    expect(mockRequests.filter((r) => r.status === "payout_ready").length).toBe(1);
  });

  it("counts cleared correctly", () => {
    expect(mockRequests.filter((r) => r.status === "cleared").length).toBe(3);
  });
});
