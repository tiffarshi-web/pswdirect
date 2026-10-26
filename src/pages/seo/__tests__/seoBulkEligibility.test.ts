import { describe, expect, it } from "vitest";
import { SEO_SUPPORTED_SERVICES, localServiceEligible, provinceSupportsSeo, type SeoProvinceEvidence } from "@/lib/seoSupportedServices";
import { isKnownPublicPath, isSitemapEligiblePath, isSupportedLocalLandingPath } from "@/lib/seoEligibilityManifest";
import { isPrivatePath } from "@/lib/seoIndexability";
import manifest from "@/generated/seoEligibilityManifest.json";
import { getCityProfile } from "@/lib/cityProfiles";
import { resolveLegacySeoPath } from "../legacyRedirects";

const on: SeoProvinceEvidence = { code: "ON", is_active: true, launch_status: "live", bookings_enabled: true, payments_enabled: true, recruitment_enabled: true };
const candidate = { province: on, service: "recovery-care", offeredServiceIds: ["standard"], hasLocalContent: true, hasNearbyInventory: true, canonical: true };

describe("evidence-backed bulk SEO eligibility", () => {
  it("allows supported local non-clinical recovery care", () => expect(localServiceEligible(candidate)).toBe(true));
  it("fails closed without province evidence", () => expect(localServiceEligible({ ...candidate, province: undefined })).toBe(false));
  it("keeps Alberta preparation off even with an active pricing row and inventory", () => {
    const ab = { ...on, code: "AB", launch_status: "preparation", bookings_enabled: false, payments_enabled: false, recruitment_enabled: false };
    expect(localServiceEligible({ ...candidate, province: ab })).toBe(false);
    expect(provinceSupportsSeo(ab, "recruitment")).toBe(false);
  });
  it("requires recruitment to actually be open", () => expect(provinceSupportsSeo({ ...on, recruitment_enabled: false }, "recruitment")).toBe(false));
  it("requires bookings and payments to be enabled", () => {
    expect(localServiceEligible({ ...candidate, province: { ...on, bookings_enabled: false } })).toBe(false);
    expect(localServiceEligible({ ...candidate, province: { ...on, payments_enabled: false } })).toBe(false);
  });
  it("requires an active offered service", () => expect(localServiceEligible({ ...candidate, offeredServiceIds: [] })).toBe(false));
  it("does not manufacture local substance from a route name", () => expect(localServiceEligible({ ...candidate, hasLocalContent: false })).toBe(false));
  it("requires nearby directory evidence", () => expect(localServiceEligible({ ...candidate, hasNearbyInventory: false })).toBe(false));
  it("refuses duplicate aliases", () => expect(localServiceEligible({ ...candidate, canonical: false })).toBe(false));
  it.each(["live-in-care", "24-hour-home-care", "emergency-home-care", "diabetes-care", "copd-home-care", "home-health-care"])("does not assume %s is offered", service => {
    expect(localServiceEligible({ ...candidate, service })).toBe(false);
  });
  it.each(["companion-care", "personal-care-assistance", "mobility-assistance", "light-housekeeping-services", "recovery-care", "memory-care", "family-caregiver-relief", "medication-reminder-services", "doctor-escort", "hospital-discharge"])("indexes supported %s in Barrie", service => {
    expect(isSupportedLocalLandingPath(`/${service}-barrie`)).toBe(true);
    expect(isSitemapEligiblePath(`/${service}-barrie`)).toBe(true);
  });
  it("each expanded URL has all required evidence and one canonical", () => {
    expect(manifest.localLandingPages.length).toBeGreaterThan(0);
    for (const page of manifest.localLandingPages) {
      expect(manifest.activeCityKeys).toContain(page.cityKey);
      expect(getCityProfile(page.city).region).toBeTruthy();
      expect(getCityProfile(page.city).county).toBeTruthy();
      expect(manifest.offeredServiceIds).toContain(SEO_SUPPORTED_SERVICES[page.service].serviceId);
      expect(page.path).toBe(`/${page.service}-${page.cityKey}`);
      expect(isKnownPublicPath(page.path)).toBe(true);
      expect(resolveLegacySeoPath(page.path)).toBeNull();
    }
  });
  it.each(["/psw/profile/test", "/psw", "/psw/jobs/test", "/client", "/admin", "/office-login", "/client-login", "/psw-login", "/join-team", "/track", "/order-confirmed", "/pay/test", "/verify/psw/test", "/install", "/.lovable/oauth/consent"])("excludes private %s", path => {
    expect(isPrivatePath(path)).toBe(true);
    expect(isSitemapEligiblePath(path)).toBe(false);
  });
  it.each(["/psw-ottawa-personal-care", "/tamil-caregiver-owen-sound", "/spanish-psw-brampton", "/private-home-care-services", "/psw-jobs-geralton", "/home-care-calgary", "/psw-jobs-calgary", "/recovery-care-westney-heights", "/live-in-care-barrie", "/24-hour-home-care-bracebridge", "/urdu-overnight-care-lasalle", "/private-psw-jobs", "/caregiver-barrie", "/home-care-in-barrie", "/search", "/filter", "/test"])("excludes alias, thin or unsupported %s", path => {
    expect(isSitemapEligiblePath(path)).toBe(false);
  });
});