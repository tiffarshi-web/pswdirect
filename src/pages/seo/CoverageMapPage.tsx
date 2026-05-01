import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Circle, useMap } from "react-leaflet";
import { MapPin, ArrowRight, Shield, Clock, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveServiceRadius } from "@/lib/serviceRadiusStore";
import "leaflet/dist/leaflet.css";

const ONTARIO_CENTER = { lat: 43.7, lng: -79.4 };

interface PSWLocation {
  home_lat: number;
  home_lng: number;
  home_city: string | null;
}

const MapBounds = ({ locations }: { locations: PSWLocation[] }) => {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    const bounds = locations.map((l) => [l.home_lat, l.home_lng] as [number, number]);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
  }, [locations, map]);
  return null;
};

const SERVICES = [
  "Personal Support Worker",
  "Home Care",
  "Dementia Care",
  "Alzheimer's Care",
  "24 Hour Home Care",
  "Overnight Care",
  "Post Surgery Care",
  "Palliative Care",
  "Respite Care",
  "Senior Home Care",
];

const FEATURED_CITIES = [
  "Toronto", "Barrie", "Mississauga", "Hamilton", "Brampton",
  "Vaughan", "Markham", "Richmond Hill", "Oakville", "Milton",
  "Oshawa", "Ajax", "Pickering", "Newmarket", "Aurora",
];

const FAQ_ITEMS = [
  {
    q: "What does a Personal Support Worker do?",
    a: "A PSW provides hands-on assistance with daily living activities including personal hygiene, mobility support, meal preparation, companionship, medication reminders, and escort to medical appointments.",
  },
  {
    q: "Where does PSW Direct provide home care in Ontario?",
    a: "PSW Direct provides coverage across the Greater Toronto Area and surrounding Ontario cities including Toronto, Barrie, Mississauga, Hamilton, Brampton, Vaughan, Markham, Oakville, Oshawa and more. Each PSW covers a service radius from their home location.",
  },
  {
    q: "How do I book a PSW through PSW Direct?",
    a: "Booking is simple: post your shift with your care needs, get matched with a vetted PSW in your area, and care begins. No contracts or commitments required.",
  },
  {
    q: "Is overnight or 24-hour PSW care available?",
    a: "Yes. PSW Direct offers overnight care, 24-hour home care, and flexible scheduling to meet your family's needs across Ontario.",
  },
  {
    q: "How much does home care cost through PSW Direct?",
    a: "Home care through PSW Direct starts at $35 per hour with no agency markups, contracts, or hidden fees. Pricing varies by service type.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HealthcareService",
      "@id": "https://pswdirect.ca/coverage#service",
      name: "PSW Direct Home Care Services",
      provider: {
        "@type": "LocalBusiness",
        name: "PSW Direct",
        url: "https://pswdirect.ca",
        telephone: "+1-800-000-0000",
        areaServed: {
          "@type": "State",
          name: "Ontario",
          containedInPlace: { "@type": "Country", name: "Canada" },
        },
      },
      serviceType: "Personal Support Worker",
      areaServed: FEATURED_CITIES.map((c) => ({
        "@type": "City",
        name: c,
        containedInPlace: { "@type": "State", name: "Ontario" },
      })),
      description:
        "On-demand personal support workers for home care, dementia care, overnight care, and more across Ontario.",
    },
    faqSchema,
  ],
};

const CoverageMapPage = () => {
  const [locations, setLocations] = useState<PSWLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(75);

  useEffect(() => {
    const load = async () => {
      // Fetch admin-controlled radius and PSW locations in parallel
      const [radius, { data }] = await Promise.all([
        fetchActiveServiceRadius(),
        supabase
          .from("psw_profiles")
          .select("home_lat, home_lng, home_city")
          .eq("vetting_status", "approved")
          .eq("is_test", false)
          .not("home_lat", "is", null)
          .not("home_lng", "is", null),
      ]);
      setServiceRadiusKm(radius);
      if (data) setLocations(data as PSWLocation[]);
      setLoading(false);
    };
    load();
  }, []);

  const serviceRadiusM = serviceRadiusKm * 1000;

  const uniqueCities = useMemo(() => {
    const cities = new Set(locations.map((l) => l.home_city).filter(Boolean));
    return Array.from(cities).sort();
  }, [locations]);

  return (
    <>
      <Helmet>
        <title>Personal Support Worker Coverage Map Ontario | PSW Direct</title>
        <meta
          name="description"
          content="See where PSW Direct provides Personal Support Workers and home care services across Ontario including Toronto, Barrie, Mississauga, Hamilton and surrounding areas."
        />
        <link rel="canonical" href="https://pswdirect.ca/coverage" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/lovable-uploads/a6e05da5-a71c-4e12-8d31-63ac338a2a17.png" alt="PSW Direct" className="h-8" />
              <span className="font-bold text-lg text-foreground">PSW Direct</span>
            </Link>
            <Link to="/">
              <Button variant="default" size="sm">
                Book a PSW <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="bg-primary/5 py-12 md:py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Personal Support Worker Coverage Map — Ontario
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See where PSW Direct has vetted Personal Support Workers available for home care, dementia care, overnight care and more across Ontario.
            </p>
          </div>
        </section>

        {/* Map */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="rounded-xl overflow-hidden border shadow-sm" style={{ height: "500px" }}>
            {loading ? (
              <div className="h-full flex items-center justify-center bg-muted">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <MapContainer
                center={[ONTARIO_CENTER.lat, ONTARIO_CENTER.lng]}
                zoom={7}
                scrollWheelZoom
                className="h-full w-full"
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapBounds locations={locations} />
                {locations.map((loc, i) => (
                  <Circle
                    key={i}
                    center={[loc.home_lat, loc.home_lng]}
                    radius={serviceRadiusM}
                    pathOptions={{
                      color: "#16a34a",
                      fillColor: "#16a34a",
                      fillOpacity: 0.08,
                      weight: 1,
                    }}
                  />
                ))}
              </MapContainer>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-3">
            Each circle represents a {serviceRadiusKm} km service radius around a vetted PSW.{" "}
            <strong>{locations.length}</strong> Personal Support Workers currently on the platform.
          </p>
        </section>

        {/* CTA */}
        <section className="bg-primary/5 py-10">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">Book a Personal Support Worker</h2>
            <p className="text-muted-foreground mb-6">
              Post your shift, get matched with a vetted PSW in your area, and care begins. No contracts, no commitments.
            </p>
            <Link to="/">
              <Button size="lg" className="text-base px-8">
                Book Care Now <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Services */}
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Home Care Services Available</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SERVICES.map((s) => (
              <Card key={s} className="text-center">
                <CardContent className="p-4">
                  <Heart className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">{s}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Cities */}
        <section className="bg-muted/50 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Cities We Serve in Ontario</h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {FEATURED_CITIES.map((city) => {
                const slug = city.toLowerCase().replace(/\s+/g, "-");
                return (
                  <Link key={city} to={`/psw-${slug}`} className="px-3 py-1.5 bg-card border rounded-full text-sm font-medium text-foreground hover:bg-primary/10 transition-colors">
                    {city}
                  </Link>
                );
              })}
            </div>
            {uniqueCities.length > 0 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                PSWs available in {uniqueCities.length} cities across Ontario
              </p>
            )}
          </div>
        </section>

        {/* About PSWs */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">What Is a Personal Support Worker?</h2>
          <p className="text-muted-foreground mb-4">
            A Personal Support Worker (PSW) provides hands-on assistance with daily living activities. This includes personal hygiene, mobility support, meal preparation, companionship, light housekeeping, medication reminders, and escort to medical appointments. PSWs are trained professionals who help seniors, people recovering from surgery, and individuals living with conditions like dementia or Alzheimer's maintain their independence at home.
          </p>
          <h3 className="text-xl font-semibold text-foreground mb-3">How PSW Direct Works</h3>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {[
              { icon: Users, title: "1. Post Your Shift", desc: "Tell us your care needs, location, and preferred schedule." },
              { icon: Shield, title: "2. Get Matched", desc: "We match you with a vetted PSW in your area within minutes." },
              { icon: Clock, title: "3. Care Begins", desc: "Your PSW arrives and provides professional, compassionate care." },
            ].map((step) => (
              <Card key={step.title}>
                <CardContent className="p-5">
                  <step.icon className="w-6 h-6 text-primary mb-2" />
                  <h4 className="font-semibold text-foreground mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-muted-foreground">
            PSW Direct connects Ontario families with vetted personal support workers — similar to how ride-sharing works, but for home care. No agency contracts, no hidden fees, and no minimum commitments. Book care in Toronto, Barrie, Mississauga, Hamilton, and across the Greater Toronto Area.
          </p>
        </section>

        {/* FAQ */}
        <section className="bg-muted/50 py-12">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((faq) => (
                <div key={faq.q} className="bg-card border rounded-lg p-5">
                  <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Book a PSW?</h2>
            <p className="text-muted-foreground mb-6">
              Find a vetted Personal Support Worker in your area today.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/">
                <Button size="lg">Book a Personal Support Worker</Button>
              </Link>
              <Link to="/join-team">
                <Button size="lg" variant="outline">Join as a PSW</Button>
              </Link>
              <Link to="/psw-directory">
                <Button size="lg" variant="ghost">Browse PSW Directory</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-card py-6">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} PSW Direct — Personal Support Workers across Ontario
          </div>
        </footer>
      </div>
    </>
  );
};

export default CoverageMapPage;
