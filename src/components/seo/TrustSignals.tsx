import { ShieldCheck, Clock, FileX, Zap, MapPin, HeartPulse } from "lucide-react";

interface TrustSignalsProps {
  /** City label for content variation. Defaults to "Ontario". */
  city?: string;
  /** Service label for context (e.g. "Home Care", "Doctor Escort"). */
  service?: string;
}

const WHY_CHOOSE = [
  { icon: ShieldCheck, title: "Fully vetted PSWs", desc: "Every caregiver is credential-verified, police-checked, and reference-screened before joining the platform." },
  { icon: Clock, title: "Available 24/7 across Ontario", desc: "Day, night, weekend, or holiday — request care any time and a PSW will be matched." },
  { icon: FileX, title: "No contracts, book anytime", desc: "Pay by the hour with full flexibility. Scale care up or down — never locked in." },
  { icon: Zap, title: "Fast matching — under 2 minutes", desc: "Post a request and our system matches a nearby vetted PSW in minutes, not days." },
];

// Phrasing variants — chosen by hashed city seed to vary content across pages
const TRUSTED_INTRO_VARIANTS = [
  (loc: string) => `PSW Direct serves families in ${loc} and across more than 80 Ontario communities, from urban centres to small towns.`,
  (loc: string) => `Across ${loc} and the wider Ontario region, families rely on PSW Direct for fast, vetted in-home support.`,
  (loc: string) => `Whether you live in ${loc}, the GTA, or rural Ontario, PSW Direct connects you with trusted local caregivers on demand.`,
  (loc: string) => `From ${loc} to communities across Ontario, our network of vetted personal support workers is available where and when you need them.`,
];

const SCENARIO_VARIANTS = [
  "We support real-world scenarios every day — hospital discharge transitions, post-surgical recovery, dementia and elderly care at home, palliative support, and accompaniment to medical appointments.",
  "Common requests include hospital discharge support, overnight elderly care, dementia and Alzheimer's supervision, mobility assistance, and doctor escort transport.",
  "Families turn to us for hospital discharge care, daily personal support for aging parents, overnight supervision, and reliable medical transport.",
  "From safely bringing a loved one home from the hospital to ongoing elderly care and companionship, our PSWs handle the situations families face most.",
];

const INSURANCE_VARIANTS = [
  "Care can be paid privately or covered through Blue Cross, Veterans Affairs Canada (VAC), and other approved third-party insurers — we provide the documentation needed for reimbursement.",
  "We support insurance-funded care including Blue Cross and Veterans Affairs Canada (VAC) claims, with detailed invoices issued for every visit.",
  "PSW Direct accepts private pay and works with insurance providers such as Blue Cross and Veterans Affairs Canada (VAC) — we handle the paperwork so reimbursement is straightforward.",
  "Funding options include private pay, Blue Cross coverage, and Veterans Affairs Canada (VAC) — invoices are provided in the format insurers require.",
];

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const TrustSignals = ({ city, service }: TrustSignalsProps) => {
  const loc = city ?? "Ontario";
  const seed = hashStr(loc + (service ?? ""));
  const intro = TRUSTED_INTRO_VARIANTS[seed % TRUSTED_INTRO_VARIANTS.length](loc);
  const scenario = SCENARIO_VARIANTS[(seed + 1) % SCENARIO_VARIANTS.length];
  const insurance = INSURANCE_VARIANTS[(seed + 2) % INSURANCE_VARIANTS.length];

  return (
    <section
      className="px-4 py-12 border-t border-border bg-background"
      aria-label="Trust and authority signals"
    >
      <div className="max-w-5xl mx-auto">
        {/* Why Choose */}
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
          Why Choose PSW Direct
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          {WHY_CHOOSE.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border"
            >
              <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trusted Across Ontario */}
        <div className="bg-muted/40 rounded-xl p-6 md:p-8 border border-border">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Trusted Home Care Across Ontario
          </h2>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3">
            {intro}
          </p>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4 flex items-start gap-2">
            <HeartPulse className="w-4 h-4 text-primary shrink-0 mt-1" />
            <span>{scenario}</span>
          </p>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Insurance & funding:</strong> {insurance}
          </p>
        </div>
      </div>
    </section>
  );
};

export default TrustSignals;
