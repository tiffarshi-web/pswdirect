import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Shield, Heart, Users, Clock, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const canonicalUrl = `${SITE_URL}/about`;
const title = "About PSW Direct | Trusted Home Care in Ontario";
const description =
  "Learn about PSW Direct — Ontario's platform connecting families with verified Personal Support Workers for in-home care, companionship, and mobility assistance.";

const AboutPage = () => (
  <>
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script type="application/ld+json">
        {JSON.stringify(buildBreadcrumbList([
          { name: "Home", url: SITE_URL },
          { name: "About", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: title,
          description,
          url: canonicalUrl,
          publisher: { "@id": `${SITE_URL}/#organization` },
        })}
      </script>
    </Helmet>

    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="PSW Direct Logo" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <a href="tel:+12492884787">
                <Button variant="outline" size="sm" className="gap-2">
                  <Phone className="h-4 w-4" /> Call Us
                </Button>
              </a>
              <Link to="/client-login">
                <Button size="sm">Book Care</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24 bg-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
            About PSW Direct
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            We connect Ontario families with verified, background-checked Personal Support Workers — faster, more affordable, and more transparent than traditional agencies.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground mb-4">
              Finding quality home care shouldn't be stressful or expensive. PSW Direct was built to eliminate the middlemen, reduce costs, and give families direct access to qualified caregivers across Toronto, the GTA, and Ontario.
            </p>
            <p className="text-muted-foreground">
              Every PSW on our platform is individually vetted — we verify government ID, PSW certification, and police background checks before any caregiver is approved to accept shifts.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, label: "Verified PSWs", desc: "ID, cert & background checked" },
              { icon: Clock, label: "Same-Day Care", desc: "ASAP booking available" },
              { icon: Heart, label: "Compassionate", desc: "Matched to your needs" },
              { icon: MapPin, label: "Ontario-Wide", desc: "40+ cities covered" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 text-center">
                <Icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-semibold text-foreground text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Request Care", desc: "Tell us what you need — personal care, companionship, doctor escort, or mobility help." },
              { step: "2", title: "Get Matched", desc: "We match you with a verified PSW based on your location, language, and care requirements." },
              { step: "3", title: "Care Begins", desc: "Your PSW arrives on time. Track their location and receive real-time updates." },
            ].map(({ step, title: t, desc }) => (
              <div key={step}>
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{t}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For PSWs */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Users className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">For Personal Support Workers</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            PSW Direct offers competitive pay, flexible shifts, and the freedom to choose when and where you work. No agency middlemen — you keep more of what you earn.
          </p>
          <Link to="/join-team">
            <Button size="lg">Apply to Join Our Team</Button>
          </Link>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 bg-primary text-primary-foreground text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">Need Home Care?</h2>
          <p className="mb-6 opacity-90">Book a verified PSW today — starting at $30/hour.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/client-login">
              <Button variant="secondary" size="lg">Book Care Now</Button>
            </Link>
            <a href="tel:+12492884787">
              <Button variant="outline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                <Phone className="h-4 w-4 mr-2" /> 249-288-4787
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  </>
);

export default AboutPage;
