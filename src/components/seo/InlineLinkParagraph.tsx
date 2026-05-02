import { Link } from "react-router-dom";
import { getNearbyCities, cityToSlug } from "@/lib/seoCityData";

interface InlineLinkParagraphProps {
  city: string;
  service?: string;
}

const SERVICE_ANCHORS = [
  { to: "/home-care-services", variants: ["home care services", "in-home care", "personal home care"] },
  { to: "/doctor-escort-service", variants: ["doctor escort service", "medical appointment escort"] },
  { to: "/hospital-discharge-care", variants: ["hospital discharge care", "post-discharge support"] },
  { to: "/overnight-home-care", variants: ["overnight home care", "nighttime caregiver support"] },
  { to: "/private-home-care", variants: ["private home care", "private-pay caregiver"] },
  { to: "/senior-home-care", variants: ["senior home care", "elderly home care"] },
];

const NEAR_ME_ANCHORS = [
  { to: "/psw-near-me", variants: ["a PSW near you", "personal support worker near you"] },
  { to: "/home-care-near-me", variants: ["home care near you", "nearby home care"] },
  { to: "/caregiver-near-me", variants: ["a caregiver near you", "nearby caregiver"] },
];

const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const pick = <T,>(arr: T[], seed: number): T => arr[seed % arr.length];

/**
 * Lightweight inline-link block. Caps total links at 6 to avoid
 * over-linking, recursive renders, and redundancy with other SEO sections.
 */
const InlineLinkParagraph = ({ city, service }: InlineLinkParagraphProps) => {
  const seed = hashStr(city + (service ?? ""));

  // 2 services + 1 near-me + 1 nearby city + 1 hub link + 1 guide = 6 links total
  const offset = seed % SERVICE_ANCHORS.length;
  const svc1 = SERVICE_ANCHORS[offset];
  const svc2 = SERVICE_ANCHORS[(offset + 2) % SERVICE_ANCHORS.length];
  const near = NEAR_ME_ANCHORS[seed % NEAR_ME_ANCHORS.length];

  const nearbyCity = getNearbyCities(city)[0];

  const linkClass = "text-primary hover:underline font-medium";

  return (
    <section className="px-4 py-10 border-t border-border bg-background" aria-label="Related home care information">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
          More Ways We Help Families in {city}
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Whether you need{" "}
          <Link to={near.to} className={linkClass}>{pick(near.variants, seed)}</Link>{" "}
          in {city}, ongoing{" "}
          <Link to={svc1.to} className={linkClass}>{pick(svc1.variants, seed)}</Link>, or short-term{" "}
          <Link to={svc2.to} className={linkClass}>{pick(svc2.variants, seed + 1)}</Link>, PSW Direct
          can match a vetted caregiver quickly.{" "}
          {nearbyCity && (
            <>
              We also serve nearby{" "}
              <Link to={`/home-care-${cityToSlug(nearbyCity)}`} className={linkClass}>
                home care in {nearbyCity}
              </Link>
              .{" "}
            </>
          )}
          Browse our{" "}
          <Link to="/cities" className={linkClass}>full coverage map</Link>{" "}
          or read our{" "}
          <Link to="/guides/how-to-hire-a-personal-support-worker" className={linkClass}>
            guide to hiring a PSW
          </Link>{" "}
          before booking care in {city}.
        </p>
      </div>
    </section>
  );
};

export default InlineLinkParagraph;
