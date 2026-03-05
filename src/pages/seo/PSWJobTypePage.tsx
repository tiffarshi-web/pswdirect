import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, DollarSign, Clock, Shield, Briefcase, Moon, Sun } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

interface PSWJobTypePageProps {
  variant: "private" | "overnight" | "24-hour" | "part-time";
}

const variantConfig = {
  private: {
    slug: "private-psw-jobs",
    title: "Private PSW Jobs in Ontario | PSW Direct",
    h1: "Private PSW Jobs in Ontario",
    description: "Work as a private personal support worker in Ontario. Earn $22–$28/hr with PSW Direct — no agency overhead, flexible hours, direct client work.",
    heroDesc: "Skip the agency and work directly with families across Ontario. Private PSW roles offer higher pay, flexible scheduling, and the independence to build your own client base.",
    icon: Shield,
    tagline: "Work Independently",
    jobTitle: "Private Personal Support Worker",
    employmentType: ["CONTRACTOR"],
  },
  overnight: {
    slug: "overnight-psw-jobs",
    title: "Overnight PSW Jobs in Ontario | PSW Direct",
    h1: "Overnight PSW Jobs in Ontario",
    description: "Looking for overnight PSW work? PSW Direct offers flexible overnight shifts across Ontario. Earn competitive rates with no contracts.",
    heroDesc: "Overnight personal support worker shifts are in high demand across Ontario. Work evening-to-morning shifts providing supervision, personal care, and companionship for seniors and individuals needing overnight support.",
    icon: Moon,
    tagline: "Overnight Shifts Available",
    jobTitle: "Overnight Personal Support Worker",
    employmentType: ["PART_TIME", "CONTRACTOR"],
  },
  "24-hour": {
    slug: "24-hour-psw-jobs",
    title: "24-Hour PSW Jobs in Ontario | PSW Direct",
    h1: "24-Hour PSW Jobs in Ontario",
    description: "Find 24-hour PSW positions across Ontario. Extended shifts with competitive hourly pay, flexible scheduling, and no long-term contracts.",
    heroDesc: "Extended 24-hour care shifts offer consistent hours and meaningful client relationships. Provide round-the-clock personal support, companionship, and safety monitoring for families across Ontario.",
    icon: Sun,
    tagline: "Extended Care Shifts",
    jobTitle: "24-Hour Personal Support Worker",
    employmentType: ["FULL_TIME", "CONTRACTOR"],
  },
  "part-time": {
    slug: "psw-part-time-jobs",
    title: "Part-Time PSW Jobs in Ontario | PSW Direct",
    h1: "Part-Time PSW Jobs in Ontario",
    description: "Find part-time PSW work in Ontario with flexible scheduling. Choose your own hours, earn $22–$28/hr, and work on your own terms with PSW Direct.",
    heroDesc: "Part-time PSW roles are ideal for caregivers who want to supplement their income, balance family commitments, or ease into the field. Choose shifts that fit your life — mornings, afternoons, evenings, or weekends.",
    icon: Clock,
    tagline: "Flexible Part-Time Hours",
    jobTitle: "Part-Time Personal Support Worker",
    employmentType: ["PART_TIME"],
  },
};

const PSWJobTypePage = ({ variant }: PSWJobTypePageProps) => {
  const config = variantConfig[variant];
  const canonicalUrl = `${SITE_URL}/${config.slug}`;
  const Icon = config.icon;

  const jobPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: config.jobTitle,
    description: config.heroDesc,
    datePosted: "2026-01-01",
    validThrough: "2026-12-31",
    employmentType: config.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: "PSW Direct",
      sameAs: SITE_URL,
      logo: `${SITE_URL}/logo-512.png`,
    },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressRegion: "ON", addressCountry: "CA" },
    },
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "CAD",
      value: { "@type": "QuantitativeValue", minValue: 22, maxValue: 28, unitText: "HOUR" },
    },
  };

  const benefits = [
    { icon: DollarSign, label: "$22–$28/hr", desc: "Competitive hourly pay — higher than most agency rates" },
    { icon: Clock, label: "Flexible Hours", desc: "Set your own availability and choose shifts that fit your life" },
    { icon: Shield, label: "No Contracts", desc: "No long-term commitments — work on your own terms" },
    { icon: Briefcase, label: "Weekly Payouts", desc: "Request payouts every Thursday" },
  ];

  const cities = ["Toronto", "Mississauga", "Brampton", "Hamilton", "Ottawa", "Barrie", "Kitchener", "London"];

  return (
    <>
      <Helmet>
        <title>{config.title}</title>
        <meta name="description" content={config.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={config.title} />
        <meta property="og:description" content={config.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={config.title} />
        <meta name="twitter:description" content={config.description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            { name: config.h1, url: canonicalUrl },
          ]))}
        </script>
        <script type="application/ld+json">{JSON.stringify(jobPostingJsonLd)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to="/" className="flex items-center gap-3">
                <img src={logo} alt="PSW Direct Logo" className="h-12 w-auto" />
                <span className="text-sm font-semibold text-foreground tracking-wide">PSW Direct</span>
              </Link>
              <a href="tel:2492884787" className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">(249) 288-4787</span>
              </a>
            </div>
          </div>
        </header>

        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Icon className="w-4 h-4" />
            {config.tagline}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{config.h1}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">{config.heroDesc}</p>
          <Link to="/join-team">
            <Button size="lg" className="text-lg px-8 py-6">Apply to Join PSW Direct</Button>
          </Link>
        </section>

        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Benefits</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {benefits.map(({ icon: BIcon, label, desc }) => (
                <div key={label} className="bg-card rounded-xl p-5 shadow-card border border-border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <BIcon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{label}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-6">Available in These Cities</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {cities.map((city) => (
                <Link key={city} to={`/psw-jobs-${city.toLowerCase().replace(/[\s.]+/g, "-")}`}
                  className="bg-card rounded-lg px-4 py-2 border border-border hover:border-primary transition-all text-sm font-medium text-foreground">
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-12 border-y border-border text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Start?</h2>
          <p className="text-muted-foreground mb-6">Apply online in minutes. Upload your credentials and start receiving client requests.</p>
          <Link to="/join-team">
            <Button size="lg" className="text-lg px-8 py-6">Apply Now</Button>
          </Link>
        </section>

        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/psw-work-areas-ontario" className="text-primary hover:underline text-sm">All Work Areas</Link>
            <Link to="/psw-pay-calculator" className="text-primary hover:underline text-sm">Pay Calculator</Link>
            <Link to="/psw-agency-vs-private-pay" className="text-primary hover:underline text-sm">Agency vs Private Pay</Link>
          </div>
        </section>

        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">Hiring PSWs across Ontario.</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PSWJobTypePage;
