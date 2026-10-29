import { describe, expect, it } from "vitest";
import { SEO_SUPPORTED_SERVICES, localServiceEligible, provinceSupportsSeo, type SeoProvinceEvidence } from "@/lib/seoSupportedServices";
import { isKnownPublicPath, isSitemapEligiblePath, isSupportedLocalLandingPath } from "@/lib/seoEligibilityManifest";
import { isPrivatePath } from "@/lib/seoIndexability";
import manifest from "@/generated/seoEligibilityManifest.json";
import { getCityProfile } from "@/lib/cityProfiles";
import { resolveLegacySeoPath } from "../legacyRedirects";
import { buildMainSitemapUrls, supportedLocalPages, supportedLanguageCarePages, type InventorySnapshot } from "../../../../scripts/generate-sitemap";

const on: SeoProvinceEvidence = { code: "ON", is_active: true, launch_status: "live", bookings_enabled: true, payments_enabled: true, recruitment_enabled: true };
const candidate = { province: on, service: "recovery-care", offeredServiceIds: ["standard"], hasLocalContent: true, hasNearbyInventory: true, canonical: true };
const snapshot: InventorySnapshot = {
  provinces: [on], offeredServiceIds: ["standard", "doctor-appointment", "hospital-discharge"],
  radiusKm: 75, complete: true, failedCities: [], activeCityKeys: new Set(["barrie"]),
  eligibleLanguageCitySlugs: new Set(["english-speaking-psw-barrie"]),
};

describe("evidence-backed bulk SEO eligibility", () => {
  it("the actual generator admits eighteen distinct reviewed topics for covered Barrie", async () => {
    const local = supportedLocalPages(snapshot);
    expect(local).toHaveLength(18);
    const { paths } = await buildMainSitemapUrls(snapshot);
    expect(paths).toContain("/recovery-care-barrie");
    expect(paths).toContain("/doctor-escort-barrie");
    expect(paths).toContain("/hospital-discharge-barrie");
    expect(paths).not.toContain("/recovery-care-toronto");
    expect(paths).not.toContain("/companion-services-barrie");
  });
  it.each(["bathing-assistance", "dressing-assistance", "toileting-assistance", "aging-in-place", "post-surgery-care", "hip-replacement-recovery", "knee-replacement-recovery", "stroke-recovery-care"])("admits task-bounded %s only in locally supported communities", service => {
    expect(supportedLocalPages(snapshot).map(p => p.path)).toContain(`/${service}-barrie`);
    expect(supportedLocalPages({ ...snapshot, activeCityKeys: new Set() }).map(p => p.path)).not.toContain(`/${service}-barrie`);
    expect(supportedLocalPages({ ...snapshot, offeredServiceIds: [] }).map(p => p.path)).not.toContain(`/${service}-barrie`);
  });
  it("admits only task-specific language care with matching local language inventory", async () => {
    const { paths } = await buildMainSitemapUrls(snapshot);
    expect(supportedLanguageCarePages(snapshot).map(p => p.path)).toEqual(["/english-personal-care-barrie", "/english-companionship-barrie"]);
    expect(paths).toContain("/english-personal-care-barrie");
    expect(paths).toContain("/english-companionship-barrie");
    for (const path of ["/hindi-companionship-barrie", "/english-home-care-barrie", "/english-dementia-care-barrie", "/english-overnight-care-barrie", "/english-caregiver-barrie"]) expect(paths).not.toContain(path);
  });
  it("language care cannot open without any of its independent evidence gates", () => {
    for (const changes of [{ provinces: [] }, { offeredServiceIds: [] }, { activeCityKeys: new Set<string>() }, { eligibleLanguageCitySlugs: new Set<string>() }, { provinces: [{ ...on, payments_enabled: false }] }]) {
      expect(supportedLanguageCarePages({ ...snapshot, ...changes })).toEqual([]);
    }
  });
  it("language care does not infer local content from language inventory", () => {
    expect(supportedLanguageCarePages({ ...snapshot, activeCityKeys: new Set(["westney-heights"]), eligibleLanguageCitySlugs: new Set(["english-speaking-psw-westney-heights"]) })).toEqual([]);
  });
  it("every generated language care page has a supported topic and eligible discovery parent", () => {
    expect(manifest.languageCarePages.length).toBeGreaterThan(0);
    for (const page of manifest.languageCarePages) {
      expect(manifest.sitemapPaths).toContain(page.path);
      expect(manifest.sitemapPaths).toContain(page.languageCityPath);
      expect(manifest.activeCityKeys).toContain(page.cityKey);
      expect(manifest.offeredServiceIds).toContain(SEO_SUPPORTED_SERVICES[page.service].serviceId);
      expect(getCityProfile(page.city).region).toBeTruthy();
      expect(resolveLegacySeoPath(page.path)).toBeNull();
    }
  });
  it("the actual generator removes jobs when recruitment closes without removing supported care", async () => {
    const { paths } = await buildMainSitemapUrls({ ...snapshot, provinces: [{ ...on, recruitment_enabled: false }] });
    expect(paths).not.toContain("/psw-jobs-barrie");
    expect(paths).toContain("/recovery-care-barrie");
  });
  it("the respite hub requires live Ontario home-care service evidence", async () => {
    expect((await buildMainSitemapUrls(snapshot)).paths).toContain("/respite-care-ontario");
    for (const changes of [{ offeredServiceIds: [] }, { provinces: [] }, { provinces: [{ ...on, bookings_enabled: false }] }, { provinces: [{ ...on, payments_enabled: false }] }]) {
      expect((await buildMainSitemapUrls({ ...snapshot, ...changes })).paths).not.toContain("/respite-care-ontario");
    }
  });
  it("the actual generator fails closed for missing launch evidence despite retained inventory", async () => {
    const { paths } = await buildMainSitemapUrls({ ...snapshot, provinces: [] });
    expect(paths).not.toContain("/psw-jobs-barrie");
    expect(paths).not.toContain("/english-speaking-psw-barrie");
    expect(supportedLocalPages({ ...snapshot, provinces: [] })).toEqual([]);
    expect(paths).toContain("/guides/hospital-discharge-checklist");
  });
  it("the actual generator cannot use preparation Alberta as evidence for Ontario pages", async () => {
    const ab = { ...on, code: "AB", launch_status: "preparation", bookings_enabled: false, payments_enabled: false, recruitment_enabled: false };
    const { paths } = await buildMainSitemapUrls({ ...snapshot, provinces: [ab] });
    expect(paths).not.toContain("/recovery-care-barrie");
    expect(paths).not.toContain("/psw-jobs-barrie");
    expect(paths).not.toContain("/home-care-calgary");
  });
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