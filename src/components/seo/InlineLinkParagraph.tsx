import { Link } from "react-router-dom";
import { getNearbyCities, cityToSlug } from "@/lib/seoCityData";

interface InlineLinkParagraphProps {
  city: string;
  service?: string;
}

const SERVICE_ANCHORS = [
  { to: "/home-care-services", variants: ["home care services", "in-home care", "personal home care"] },
  { to: "/doctor-escort-service", variants: ["doctor escort service", "medical appointment escort", "doctor visit transport"] },
  { to: "/hospital-discharge-care", variants: ["hospital discharge care", "post-discharge support", "after-hospital care"] },
  { to: "/overnight-home-care", variants: ["overnight home care", "nighttime caregiver support", "overnight PSW care"] },
  { to: "/24-hour-home-care", variants: ["24-hour home care", "round-the-clock care", "continuous in-home support"] },
  { to: "/private-home-care", variants: ["private home care", "private-pay caregiver", "private PSW services"] },
  { to: "/senior-home-care", variants: ["senior home care", "elderly home care", "care for aging parents"] },
  { to: "/in-home-care-services", variants: ["in-home care services", "at-home care", "home-based care"] },
  { to: "/companionship-for-seniors", variants: ["senior companionship", "companion care", "companionship visits"] },
];

const NEAR_ME_ANCHORS = [
  { to: "/psw-near-me", variants: ["a PSW near you", "personal support worker near you", "local PSW"] },
  { to: "/home-care-near-me", variants: ["home care near you", "nearby home care", "local home care"] },
  { to: "/caregiver-near-me", variants: ["a caregiver near you", "nearby caregiver", "a local caregiver"] },
  { to: "/senior-care-near-me", variants: ["senior care near you", "nearby senior care", "local senior care"] },
];

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const pick = <T,>(arr: T[], seed: number): T => arr[seed % arr.length];

const InlineLinkParagraph = ({ city, service }: InlineLinkParagraphProps) => {
  const seed = hashStr(city + (service ?? ""));

  // Choose 3 distinct services
  const offset = seed % SERVICE_ANCHORS.length;
  const svc1 = SERVICE_ANCHORS[offset];
  const svc2 = SERVICE_ANCHORS[(offset + 2) % SERVICE_ANCHORS.length];
  const svc3 = SERVICE_ANCHORS[(offset + 5) % SERVICE_ANCHORS.length];

  const near1 = NEAR_ME_ANCHORS[seed % NEAR_ME_ANCHORS.length];
  const near2 = NEAR_ME_ANCHORS[(seed + 1) % NEAR_ME_ANCHORS.length];

  const nearby = getNearbyCities(city).slice(0, 3);
  const cityLinks = nearby.map((n) => ({ label: n, to: `/home-care-${cityToSlug(n)}` }));

  const linkClass = "text-primary hover:underline font-medium";

  return (
    <section className="px-4 py-10 border-t border-border bg-background" aria-label="Related home care information">
      <div className="max-w-3xl mx-auto prose prose-sm md:prose-base text-foreground">
        <h2 className="text-xl md:text-2xl font-bold mb-4">More Ways We Help Families in {city}</h2>

        <p className="text-muted-foreground leading-relaxed mb-4">
          Whether you're searching for{" "}
          <Link to={near1.to} className={linkClass}>{pick(near1.variants, seed)}</Link>{" "}
          in {city} or comparing options like{" "}
          <Link to={svc1.to} className={linkClass}>{pick(svc1.variants, seed)}</Link>,{" "}
          <Link to={svc2.to} className={linkClass}>{pick(svc2.variants, seed + 1)}</Link>, and{" "}
          <Link to={svc3.to} className={linkClass}>{pick(svc3.variants, seed + 2)}</Link>, PSW Direct
          makes booking simple. Many families in {city} also explore{" "}
          <Link to="/psw-cost" className={linkClass}>PSW pricing in Ontario</Link>{" "}
          and{" "}
          <Link to="/cost-of-home-care-ontario" className={linkClass}>the typical cost of home care</Link>{" "}
          before booking.
        </p>

        <p className="text-muted-foreground leading-relaxed mb-4">
          Our caregivers in {city} support everything from{" "}
          <Link to="/elderly-care-at-home" className={linkClass}>elderly care at home</Link>{" "}
          and{" "}
          <Link to="/post-hospital-care" className={linkClass}>post-hospital recovery</Link>{" "}
          to{" "}
          <Link to="/same-day-home-care" className={linkClass}>same-day home care</Link>{" "}
          requests. If you live nearby, you can also book{" "}
          <Link to={near2.to} className={linkClass}>{pick(near2.variants, seed + 3)}</Link>.
        </p>

        {cityLinks.length > 0 && (
          <p className="text-muted-foreground leading-relaxed mb-4">
            We also serve neighbouring communities including{" "}
            {cityLinks.map((c, i) => (
              <span key={c.to}>
                <Link to={c.to} className={linkClass}>home care in {c.label}</Link>
                {i < cityLinks.length - 1 ? (i === cityLinks.length - 2 ? ", and " : ", ") : ""}
              </span>
            ))}
            . Browse our{" "}
            <Link to="/cities" className={linkClass}>full coverage map</Link>{" "}
            or our{" "}
            <Link to="/psw-directory" className={linkClass}>PSW directory</Link>{" "}
            to learn more.
          </p>
        )}

        <p className="text-muted-foreground leading-relaxed">
          Questions about insurance, scheduling, or what a PSW does day-to-day? Read our{" "}
          <Link to="/guides/how-to-hire-a-personal-support-worker" className={linkClass}>guide to hiring a PSW</Link>,
          our{" "}
          <Link to="/guides/hospital-discharge-checklist" className={linkClass}>hospital discharge checklist</Link>,
          or compare a{" "}
          <Link to="/guides/psw-vs-nurse-difference" className={linkClass}>PSW vs. a nurse</Link>{" "}
          before booking care in {city}.
        </p>
      </div>
    </section>
  );
};

export default InlineLinkParagraph;
