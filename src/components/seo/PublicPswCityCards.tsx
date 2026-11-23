import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoCallCta from "@/components/seo/SeoCallCta";
import { getPublicPSWsByCity, type NearbyPSW } from "@/lib/nearbyPSWs";

/**
 * Card grid for consent-filtered caregivers: photo (only with photo consent),
 * first name only, languages and service area. No links to individual profiles.
 */
export const PublicPswCardGrid = ({ psws, city, max }: { psws: NearbyPSW[]; city: string; max?: number }) => (
  <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="public-psw-cards">
    {psws.slice(0, max ?? psws.length).map((p, i) => (
      <li key={`${p.first_name}-${i}`} className="rounded-lg border border-border bg-card p-4 flex gap-3">
        {p.profile_photo_url ? (
          <img src={p.profile_photo_url} alt={`Photo of ${p.first_name}, PSW`} className="h-14 w-14 rounded-full object-cover flex-shrink-0" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <span aria-hidden className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-lg font-semibold flex-shrink-0">{p.first_name.charAt(0)}</span>
        )}
        <div className="min-w-0">
          <p className="font-semibold">{p.first_name}</p>
          <p className="text-sm text-muted-foreground">Serves {p.home_city || city}</p>
          {p.languages && p.languages.length > 0 && <p className="text-sm text-muted-foreground">Speaks {p.languages.join(", ")}</p>}
          {p.public_summary && <p className="text-sm text-muted-foreground mt-1">{p.public_summary}</p>}
        </div>
      </li>
    ))}
  </ul>
);

/**
 * City caregiver section. Cards render ONLY from get_public_psws_by_city
 * (approved, active, current police check, not revoked by the office). With no opted-in
 * caregivers it shows truthful generic copy: no names, photos or counts.
 * Content is client-rendered and never placed in page metadata.
 */
const PublicPswCityCards = ({ city }: { city: string }) => {
  const [psws, setPsws] = useState<NearbyPSW[] | null>(null);
  useEffect(() => {
    let live = true;
    getPublicPSWsByCity(city).then(r => { if (live) setPsws(r); }).catch(() => { if (live) setPsws([]); });
    return () => { live = false; };
  }, [city]);

  const cards = psws ?? [];
  return (
    <section className="max-w-4xl mx-auto px-4 pb-10" aria-labelledby="psw-city-heading">
      <h2 id="psw-city-heading" className="text-2xl font-semibold mb-3">
        {cards.length > 0 ? `PSWs serving ${city}` : `PSW support in ${city}`}
      </h2>
      {cards.length > 0 ? (
        <>
          <p className="text-muted-foreground mb-4">These approved caregivers serve this area. Showing a profile here does not mean they are free for your dates; a visit is confirmed only when a suitable caregiver accepts your request.</p>
          <PublicPswCardGrid psws={cards} city={city} />
        </>
      ) : (
        <div data-testid="public-psw-generic">
          <p className="text-muted-foreground">Request a PSW in {city} by entering the care address, preferred date and hours.</p>
          <p className="text-muted-foreground mt-3">Coverage for your address, timing and a suitable caregiver are confirmed only after a caregiver accepts. You see your caregiver's first name in your account once they accept.</p>
        </div>
      )}
      <div className="flex flex-wrap gap-3 mt-5"><Button asChild><Link to="/">Request a PSW in {city}</Link></Button><SeoCallCta /></div>
    </section>
  );
};

export default PublicPswCityCards;
