import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoCallCta from "@/components/seo/SeoCallCta";
import logo from "@/assets/logo.png";
import { SITE_ORIGIN } from "@/lib/seoIndexability";
import { seoStartingRate } from "@/lib/seoDisplayPricing";
import { getCityProfile, type CityTopic } from "@/lib/cityProfiles";
import { APPROVED_HOME_CARE_CITIES } from "@/lib/approvedHomeCareCities";

/** Planning notes keyed to verified city-profile topics only (no invented local facts). */
const TOPIC_NOTES: Partial<Record<CityTopic, { heading: string; text: (n: string) => string; title: (n: string) => string; desc: (n: string, area: string) => string }>> = {
  "multigenerational-households": {
    heading: "When several generations share the home",
    text: n => `Many ${n} families care for a parent in a shared household. Name one main contact for the caregiver, explain which rooms and routines the visit covers, and note who will be home during the visit.`,
    title: n => `Home Care in ${n} for Multigenerational Families | PSW Direct`,
    desc: (n, a) => `Book in-home PSW help for a parent living with family in ${n}, ${a}. $40/hour in 2-hour increments, with 24/7 customer support.`,
  },
  "hospital-hub": {
    heading: "Coming home after a hospital stay",
    text: n => `If your loved one is returning home in ${n} after a hospital visit, share the discharge instructions when booking. A PSW helps with daily living such as washing, dressing and meals; nursing and clinical care stay with the care team. Hospital discharge support is a separate service from $${seoStartingRate("hospital-discharge")}/hour.`,
    title: n => `In-Home Care in ${n} After a Hospital Stay | PSW Direct`,
    desc: (n, a) => `Arrange PSW home care in ${n}, ${a}, for daily routines at home, including after a hospital stay. $40/hour, booked in 2-hour increments.`,
  },
  "regional-referral-hospital": {
    heading: "Coming home after a hospital stay",
    text: n => `If your loved one is returning home in ${n} after hospital care, share the discharge instructions when booking. A PSW supports daily living; clinical care stays with the care team.`,
    title: n => `In-Home Care in ${n} After a Hospital Stay | PSW Direct`,
    desc: (n, a) => `Arrange PSW home care in ${n}, ${a}, for daily routines at home, including after a hospital stay. $40/hour, booked in 2-hour increments.`,
  },
  "bilingual-care": {
    heading: "Language preferences",
    text: () => "If your loved one is more comfortable in French or another language, note it when booking. A language match is a preference we try to meet, not a guarantee.",
    title: n => `Home Care in ${n} – In-Home PSW Help for Families | PSW Direct`,
    desc: (n, a) => `Request in-home personal support in ${n}, ${a}, and note language preferences. $40/hour in 2-hour increments; 24/7 customer support.`,
  },
  "new-canadians": {
    heading: "Language and cultural preferences",
    text: () => "Tell us about language, dietary or cultural preferences that matter to your loved one. We try to match them, but a specific match is not guaranteed.",
    title: n => `Home Care in ${n} – PSW Support That Respects Family Routines | PSW Direct`,
    desc: (n, a) => `Book in-home PSW support in ${n}, ${a}, and share language and cultural preferences. $40/hour in 2-hour increments.`,
  },
  "commuter-community": {
    heading: "Care while you are at work",
    text: n => `Families in ${n} often arrange visits around work and commuting. Book the hours you need in 2-hour increments and share entry, handover and emergency contact instructions ahead of time.`,
    title: n => `Home Care in ${n} for Working Families | PSW Direct`,
    desc: (n, a) => `Arrange in-home PSW visits in ${n}, ${a}, around your work schedule. $40/hour, booked in 2-hour increments, with 24/7 customer support.`,
  },
  "aging-in-place": {
    heading: "Helping a parent stay at home",
    text: n => `Regular visits for bathing, dressing, meals and companionship can help an older adult in ${n} keep familiar routines at home. Start with the tasks that matter most and adjust as needs change.`,
    title: n => `Home Care in ${n} to Help a Parent Stay at Home | PSW Direct`,
    desc: (n, a) => `In-home PSW help in ${n}, ${a}, for bathing, meals and daily routines. $40/hour in 2-hour increments; call or book online.`,
  },
  "retirement-growth": {
    heading: "Support for retirees",
    text: n => `For retirees in ${n} who need some help at home, a PSW visit can cover personal care, light housekeeping related to care, and companionship.`,
    title: n => `Home Care in ${n} for Seniors and Retirees | PSW Direct`,
    desc: (n, a) => `Book in-home PSW support for a senior in ${n}, ${a}. $40/hour in 2-hour increments, with 24/7 customer support.`,
  },
  "government-retirees": {
    heading: "Checking benefit or reimbursement plans",
    text: () => "If a pension, insurance or veterans' plan may reimburse home care, check the plan's rules before booking. Your invoice shows the visit details.",
    title: n => `Home Care in ${n} – Book In-Home PSW Support | PSW Direct`,
    desc: (n, a) => `Arrange in-home personal support in ${n}, ${a}. $40/hour in 2-hour increments; invoices list each visit.`,
  },
  "northern-community": {
    heading: "Travel and distance",
    text: n => `Distances in and around ${n} can be longer. Enter the exact care address so coverage and caregiver travel can be checked for your request.`,
    title: n => `Home Care in ${n} – In-Home PSW Help | PSW Direct`,
    desc: (n, a) => `Request in-home PSW support in ${n}, ${a}. Enter your address to confirm coverage. $40/hour in 2-hour increments.`,
  },
  "rural": {
    heading: "Rural addresses",
    text: n => `For homes outside central ${n}, include clear directions and parking or entry details so the visit can be planned.`,
    title: n => `Home Care in ${n} – In-Home PSW Help | PSW Direct`,
    desc: (n, a) => `Request in-home PSW support in ${n}, ${a}, including rural addresses. $40/hour in 2-hour increments.`,
  },
  "waterfront": {
    heading: "Book for the home where care happens",
    text: () => "If your loved one moves between homes during the year, book for the address where the visit will happen so coverage can be confirmed for that address.",
    title: n => `Home Care in ${n} – In-Home PSW Support | PSW Direct`,
    desc: (n, a) => `Book in-home PSW help in ${n}, ${a}. $40/hour in 2-hour increments, with 24/7 customer support.`,
  },
  "cardiac-recovery": {
    heading: "Recovering at home",
    text: () => "During recovery from surgery or illness, a PSW can help with daily tasks while you follow the care team's plan. PSWs do not provide rehabilitation or nursing care.",
    title: n => `Home Care in ${n} During Recovery at Home | PSW Direct`,
    desc: (n, a) => `Non-clinical in-home PSW help in ${n}, ${a}, while recovering at home. $40/hour in 2-hour increments.`,
  },
};

const TASKS = [
  "Personal care: bathing, dressing, grooming and toileting",
  "Companionship, conversation and familiar activities",
  "Meal preparation and light care-related housekeeping",
  "Help with familiar mobility aids and medication reminders under the existing care plan",
  "Planned relief visits for family caregivers",
];

export default function ApprovedHomeCareCityPage({ cityKey }: { cityKey: string }) {
  const city = APPROVED_HOME_CARE_CITIES.find(c => c.key === cityKey)!;
  const n = city.name;
  const profile = getCityProfile(city.label);
  const area = city.area ?? (profile.county && profile.county !== n && profile.county !== `City of ${n}` ? profile.county : "Ontario");
  const notes = (profile.topics ?? []).map(t => TOPIC_NOTES[t]).filter(Boolean)
    .filter((v, i, arr) => arr.findIndex(x => x!.heading === v!.heading) === i).slice(0, 3) as NonNullable<typeof TOPIC_NOTES[CityTopic]>[];
  const lead = notes[0];
  const title = lead ? lead.title(n) : `Home Care in ${n} – In-Home PSW Help | PSW Direct`;
  const description = lead ? lead.desc(n, area) : `Book in-home PSW support in ${n}, Ontario. $40/hour in 2-hour increments, with 24/7 customer support.`;
  const canonical = `${SITE_ORIGIN}/${city.slug}`;
  const rate = seoStartingRate("home-care");

  return <>
    <Helmet>
      <title>{title}</title><meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} /><meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} /><meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary" /><meta name="twitter:title" content={title} /><meta name="twitter:description" content={description} />
      <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: title, description, url: canonical })}</script>
    </Helmet>
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border"><div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
        <Link to="/"><img src={logo} alt="PSW Direct" className="h-10 w-auto" /></Link><SeoCallCta className="text-sm" />
      </div></header>
      <main>
        <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
          <nav className="text-sm text-muted-foreground mb-6"><Link to="/" className="hover:underline">Home</Link> / <Link to="/home-care-ontario" className="hover:underline">Home care in Ontario</Link> / {n}</nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-5">Home Care in {n}</h1>
          <p className="text-lg text-muted-foreground mb-5">In-home personal support for a parent, partner or loved one in {n}{area !== "Ontario" ? `, ${area}` : ""}. Tell us what help is needed at home and PSW Direct sends your request to vetted personal support workers.</p>
          <p className="font-semibold mb-5">Home care is ${rate}/hour, booked in 2-hour increments. Applicable taxes and your total are shown before you submit a booking.</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request home care in {n}</Link></Button><SeoCallCta /></div>
          <p className="text-sm text-muted-foreground mt-3">Customer support is available 24 hours a day, 7 days a week. Care visits are scheduled separately and are not guaranteed around the clock.</p>
          <p className="text-sm text-muted-foreground mt-3">Coverage for your exact {n} address and caregiver acceptance are confirmed during booking. Please wait for confirmation before relying on a visit.</p>
        </section>
        <section className="max-w-4xl mx-auto px-4 pb-10">
          <h2 className="text-2xl font-semibold mb-3">Home care coverage in {n}</h2>
          <p className="text-muted-foreground">PSW Direct has vetted personal support workers on its roster in the {n} area{area !== "Ontario" ? ` (${area})` : ""}. Having caregivers nearby does not guarantee one is free for your dates, so enter the exact address when booking and we confirm coverage and caregiver acceptance before the visit.</p>
          {city.localities.length > 0 && <p className="text-muted-foreground mt-3">This page also covers home-care requests in {city.localities.join(", ")}.</p>}
        </section>
        {notes.length > 0 && <section className="bg-muted/30 border-y border-border px-4 py-10"><div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Planning home care in {n}</h2>
          <div className="space-y-6">{notes.map(note => <article key={note.heading}><h3 className="text-lg font-semibold mb-2">{note.heading}</h3><p className="text-muted-foreground">{note.text(n)}</p></article>)}</div>
        </div></section>}
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-semibold mb-4">What a PSW can help with</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">{TASKS.map(t => <li key={t}>{t}</li>)}</ul>
          <p className="text-sm text-muted-foreground mt-4">PSWs do not diagnose, prescribe medication, provide rehabilitation, replace nursing care or provide emergency medical transport.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">How booking works</h2>
          <ol className="list-decimal pl-5 space-y-3 text-muted-foreground">
            <li>Enter the {n} care address, date, hours (in 2-hour increments) and the tasks needed.</li>
            <li>Review the price and total, then submit your request.</li>
            <li>We confirm address coverage and a caregiver accepts the request. You can call us any time with questions.</li>
          </ol>
          <div className="flex flex-wrap gap-3 mt-6"><Button asChild size="lg"><Link to="/">Book home care</Link></Button><SeoCallCta /></div>
        </section>
        <section className="border-t border-border px-4 py-8"><div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">More home-care planning</h2>
          <ul className="space-y-3 text-primary">
            <li><Link to="/home-care-ontario" className="hover:underline">Home care in Ontario – all service areas</Link></li>
            <li><Link to="/guides/cost-of-home-care-ontario" className="hover:underline">Planning home-care costs in Ontario</Link></li>
            <li><Link to="/guides/signs-your-parent-needs-home-care" className="hover:underline">When a parent may need help at home</Link></li>
            <li><Link to="/guides/how-to-hire-a-personal-support-worker" className="hover:underline">Choosing a personal support worker</Link></li>
          </ul>
        </div></section>
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">PSW Direct · Ontario home care · <Link to="/" className="text-primary hover:underline">Book online</Link></footer>
    </div>
  </>;
}
