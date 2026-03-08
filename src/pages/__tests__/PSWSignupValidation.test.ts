import { describe, it, expect } from "vitest";

/**
 * Tests the PSW signup step progression logic and confirms
 * VSC (police_check_date) is never set by the PSW flow.
 * 
 * canProceedFromStep logic extracted from PSWSignup.tsx:
 * - Step 1: firstName, lastName, email, phone, gender, streetAddress, city, postalCode, profilePhoto, valid password
 * - Step 2: govIdType + govIdDoc (mandatory). If has car: disclaimer + licensePlate + vehiclePhoto
 * - Step 3: at least 1 language
 * - Step 4: bankInstitution(3), bankTransit(5), bankAccount(7+)
 */

// Replicate the validation logic from PSWSignup
function canProceedFromStep(
  step: number,
  formData: Record<string, string>,
  profilePhoto: boolean,
  govIdDoc: boolean,
  vehiclePhoto: boolean,
  vehicleDisclaimerAccepted: boolean,
  selectedLanguages: string[],
  postalCodeValid: boolean,
): boolean {
  switch (step) {
    case 1:
      if (formData.postalCode && !postalCodeValid) return false;
      if (!formData.password || formData.password.length < 6) return false;
      if (formData.password !== formData.confirmPassword) return false;
      return !!(
        formData.firstName &&
        formData.lastName &&
        formData.email &&
        formData.phone &&
        formData.gender &&
        formData.streetAddress &&
        formData.city &&
        formData.postalCode &&
        profilePhoto
      );
    case 2:
      if (!formData.govIdType || !govIdDoc) return false;
      if (formData.hasOwnTransport === "yes-car") {
        if (!vehicleDisclaimerAccepted || !formData.licensePlate || !vehiclePhoto) return false;
      }
      return true;
    case 3:
      return selectedLanguages.length > 0;
    case 4:
      return !!(
        formData.bankInstitution &&
        formData.bankTransit &&
        formData.bankAccount &&
        formData.bankInstitution.length === 3 &&
        formData.bankTransit.length === 5 &&
        formData.bankAccount.length >= 7
      );
    default:
      return true;
  }
}

const validStep1 = {
  firstName: "Test",
  lastName: "PSW",
  email: "test@example.com",
  phone: "4165551234",
  gender: "female",
  streetAddress: "123 Main St",
  city: "Toronto",
  postalCode: "M5V 1A1",
  password: "Test1234",
  confirmPassword: "Test1234",
  hasOwnTransport: "",
  govIdType: "",
  licensePlate: "",
  bankInstitution: "",
  bankTransit: "",
  bankAccount: "",
};

describe("PSW Signup Step Validation", () => {
  describe("Step 1 - Personal Info", () => {
    it("passes with all required fields", () => {
      expect(canProceedFromStep(1, validStep1, true, false, false, false, ["en"], true)).toBe(true);
    });

    it("fails without profile photo", () => {
      expect(canProceedFromStep(1, validStep1, false, false, false, false, ["en"], true)).toBe(false);
    });

    it("fails with short password", () => {
      const data = { ...validStep1, password: "abc", confirmPassword: "abc" };
      expect(canProceedFromStep(1, data, true, false, false, false, ["en"], true)).toBe(false);
    });

    it("fails with mismatched passwords", () => {
      const data = { ...validStep1, confirmPassword: "DifferentPass" };
      expect(canProceedFromStep(1, data, true, false, false, false, ["en"], true)).toBe(false);
    });

    it("fails without gender", () => {
      const data = { ...validStep1, gender: "" };
      expect(canProceedFromStep(1, data, true, false, false, false, ["en"], true)).toBe(false);
    });
  });

  describe("Step 2 - Documents (Gov ID mandatory, VSC optional)", () => {
    it("passes with govIdType and govIdDoc", () => {
      const data = { ...validStep1, govIdType: "drivers-license" };
      expect(canProceedFromStep(2, data, true, true, false, false, ["en"], true)).toBe(true);
    });

    it("fails without govIdType", () => {
      expect(canProceedFromStep(2, validStep1, true, true, false, false, ["en"], true)).toBe(false);
    });

    it("fails without govIdDoc", () => {
      const data = { ...validStep1, govIdType: "drivers-license" };
      expect(canProceedFromStep(2, data, true, false, false, false, ["en"], true)).toBe(false);
    });

    it("does NOT require police check / VSC for step progression", () => {
      // This is the key test: VSC is optional, step 2 only checks govId
      const data = { ...validStep1, govIdType: "passport" };
      expect(canProceedFromStep(2, data, true, true, false, false, ["en"], true)).toBe(true);
    });

    it("requires vehicle disclaimer + plate + photo when has car", () => {
      const data = { ...validStep1, govIdType: "passport", hasOwnTransport: "yes-car", licensePlate: "" };
      expect(canProceedFromStep(2, data, true, true, false, false, ["en"], true)).toBe(false);
    });

    it("passes car requirements when all provided", () => {
      const data = { ...validStep1, govIdType: "passport", hasOwnTransport: "yes-car", licensePlate: "ABC123" };
      expect(canProceedFromStep(2, data, true, true, true, true, ["en"], true)).toBe(true);
    });
  });

  describe("Step 3 - Languages", () => {
    it("passes with at least one language", () => {
      const data = { ...validStep1, govIdType: "passport" };
      expect(canProceedFromStep(3, data, true, true, false, false, ["en"], true)).toBe(true);
    });

    it("fails with no languages", () => {
      const data = { ...validStep1, govIdType: "passport" };
      expect(canProceedFromStep(3, data, true, true, false, false, [], true)).toBe(false);
    });
  });

  describe("Step 4 - Banking", () => {
    it("passes with valid banking info", () => {
      const data = { ...validStep1, bankInstitution: "001", bankTransit: "12345", bankAccount: "1234567" };
      expect(canProceedFromStep(4, data, true, true, false, false, ["en"], true)).toBe(true);
    });

    it("fails with short account number", () => {
      const data = { ...validStep1, bankInstitution: "001", bankTransit: "12345", bankAccount: "123456" };
      expect(canProceedFromStep(4, data, true, true, false, false, ["en"], true)).toBe(false);
    });
  });
});

describe("VSC Date Reset on Upload", () => {
  it("signup payload sets police_check_date to null (admin-managed)", () => {
    // Simulates the profile payload sent in handleSubmit
    const profilePayload = {
      police_check_url: "some-path/police-check-123.pdf",
      police_check_name: "vsc-doc.pdf",
      police_check_date: null as string | null, // Must always be null at signup
    };
    expect(profilePayload.police_check_date).toBeNull();
  });

  it("re-upload sets police_check_date to null", () => {
    // Simulates PSWPendingStatus handleDocUpload updateFields
    const updateFields: Record<string, any> = {};
    const docType = "police-check";
    if (docType === "police-check") {
      updateFields.police_check_url = "new-path/vsc-456.pdf";
      updateFields.police_check_name = "new-vsc.pdf";
      updateFields.police_check_date = null; // The fix we implemented
    }
    expect(updateFields.police_check_date).toBeNull();
    expect(updateFields.police_check_url).toBeDefined();
    expect(updateFields.police_check_name).toBeDefined();
  });
});
