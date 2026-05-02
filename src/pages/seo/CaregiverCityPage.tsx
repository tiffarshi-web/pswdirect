import Breadcrumbs from "@/components/seo/Breadcrumbs";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, CheckCircle, Clock, Shield, Users, Heart, Stethoscope, ArrowRight, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { buildFAQSchema } from "@/lib/seoShared";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";
import CityInternalLinks from "@/components/seo/CityInternalLinks";
import TrustSignals from "@/components/seo/TrustSignals";
import ServingYourArea from "@/components/seo/ServingYourArea";
import InlineLinkParagraph from "@/components/seo/InlineLinkParagraph";
import { isTier1CityByLabel } from "@/lib/seoTierConfig";

interface Props {
  city: string;
  slug: string;
}

const CaregiverCityPage = ({ city, slug }: Props) => {
  const canonicalUrl = `${SITE_URL}/${slug}`;
  const isIndexable = isTier1CityByLabel(city);
  const title = `Caregiver in ${city} | In-Home Caregiver Services | PSW Direct`;
  const description = `Find a trusted caregiver in ${city}, Ontario. PSW Direct provides vetted in-home caregivers for personal care, companionship, and senior support from $35/hr. No contracts.`;

  const faqs = [
    { question: `How do I find a caregiver in ${city}?`, answer: `PSW Direct matches you with vetted caregivers in ${city}. Enter your address when booking and we'll connect you with the closest available personal support worker, often within hours.` },
    { question: `What caregiver services are available in ${city}?`, answer: `Caregivers in ${city} provide personal care (bathing, dressing), companionship, meal preparation, medication reminders, mobility assistance, doctor escorts, and hospital discharge support.` },
    { question: `How much does a caregiver cost in ${city}?`, answer: `Through PSW Direct, caregivers in ${city} start at $35/hr for personal care and $45/hr for medical escorts. No agency fees, no contracts, no hidden charges.` },
    { question: `Can I get a same-day caregiver in ${city}?`, answer: `Yes. PSW Direct offers same-day caregiver availability in ${city} and surrounding areas. Many requests are filled within hours of booking.` },
  ];

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        {!isIndexable && <meta name="robots" content="noindex, follow" />}
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(buildBreadcrumbList([
          { name: "Home", url: SITE_URL },
          { name: "Caregiver Services", url: `${SITE_URL}/caregiver-services` },
          { name: `Caregiver ${city}`, url: canonicalUrl },
        ]))}</script>
        <script type="application/ld+json">{JSON.stringify(buildFAQSchema(faqs))}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HomeHealthService",
          name: `PSW Direct — Caregiver in ${city}`,
          description,
          url: canonicalUrl,
          telephone: BUSINESS_CONTACT.phoneInternational,
          priceRange: "$35-$45",
          areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } },
        })}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Link to="/" className="flex items-center gap-2 sm:gap-3">
                <img src={logo} alt="PSW Direct Logo" className="h-10 sm:h-12 w-auto" />
                <span className="text-sm font-semibold text-foreground tracking-wide hidden sm:inline">PSW Direct</span>
              </Link>
              <a href={BUSINESS_CONTACT.phoneTel} className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">{BUSINESS_CONTACT.phone}</span>
              </a>
            </div>
          </div>
        </header>
        <Breadcrumbs city={city} service={{ name: "Caregiver", href: `/${slug}` }} />

        <section className="px-4 py-12 md:py-20 max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Find a Trusted Caregiver in {city}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects families in {city} with vetted, professional caregivers for in-home personal care, companionship, and senior support. Available same-day, no contracts, from $35/hr.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link to="/"><Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">Book a Caregiver in {city}</Button></Link>
            <Link to="/psw-cost"><Button size="lg" variant="outline" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto">Get Instant Price</Button></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            {["Fully vetted & police-checked caregivers", "Book online in under 2 minutes", `Same-day availability in ${city}`, "Pay hourly — no contracts ever"].map((b) => (
              <div key={b} className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle className="w-4 h-4 text-primary shrink-0" /><span>{b}</span></div>
            ))}
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-12 md:py-16 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Why Families in {city} Choose PSW Direct</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Shield, text: `Every caregiver serving ${city} is credential-verified and police-checked` },
                { icon: Clock, text: "Same-day availability — care when you need it most" },
                { icon: MapPin, text: `On-demand coverage across ${city} and surrounding areas` },
                { icon: ArrowRight, text: "No contracts, no agency fees — quality care by the hour" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3 bg-card rounded-lg p-4 border border-border"><Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" /><p className="text-sm text-foreground">{text}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "1", title: "Book Online", desc: `Tell us what care you need in ${city}. It takes under 2 minutes.` },
                { step: "2", title: "Caregiver Accepts", desc: `A vetted caregiver near ${city} accepts the job and prepares to arrive.` },
                { step: "3", title: "Care Begins", desc: "Your caregiver arrives on time. Track their arrival from your phone." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">{step}</div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-12 md:py-16 border-y border-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 text-center">Caregiver Services in {city}</h2>
            <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">Professional, on-demand care tailored to your needs — from daily personal support to specialized medical accompaniment in {city}.</p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Heart, title: "Personal Care", desc: `Bathing, dressing, grooming, meal preparation, medication reminders, and mobility support in ${city}.` },
                { icon: Stethoscope, title: "Doctor Escort", desc: `A caregiver drives and accompanies your loved one to medical appointments in ${city} and surrounding areas.` },
                { icon: Users, title: "Companionship", desc: `Conversation, activities, walks, and genuine human connection to combat isolation for seniors in ${city}.` },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-card rounded-xl p-6 border border-border hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><Icon className="w-5 h-5 text-primary" /></div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <details key={i} className="bg-card rounded-xl border border-border group">
                  <summary className="cursor-pointer p-5 font-semibold text-foreground list-none flex items-center justify-between">
                    {f.question}<ArrowRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0 ml-2" />
                  </summary>
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 md:py-16 bg-secondary text-secondary-foreground">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Book a Caregiver in {city}?</h2>
            <p className="opacity-80 mb-8 max-w-xl mx-auto">Join hundreds of Ontario families who trust PSW Direct for on-demand, vetted home care. No contracts. Care starts today.</p>
            <Link to="/"><Button size="lg" className="text-lg px-8 py-6">Request a Caregiver Now <ArrowRight className="w-5 h-5 ml-2" /></Button></Link>
          </div>
        </section>

        <ServingYourArea city={city} />
        <InlineLinkParagraph city={city} service="Caregiver" />
        <TrustSignals city={city} service="Caregiver" />
        <CityInternalLinks city={city} />
        <section className="px-4 py-10 max-w-4xl mx-auto"><SEOInternalLinks /></section>

        <footer className="bg-secondary text-secondary-foreground py-8 px-4 border-t border-border/20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">Ontario's on-demand home care platform. 80+ communities served.</p>
            <p className="text-xs opacity-60">© {new Date().getFullYear()} PSW Direct. All Rights Reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default CaregiverCityPage;
