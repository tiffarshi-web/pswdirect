import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Clock, Shield, Heart, Users, Stethoscope, Home, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface PSWProfileData {
  first_name: string;
  last_name: string;
  home_city: string | null;
  years_experience: string | null;
  languages: string[] | null;
  gender: string | null;
}

const PSWProfileSEO = () => {
  const { slug } = useParams<{ slug: string }>();
  const [psw, setPsw] = useState<PSWProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchPSW = async () => {
      if (!slug) { setNotFound(true); setLoading(false); return; }

      // Parse slug: "firstname-lastname-city" pattern
      // Fetch all approved PSWs and match by slug
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("first_name, last_name, home_city, years_experience, languages, gender")
        .eq("vetting_status", "approved");

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      // Match slug against PSW profiles
      const matched = data.find((p) => {
        const generated = `${p.first_name}-${p.last_name}-${p.home_city || "ontario"}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
        return generated === slug;
      });

      if (matched) {
        setPsw(matched);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    };

    fetchPSW();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notFound || !psw) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Profile Not Found</h1>
        <p className="text-muted-foreground mb-6">This personal support worker profile is not available.</p>
        <Link to="/">
          <Button>Return to PSW Direct</Button>
        </Link>
      </div>
    );
  }

  const fullName = `${psw.first_name} ${psw.last_name}`;
  const displayName = `${psw.first_name} ${psw.last_name.charAt(0)}.`;
  const city = psw.home_city || "Ontario";
  const metaTitle = `${displayName} — Personal Support Worker in ${city}, Ontario | PSW Direct`;
  const metaDescription = `${displayName} is a credential-verified Personal Support Worker in ${city}, Ontario available for home care, companionship, mobility assistance, and senior support through PSW Direct.`;
  const canonicalUrl = `https://psadirect.ca/psw/profile/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    jobTitle: "Personal Support Worker",
    address: { "@type": "PostalAddress", addressLocality: city, addressRegion: "Ontario", addressCountry: "CA" },
    worksFor: { "@type": "Organization", name: "PSW Direct", url: "https://psadirect.ca" },
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Personal Support Worker Services",
        description: `Home care, companionship, mobility support, and doctor escort services in ${city}`,
        provider: { "@type": "Organization", name: "PSW Direct" },
      },
      priceSpecification: { "@type": "PriceSpecification", price: "30", priceCurrency: "CAD", unitText: "per hour" },
    },
  };

  const servicesList = [
    { icon: Heart, label: "Personal Care Assistance", desc: "Bathing, grooming, dressing, and daily hygiene support" },
    { icon: Users, label: "Senior Companionship", desc: "Social engagement, emotional support, and supervision" },
    { icon: Shield, label: "Mobility Support", desc: "Transfers, walking assistance, and fall prevention" },
    { icon: Stethoscope, label: "Doctor Escort", desc: "Accompaniment to medical appointments and specialist visits" },
    { icon: Home, label: "Hospital Discharge Support", desc: "Safe transition from hospital to home with recovery assistance" },
  ];

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
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

        {/* Profile Hero */}
        <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto">
          <Link to="/psw-directory" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6">
            <ArrowLeft className="w-4 h-4" /> Browse all PSWs
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {displayName} — Personal Support Worker in {city}, Ontario
          </h1>

          <div className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {psw.first_name.charAt(0)}{psw.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {city}
                  </p>
                </div>
              </div>

              {psw.years_experience && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{psw.years_experience} of experience</span>
                </div>
              )}

              {psw.languages && psw.languages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {psw.languages.map((lang) => (
                    <span key={lang} className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-foreground capitalize">
                      {lang === "en" ? "English" : lang === "fr" ? "French" : lang}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Credential Verified · Police Check on File</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-10">
            <p className="text-lg text-muted-foreground leading-relaxed">
              {fullName} is a vetted personal support worker on the PSW Direct platform serving families
              in {city} and surrounding areas. All PSW Direct caregivers are credential-verified and
              screened before being approved on the platform.
            </p>
          </div>

          {/* Services */}
          <h2 className="text-2xl font-bold text-foreground mb-6">Services Available</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {servicesList.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-card rounded-xl p-5 shadow-card border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-muted/50 rounded-2xl p-6 md:p-8 border border-border mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Transparent Pricing</h2>
            <div className="flex flex-wrap justify-center gap-6">
              <div>
                <p className="text-primary text-3xl font-bold">$30</p>
                <p className="text-muted-foreground text-sm">Home Care / hr</p>
              </div>
              <div>
                <p className="text-primary text-3xl font-bold">$35</p>
                <p className="text-muted-foreground text-sm">Doctor Escort / hr</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <a href="https://psadirect.ca/">
              <Button size="lg" className="text-lg px-8 py-6">
                Book a Personal Support Worker
              </Button>
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4 mt-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-4">Quality personal support care for Ontario families</p>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PSWProfileSEO;
