import { Link } from "react-router-dom";
import { Layers } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { SITE_URL } from "@/lib/seoUtils";

/**
 * SEO Phase 8 — Semantic content expansion.
 *
 * Renders naturally written paragraphs that surface semantically related
 * concepts for each service (Home Care → personal support, companionship,
 * meal prep, dementia, respite, palliative, hospital discharge, overnight,
 * 24-hour, etc.). Adds a Service JSON-LD block with `serviceType` +
 * `hasOfferCatalog` so search engines can see the topical coverage.
 *
 * Purely additive; existing metadata, canonical, and schema are preserved.
 */

interface Props {
  city?: string;
  service?: string;
  serviceLabel?: string;
  canonicalUrl?: string;
}

interface SemanticCluster {
  /** Section heading */
  heading: string;
  /** Short intro paragraph */
  intro: string;
  /** Related concept → short natural description */
  concepts: { term: string; desc: string; href?: string }[];
  /** Closing paragraph that ties everything back to the service */
  closing: string;
  /** Terms for schema.org offerCatalog */
  offerCatalog: string[];
}

const HOME_CARE: SemanticCluster = {
  heading: "What home care covers in practice",
  intro:
    "Home care is an umbrella term. In daily practice it blends personal support with the smaller, quieter tasks that keep someone safe and comfortable at home. Every plan is shaped around the person — some clients need a two-hour morning visit, others need continuous overnight or 24-hour presence.",
  concepts: [
    { term: "Personal support", desc: "bathing, toileting, dressing, transfers and grooming carried out by a certified PSW.", href: "/personal-support-worker" },
    { term: "Companionship", desc: "conversation, walks, hobbies and cognitive engagement to reduce isolation.", href: "/companion-care" },
    { term: "Meal preparation", desc: "planning, cooking and portioning food that respects dietary needs and cultural preferences." },
    { term: "Light housekeeping", desc: "laundry, tidying, dishes and general upkeep so the home stays a safe environment." },
    { term: "Mobility assistance", desc: "safe transfers, walker and wheelchair support, and fall-prevention routines." },
    { term: "Dementia support", desc: "structured routines, redirection and calm cues for people living with cognitive change.", href: "/services/dementia-care" },
    { term: "Alzheimer's care", desc: "familiar-face continuity, memory prompts and dignified assistance through progression." },
    { term: "Respite", desc: "planned relief for family caregivers, from a few hours to full weekends.", href: "/services/respite-care" },
    { term: "Senior care", desc: "age-appropriate support for older adults aging in place, including medication reminders and safety checks." },
    { term: "Palliative care", desc: "gentle, comfort-focused support for people with life-limiting illness, coordinated with palliative teams." },
    { term: "Hospital discharge", desc: "same-day and next-day support after an ER visit, surgery or inpatient stay.", href: "/services/hospital-discharge" },
    { term: "Doctor escort", desc: "accompaniment to appointments, including note-taking and communication back to family." },
    { term: "Overnight care", desc: "an awake PSW through the night for wandering, incontinence or medication timing.", href: "/services/overnight-care" },
    { term: "24-hour care", desc: "continuous coverage using rotating PSWs when someone cannot safely be left alone." },
  ],
  closing:
    "Because these needs overlap, PSW Direct treats them as one service — home care — and matches a PSW whose training and experience already cover the specific combination a family needs.",
  offerCatalog: [
    "Personal support",
    "Companion care",
    "Meal preparation",
    "Light housekeeping",
    "Mobility assistance",
    "Dementia support",
    "Alzheimer's care",
    "Respite care",
    "Senior care",
    "Palliative care",
    "Hospital discharge support",
    "Doctor escort",
    "Overnight care",
    "24-hour care",
  ],
};

const POST_SURGERY: SemanticCluster = {
  heading: "What post-surgery recovery care looks like at home",
  intro:
    "Recovery is rarely a single task. After hip or knee replacement, cardiac procedures, abdominal surgery or day-surgery discharge, families juggle mobility, medication timing, incision safety and simple household routines all at once.",
  concepts: [
    { term: "Hospital discharge", desc: "coordinated pickup and settling-in on the day the hospital sends the patient home." },
    { term: "Mobility assistance", desc: "safe transfers to bed, chair and toilet, plus supervised walker use." },
    { term: "Medication reminders", desc: "prompts on schedule so post-op prescriptions aren't missed or doubled." },
    { term: "Personal support", desc: "bathing around dressings, gentle grooming and dignified toileting." },
    { term: "Meal preparation", desc: "soft, nutrient-dense meals that respect post-op restrictions." },
    { term: "Fall prevention", desc: "removing hazards, adding lighting cues and staying within arm's reach on transfers." },
    { term: "Companionship", desc: "presence and reassurance while pain and fatigue peak in the first 72 hours." },
    { term: "Rehabilitation", desc: "reinforcement of physiotherapy exercises between formal PT visits." },
  ],
  closing:
    "PSWs supporting post-surgery clients typically layer several of these tasks in a single shift, which is why we scope visits by need rather than by strict category.",
  offerCatalog: [
    "Hospital discharge support",
    "Mobility assistance",
    "Medication reminders",
    "Personal support",
    "Meal preparation",
    "Fall prevention",
    "Companion care",
    "Rehabilitation support",
  ],
};

const DEMENTIA: SemanticCluster = {
  heading: "How dementia and Alzheimer's care work at home",
  intro:
    "Dementia care is less about tasks and more about pattern — the same face, the same voice, the same routine, day after day. That continuity is what lets someone with cognitive change stay in a familiar home for longer.",
  concepts: [
    { term: "Alzheimer's care", desc: "recognizing progression stages and adjusting support without disrupting routine." },
    { term: "Companionship", desc: "structured conversation, music and reminiscence to keep the brain engaged." },
    { term: "Personal support", desc: "dignified assistance with bathing, dressing and toileting, paced to the person." },
    { term: "Medication reminders", desc: "prompts and observation for prescribed medications and PRN doses." },
    { term: "Fall prevention", desc: "environmental checks and close-proximity support during transitions." },
    { term: "Wandering supervision", desc: "awake overnight coverage or 24-hour presence when safety demands it." },
    { term: "Respite", desc: "planned relief for family caregivers, who carry most of the load between visits." },
    { term: "Palliative care", desc: "comfort-focused continuity through the later stages of dementia." },
  ],
  closing:
    "The same PSW returning shift after shift is often more valuable than any single task on this list — which is why we prioritize PSW continuity for dementia clients.",
  offerCatalog: [
    "Alzheimer's care",
    "Companion care",
    "Personal support",
    "Medication reminders",
    "Fall prevention",
    "Overnight supervision",
    "Respite care",
    "Palliative care",
  ],
};

const RESPITE: SemanticCluster = {
  heading: "How respite care fits into a family's routine",
  intro:
    "Respite is care for the caregiver. A family member holding everything together still needs sleep, appointments, groceries and a break — and the person they support still needs safe, familiar coverage while they step away.",
  concepts: [
    { term: "Companionship", desc: "conversation and engagement so the client isn't left alone." },
    { term: "Personal support", desc: "continuation of bathing, toileting and grooming routines." },
    { term: "Meal preparation", desc: "keeping a familiar meal schedule while the family caregiver is out." },
    { term: "Medication reminders", desc: "on-time prompts so a break doesn't disrupt the medication plan." },
    { term: "Dementia support", desc: "familiar cues and structured routine for clients living with cognitive change." },
    { term: "Overnight care", desc: "an awake PSW so the primary caregiver can sleep through the night." },
    { term: "24-hour care", desc: "continuous coverage across weekends or vacations." },
  ],
  closing:
    "Respite bookings can be one-off, weekly, or block bookings around a caregiver's own health appointments and travel.",
  offerCatalog: [
    "Companion care",
    "Personal support",
    "Meal preparation",
    "Medication reminders",
    "Dementia support",
    "Overnight care",
    "24-hour care",
  ],
};

const OVERNIGHT: SemanticCluster = {
  heading: "How overnight and 24-hour home care work",
  intro:
    "Overnight care isn't sleeping in the guest room. An overnight PSW is awake, positioned nearby, and available for toileting, repositioning, medication timing and any wandering or confusion that comes up between dusk and dawn.",
  concepts: [
    { term: "Awake overnight care", desc: "the PSW stays awake for the duration of the shift." },
    { term: "24-hour care", desc: "rotating PSWs across a 24-hour window when someone cannot be left alone." },
    { term: "Dementia support", desc: "calm reorientation for sundowning and nighttime confusion." },
    { term: "Fall prevention", desc: "supervised bathroom trips and safe transfers during the night." },
    { term: "Medication reminders", desc: "night-time doses given on schedule." },
    { term: "Personal support", desc: "incontinence care and dignified assistance through the night." },
    { term: "Palliative care", desc: "continuous comfort presence in the final stages of illness." },
  ],
  closing:
    "Families most often move to overnight or 24-hour coverage after a fall, a hospital discharge, or a shift in dementia progression.",
  offerCatalog: [
    "Overnight care",
    "24-hour care",
    "Dementia support",
    "Fall prevention",
    "Medication reminders",
    "Personal support",
    "Palliative care",
  ],
};

const HOSPITAL_DISCHARGE: SemanticCluster = {
  heading: "What hospital discharge support includes",
  intro:
    "The 48 hours after discharge is when most re-admissions start. A PSW in the home during that window closes the gap between hospital care and family care.",
  concepts: [
    { term: "Same-day pickup", desc: "coordination with the discharge planner and transport home." },
    { term: "Personal support", desc: "help with the first shower or transfer after surgery." },
    { term: "Mobility assistance", desc: "safe use of walker, wheelchair and stairs in the home." },
    { term: "Medication reminders", desc: "new prescription schedules reinforced from day one." },
    { term: "Meal preparation", desc: "soft, appropriate meals that match discharge instructions." },
    { term: "Fall prevention", desc: "removing hazards in the return-home environment." },
    { term: "Rehabilitation", desc: "supporting home-based physiotherapy exercises." },
    { term: "Doctor escort", desc: "getting to the first follow-up appointment safely." },
  ],
  closing:
    "PSWs supporting hospital discharge typically start with longer shifts in the first week and taper as recovery stabilizes.",
  offerCatalog: [
    "Hospital discharge support",
    "Personal support",
    "Mobility assistance",
    "Medication reminders",
    "Meal preparation",
    "Fall prevention",
    "Rehabilitation support",
    "Doctor escort",
  ],
};

const COMPANION: SemanticCluster = {
  heading: "What companion care looks like day to day",
  intro:
    "Companion care is deliberately quieter than personal support. It's conversation, presence, and shared activity — the small things that keep an older adult connected and mentally active.",
  concepts: [
    { term: "Companionship", desc: "conversation, walks, board games, reading together." },
    { term: "Meal preparation", desc: "cooking and eating together rather than alone." },
    { term: "Light housekeeping", desc: "tidying alongside the client rather than instead of them." },
    { term: "Doctor escort", desc: "accompaniment to appointments, with notes for the family." },
    { term: "Dementia support", desc: "cognitive engagement suited to the client's stage." },
    { term: "Respite", desc: "predictable weekly presence that gives family caregivers a break." },
    { term: "Senior care", desc: "safety checks and medication reminders woven into the visit." },
  ],
  closing:
    "Companion care is often the first PSW booking a family makes, and it frequently expands into personal support as needs grow.",
  offerCatalog: [
    "Companion care",
    "Meal preparation",
    "Light housekeeping",
    "Doctor escort",
    "Dementia support",
    "Respite care",
    "Senior care",
  ],
};

const PALLIATIVE: SemanticCluster = {
  heading: "How palliative care support works at home",
  intro:
    "Palliative and end-of-life PSW support is centred on comfort, dignity and presence. It complements — never replaces — the palliative physician and nursing team.",
  concepts: [
    { term: "Personal support", desc: "gentle bathing, mouth care and repositioning for comfort." },
    { term: "Companionship", desc: "quiet presence, familiar music, hand-holding." },
    { term: "Medication reminders", desc: "supporting the schedule set by the palliative team." },
    { term: "Overnight care", desc: "continuous presence overnight so family can rest." },
    { term: "24-hour care", desc: "rotating PSWs so someone is always in the room." },
    { term: "Respite", desc: "planned relief for the primary family caregiver." },
    { term: "Hospital discharge", desc: "smooth transition home from a palliative unit or hospice." },
  ],
  closing:
    "Continuity matters more than variety in palliative care, so we work to keep the same small team of PSWs assigned throughout.",
  offerCatalog: [
    "Palliative care",
    "Personal support",
    "Companion care",
    "Medication reminders",
    "Overnight care",
    "24-hour care",
    "Respite care",
    "Hospital discharge support",
  ],
};

const DEFAULT_CLUSTER: SemanticCluster = HOME_CARE;

/** Choose a semantic cluster from the incoming service key or label. */
function pickCluster(service?: string, label?: string): SemanticCluster {
  const key = (service || label || "").toLowerCase();
  if (!key) return DEFAULT_CLUSTER;
  if (/post-?surgery|post-?op|recovery|rehab/.test(key)) return POST_SURGERY;
  if (/dementia|alzheimer|memory/.test(key)) return DEMENTIA;
  if (/respite/.test(key)) return RESPITE;
  if (/overnight|24-?hour|24hr|live-?in/.test(key)) return OVERNIGHT;
  if (/discharge|post-?hospital/.test(key)) return HOSPITAL_DISCHARGE;
  if (/companion/.test(key)) return COMPANION;
  if (/palliative|end-?of-?life|hospice/.test(key)) return PALLIATIVE;
  // Home care, personal support and generic PSW pages get the umbrella cluster.
  return DEFAULT_CLUSTER;
}

const SemanticServiceContent = ({ city, service, serviceLabel, canonicalUrl }: Props) => {
  const cluster = pickCluster(service, serviceLabel);
  const label = serviceLabel || "Home care";
  const inCity = city ? ` in ${city}` : "";

  const offerCatalogSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${label}${inCity}`,
    serviceType: cluster.offerCatalog,
    provider: { "@type": "Organization", name: "PSW Direct", url: SITE_URL },
    url: canonicalUrl ?? SITE_URL,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${label} — related services`,
      itemListElement: cluster.offerCatalog.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s },
      })),
    },
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(offerCatalogSchema)}</script>
      </Helmet>

      <section
        className="px-4 py-12 border-t border-border bg-background"
        aria-label={`${label} — related services and topics`}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" />
            {cluster.heading}
            {city ? <span className="text-muted-foreground font-normal"> — {city}</span> : null}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">{cluster.intro}</p>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
            {cluster.concepts.map((c) => (
              <div key={c.term}>
                <dt className="font-semibold text-foreground">
                  {c.href ? (
                    <Link to={c.href} className="hover:text-primary hover:underline">
                      {c.term}
                    </Link>
                  ) : (
                    c.term
                  )}
                </dt>
                <dd className="text-muted-foreground leading-relaxed text-sm mt-1">{c.desc}</dd>
              </div>
            ))}
          </dl>

          <p className="text-muted-foreground leading-relaxed">{cluster.closing}</p>
        </div>
      </section>
    </>
  );
};

export default SemanticServiceContent;
