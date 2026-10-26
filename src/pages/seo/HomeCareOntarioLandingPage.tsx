import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SeoCallCta from "@/components/seo/SeoCallCta";
import logo from "@/assets/logo.png";
import { SITE_ORIGIN } from "@/lib/seoIndexability";
import { seoStartingRate } from "@/lib/seoDisplayPricing";

const title = "In-Home Care in Ontario for Families | PSW Direct";
const description = "Arrange in-home personal support for a parent or loved one in Ontario from $40/hour. Call PSW Direct or request care online; address and availability must be confirmed.";
const canonical = `${SITE_ORIGIN}/home-care-ontario`;

const tasks = [
  { title: "Personal care", text: "Respectful help with bathing, dressing, grooming and toileting. Share the person's preferences, transfer needs and equipment so a suitable PSW can be considered." },
  { title: "Companionship and daily routines", text: "Conversation, familiar activities, meal preparation and light care-related housekeeping. Explain dietary instructions and the routine your loved one wants to maintain." },
  { title: "Mobility and reminders", text: "Help with familiar mobility aids and medication reminders under the existing care plan. PSWs do not prescribe medication, provide rehabilitation or replace nursing care." },
  { title: "Relief for family caregivers", text: "A planned support visit while you rest or attend to other responsibilities. Agree on the tasks, handover and emergency contacts before relying on replacement care." },
];

export default function HomeCareOntarioLandingPage() {
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
          <nav className="text-sm text-muted-foreground mb-6"><Link to="/" className="hover:underline">Home</Link> / Home care in Ontario</nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-5">In-Home Care in Ontario</h1>
          <p className="text-lg text-muted-foreground mb-5">Personal support for your parent, partner or loved one, in the comfort of their own home. PSW Direct connects families with vetted personal support workers for everyday care and companionship.</p>
          <p className="font-semibold mb-5">Home care from ${seoStartingRate("home-care")}/hour. Applicable taxes and the total are shown when booking.</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request home care</Link></Button><SeoCallCta /></div>
          <p className="text-sm text-muted-foreground mt-3">Questions about your care request? Support is available 24 hours a day, 7 days a week.</p>
          <p className="text-sm text-muted-foreground mt-5">Tell us the care address, tasks and preferred schedule. Service depends on address coverage and a suitable caregiver accepting your request; same-day, overnight and continuous coverage are not guaranteed.</p>
        </section>
        <section className="bg-muted/30 border-y border-border px-4 py-10"><div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-6">Support with everyday life at home</h2>
          <div className="grid md:grid-cols-2 gap-8">{tasks.map(task => <article key={task.title}><h3 className="text-lg font-semibold mb-2">{task.title}</h3><p className="text-muted-foreground">{task.text}</p></article>)}</div>
        </div></section>
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-2xl font-semibold mb-5">Plan the right visit for your family</h2>
          <ol className="list-decimal pl-5 space-y-4 text-muted-foreground"><li>Share the Ontario address, desired date and hours, daily care needs, language preferences and access instructions.</li><li>Review the service and price before submitting your request. A nearby directory listing is not a promise of an available caregiver.</li><li>Check that your request has been accepted before making arrangements that depend on the visit. Care reports document the completed visit.</li></ol>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Confirm care at your address</h2>
          <p className="text-muted-foreground mb-5">Ontario bookings are open, but that does not mean every Ontario address is served. Call with your location and care needs, or enter your address in the booking form. Caregiver suitability, travel and scheduling must be assessed for your request.</p>
          <p className="text-muted-foreground mb-5">Doctor escort and hospital discharge support start at ${seoStartingRate("doctor-escort")}/hour. These are separate services; an escort is not emergency medical transport.</p>
          <div className="flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/">Request home care</Link></Button><SeoCallCta /></div>
          <p className="text-sm text-muted-foreground mt-3">Contact our support team 24 hours a day, 7 days a week. Care visits remain subject to confirmed address coverage and caregiver acceptance.</p>
        </section>
        <section className="border-t border-border px-4 py-8"><div className="max-w-4xl mx-auto"><h2 className="text-xl font-semibold mb-4">Planning resources</h2><ul className="space-y-3 text-primary"><li><Link to="/guides/how-to-hire-a-personal-support-worker" className="hover:underline">Choosing a personal support worker</Link></li><li><Link to="/guides/cost-of-home-care-ontario" className="hover:underline">Planning home-care costs in Ontario</Link></li><li><Link to="/guides/signs-your-parent-needs-home-care" className="hover:underline">When a parent may need help at home</Link></li></ul></div></section>
      </main>
      <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground">PSW Direct · Ontario care requests · <Link to="/" className="text-primary hover:underline">Book online</Link></footer>
    </div>
  </>;
}
