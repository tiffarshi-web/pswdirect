import { Link } from "react-router-dom";
import {
  DollarSign,
  Phone,
  AlertTriangle,
  Compass,
  Workflow,
  BadgeCheck,
  Home,
  Pill,
  Building,
} from "lucide-react";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";

interface Props {
  city: string;
  serviceLabel?: string;
}

/**
 * SEO Phase 6 — Local authority "extras" block.
 *
 * Purely additive. Renders below the existing LocalAuthorityContent sections
 * on every city / city+service SEO page. Contents are entirely factual and
 * verifiable at the provincial level — no fabricated local lists.
 *
 * Sections:
 *  1. Ontario home care funding overview (Ontario Health atHome, VAC, WSIB,
 *     private extended health, medical-expense tax credit).
 *  2. Trusted care process (platform-level, 5 steps).
 *  3. Finding verified local resources — links to the province's authoritative
 *     finders (Ontario.ca LTC Home Finder, ORCA retirement finder, Ontario
 *     College of Pharmacists register, Health Care Connect). This is the
 *     honest way to surface urgent-care / walk-in / retirement / LTC /
 *     pharmacy information without inventing per-city lists.
 *  4. Emergency contacts (911, Health Connect Ontario 811, Ontario Poison
 *     Centre) — universal Ontario numbers.
 *  5. Unique city-scoped call to action with the office phone number.
 */
const LocalAuthorityExtras = ({ city, serviceLabel }: Props) => {
  const service = serviceLabel ?? "Home Care";
  const serviceLower = service.toLowerCase();

  return (
    <>
      {/* Ontario home care funding */}
      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`Home care funding options in Ontario for ${city} families`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Paying for home care in {city}: Ontario funding options
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Home care in Ontario is paid for through a mix of public programs,
            private extended-health benefits, and out-of-pocket funds. The
            options below apply to every {city} family — PSW Direct is a
            private provider and is not affiliated with the government
            programs listed here.
          </p>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Ontario Health atHome</strong> (formerly Home and
                Community Care Support Services) coordinates publicly funded
                home care in Ontario. Care coordinators assess eligibility and
                allocate a set number of Personal Support Worker, nursing, and
                therapy hours based on need.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Health Care Connect</strong> helps Ontarians without a
                family doctor or nurse practitioner get matched with one — a
                common first step before requesting publicly funded home care.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Veterans Affairs Canada (VAC)</strong> funds in-home
                personal support for eligible veterans through the Veterans
                Independence Program (VIP). PSW Direct accepts approved VAC
                and Blue Cross authorizations.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>WSIB</strong> may cover attendant care after a
                workplace injury. Claim numbers and pre-authorization from the
                case manager are required before service begins.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Extended health benefits</strong> — Manulife, Sun
                Life, Green Shield, Canada Life, and similar group plans
                frequently reimburse a portion of private PSW hours. Coverage
                varies by plan; we provide detailed invoices to support
                reimbursement.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Medical Expense Tax Credit (METC)</strong> — attendant
                care paid to a private provider can be claimed on your annual
                Canadian tax return when the recipient qualifies for the
                Disability Tax Credit. Speak with a tax professional to
                confirm eligibility.
              </span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 opacity-70">
            Program names are used for informational purposes only. Eligibility
            and coverage decisions are made by the respective government or
            insurance body, not by PSW Direct.
          </p>
        </div>
      </section>

      {/* Trusted care process */}
      <section
        className="px-4 py-12 border-t border-border bg-muted/40"
        aria-label={`How to arrange ${serviceLower} in ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Workflow className="w-6 h-6 text-primary" />
            How {serviceLower} is arranged in {city}
          </h2>
          <ol className="space-y-4">
            {[
              {
                t: "Tell us what you need",
                b: `Book online in about two minutes or call our office. Share the address in ${city}, the type of support required, and preferred visit times. No long intake forms.`,
              },
              {
                t: "We match a vetted PSW near you",
                b: `PSW Direct dispatches from the closest available Personal Support Worker in the ${city} area. Every caregiver is verified with a valid PSW certificate, government-issued ID, and a recent police background check.`,
              },
              {
                t: "Care plan confirmed before the first visit",
                b: `You review the PSW's profile, the visit schedule, and the care tasks. Nothing is charged before the shift; hourly rates are quoted upfront with no agency markup.`,
              },
              {
                t: "PSW arrives and clocks in on site",
                b: `The PSW checks in using a geofenced sign-in at the ${city} address, follows the written care plan, and documents each visit in a digital care sheet you can review at any time.`,
              },
              {
                t: "Ongoing oversight and easy changes",
                b: `Message the PSW or our office through the platform. Cancel, reschedule, or add hours anytime up to 4 hours before the visit. Consistent caregivers are prioritised for recurring shifts.`,
              },
            ].map((s, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{s.t}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Finding verified local resources — provincial finders */}
      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`Finding verified local healthcare resources near ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Compass className="w-6 h-6 text-primary" />
            Finding verified retirement homes, long-term care, walk-in clinics, and pharmacies near {city}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            Rather than publishing lists of businesses we haven't independently
            verified, we point {city} families to the province's authoritative
            registries. Each of these is a public, non-affiliated source
            searchable by postal code or municipality:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <Home className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Long-term care homes</strong> — Ontario.ca's{" "}
                <a
                  href="https://www.ontario.ca/page/find-long-term-care-home"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  Find a Long-Term Care Home
                </a>{" "}
                registry lists every licensed LTC home in Ontario with
                inspection reports.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Building className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Retirement homes</strong> — the{" "}
                <a
                  href="https://www.rhra.ca/en/find-a-retirement-home/"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  Retirement Homes Regulatory Authority (RHRA)
                </a>{" "}
                register shows every licensed retirement residence in Ontario.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Pill className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Pharmacies</strong> — the{" "}
                <a
                  href="https://members.ocpinfo.com/pharmacyregister/"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  Ontario College of Pharmacists Pharmacy Register
                </a>{" "}
                lists every accredited pharmacy in the province.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Walk-in clinics, urgent care, and hospital sites</strong>{" "}
                — the province's{" "}
                <a
                  href="https://www.ontario.ca/page/health-care-options"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  Health Care Options
                </a>{" "}
                tool locates clinics, urgent care centres, and emergency
                departments by postal code.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Family doctor / nurse practitioner</strong> — enrol in{" "}
                <a
                  href="https://www.ontario.ca/page/find-family-doctor-or-nurse-practitioner"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  Health Care Connect
                </a>{" "}
                to be matched with a primary-care provider accepting new
                patients.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <BadgeCheck className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
              <span>
                <strong>Publicly funded home care</strong> —{" "}
                <a
                  href="https://ontariohealthathome.ca/"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-primary hover:underline"
                >
                  Ontario Health atHome
                </a>{" "}
                coordinates the province's publicly funded home care and
                community services.
              </span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4 opacity-70">
            External links open in a new tab. PSW Direct is not affiliated
            with, and does not endorse, the organisations listed above.
          </p>
        </div>
      </section>

      {/* Emergency contacts */}
      <section
        className="px-4 py-12 border-t border-border bg-muted/40"
        aria-label={`Emergency and after-hours health contacts for ${city}`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-primary" />
            Emergency and after-hours health contacts
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            PSW Direct provides scheduled non-clinical home care — we are not
            an emergency service. If you or a loved one in {city} is in
            immediate danger, always call 911 first.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-muted-foreground">
            <li className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">911</div>
                <div className="text-sm">
                  Medical, fire, or police emergency anywhere in Ontario.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">811 — Health Connect Ontario</div>
                <div className="text-sm">
                  24/7 registered-nurse advice line (formerly Telehealth
                  Ontario). Free and confidential.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">1-800-268-9017 — Ontario Poison Centre</div>
                <div className="text-sm">
                  24/7 poison-exposure advice for the public and healthcare
                  providers.
                </div>
              </div>
            </li>
            <li className="flex items-start gap-3 bg-card border border-border rounded-lg p-4">
              <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-foreground">
                  <a
                    href={BUSINESS_CONTACT.phoneTel}
                    className="hover:underline"
                  >
                    {BUSINESS_CONTACT.phone}
                  </a>{" "}
                  — PSW Direct office
                </div>
                <div className="text-sm">
                  Book, reschedule, or ask a scheduling question for {city}.
                  Same-day dispatch when caregivers are available.
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Unique city CTA */}
      <section
        className="px-4 py-14 border-t border-border bg-primary/5"
        aria-label={`Book ${serviceLower} in ${city}`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to arrange {serviceLower} in {city}?
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Talk to a real Ontario-based scheduler — no call centre, no
            contracts, no commitment. We'll confirm PSW availability in {city}{" "}
            and email a written care plan before any shift begins.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={BUSINESS_CONTACT.phoneTel}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition"
            >
              <Phone className="w-4 h-4" />
              Call {BUSINESS_CONTACT.phone}
            </a>
            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-card border border-border font-semibold px-6 py-3 rounded-lg hover:border-primary transition"
            >
              Book online for {city}
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4 opacity-70">
            Serving {city} and surrounding Ontario communities. Rates from
            $35/hr. No agency markup, no hidden fees.
          </p>
        </div>
      </section>
    </>
  );
};

export default LocalAuthorityExtras;
