import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Heart, Users, Shield, Stethoscope, Home } from "lucide-react";
import logo from "@/assets/logo.png";

interface NearMePageProps {
  variant: "psw-near-me" | "home-care-near-me" | "personal-support-worker-near-me";
}

const metaMap = {
  "psw-near-me": {
    title: "PSW Near Me | Personal Support Worker Services | PSW Direct",
    description: "Looking for a PSW near you? Book trusted personal support workers across Toronto, the GTA, and Ontario starting at $30 per hour.",
  },
  "home-care-near-me": {
    title: "Home Care Near Me | Affordable In-Home Support | PSW Direct",
    description: "Find affordable home care near you. Book vetted personal support workers across Toronto, the GTA, and Ontario starting at $30 per hour.",
  },
  "personal-support-worker-near-me": {
    title: "Personal Support Worker Near Me | PSW Direct",
    description: "Looking for a personal support worker near you? Book trusted home care services across Toronto, the GTA, and Ontario starting at $30 per hour.",
  },
};

const h1Map = {
  "psw-near-me": "PSW Near You",
  "home-care-near-me": "Home Care Near You",
  "personal-support-worker-near-me": "Personal Support Workers Near You",
};

const NearMeLandingPage = ({ variant }: NearMePageProps) => {
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const meta = metaMap[variant];
  const baseH1 = h1Map[variant];
  const canonicalUrl = `https://psadirect.ca/${variant}`;

  // Attempt geolocation-based city detection
  useEffect(() => {
    // Try browser geolocation → reverse geocode
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              { headers: { "Accept-Language": "en" } }
            );
            const data = await res.json();
            const city =
              data?.address?.city ||
              data?.address?.town ||
              data?.address?.municipality ||
              data?.address?.county;
            if (city) setDetectedCity(city);
          } catch {
            // Silent fail — static content still renders
          }
        },
        () => {
          // Permission denied or error — static content remains
        },
        { timeout: 5000 }
      );
    }
  }, []);

  const displayCity = detectedCity || "Toronto & Ontario";
  const headline = detectedCity
    ? `${baseH1.replace("Near You", "")}Near ${detectedCity}`
    : baseH1;

  const services = [
    { icon: Heart, label: "Senior Companionship", desc: "Social engagement, emotional support, and daily supervision for aging loved ones" },
    { icon: Users, label: "Personal Care Assistance", desc: "Help with bathing, grooming, dressing, and personal hygiene" },
    { icon: Shield, label: "Mobility Support", desc: "Walking assistance, transfers, repositioning, and fall prevention" },
    { icon: Home, label: "Hospital Discharge Support", desc: "Safe transition from hospital to home with recovery care" },
    { icon: Stethoscope, label: "Doctor Escort Services", desc: "Accompaniment to medical appointments, specialist visits, and procedures" },
  ];

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
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

        {/* Hero */}
        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            Serving {displayCity}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {headline}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects families with vetted personal support workers across Toronto, the GTA, and Ontario.
            Our platform allows you to book trusted caregivers for senior support, mobility assistance, companionship,
            and post-hospital recovery — online in minutes with transparent pricing starting at $30 per hour.
          </p>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* Services */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Home Care Services {detectedCity ? `in ${detectedCity}` : "Near You"}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-card rounded-xl p-5 shadow-card border border-border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{label}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why PSW Direct */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Why Families Choose PSW Direct
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">$30/hr</p>
              <p className="text-muted-foreground text-sm">
                Home care starting at $30 per hour — traditional agencies charge $55+
              </p>
            </div>
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">Vetted</p>
              <p className="text-muted-foreground text-sm">
                All PSWs are credential-verified with police checks on file
              </p>
            </div>
            <div className="text-center p-6">
              <p className="text-primary text-3xl font-bold mb-2">No Contract</p>
              <p className="text-muted-foreground text-sm">
                Book by the hour with no commitments, cancellation fees, or long-term contracts
              </p>
            </div>
          </div>
        </section>

        {/* SEO Content */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-foreground text-center">
              Finding a Personal Support Worker Near You
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              When searching for a "personal support worker near me" or "home care near me," families want
              reliable, affordable, and immediate options. PSW Direct eliminates the traditional agency model
              by connecting you directly with vetted caregivers in your area. Whether you're in Toronto,
              Mississauga, Brampton, Hamilton, Barrie, or anywhere across the GTA and Ontario, our platform
              matches you with qualified PSWs who can provide the care your family needs.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Common searches like "PSW near me," "home care near me," and "personal support worker near me"
              all lead to the same need: trusted in-home support for a loved one. PSW Direct serves this need
              with transparent pricing, no contracts, and caregivers who are screened and credential-verified
              before being approved on the platform.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-4 py-12 max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-8">Transparent Pricing</h2>
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="bg-card rounded-xl p-6 shadow-card border border-border flex-1 min-w-[220px]">
              <h3 className="font-semibold text-foreground text-lg">Home Care Visits</h3>
              <p className="text-primary text-3xl font-bold mt-2">$30</p>
              <p className="text-muted-foreground text-sm mt-1">per hour</p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border flex-1 min-w-[220px]">
              <h3 className="font-semibold text-foreground text-lg">Doctor Escort</h3>
              <p className="text-primary text-3xl font-bold mt-2">$35</p>
              <p className="text-muted-foreground text-sm mt-1">per hour</p>
            </div>
          </div>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">
              Proudly serving Toronto, the GTA, and communities across Ontario.
            </p>
            <p className="text-sm opacity-80 mb-4">Quality personal support care for Ontario families</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default NearMeLandingPage;
