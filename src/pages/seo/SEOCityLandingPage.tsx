import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Users, Heart, Phone } from "lucide-react";
import logo from "@/assets/logo.png";

interface SEOCityLandingPageProps {
  city: string;
  slug: string;
}

const SEOCityLandingPage = ({ city, slug }: SEOCityLandingPageProps) => {
  const title = `Personal Support Worker in ${city} | Home Care Services | PSW Direct`;
  const description = `Book a personal support worker in ${city}. Affordable home care starting at $30/hour. Serving Toronto, the GTA and Ontario.`;
  const canonicalUrl = `https://psadirect.ca/${slug}`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Simple Header */}
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
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Personal Support Worker in {city}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            PSW Direct connects families with vetted personal support workers (PSWs) across Toronto, the GTA and Ontario.
            Families can book affordable home care services online in minutes with transparent pricing starting at $30 per hour.
          </p>
          <a href="https://psadirect.ca/">
            <Button size="lg" className="text-lg px-8 py-6">
              Book a Personal Support Worker
            </Button>
          </a>
        </section>

        {/* Affordable Home Care Section */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
              Affordable Home Care in {city}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Searching for a personal support worker near me in {city}? PSW Direct provides on-demand PSW services
              for families who need reliable, affordable in-home support. Our platform connects you with credential-verified
              caregivers offering personal care, senior care, companionship, mobility assistance, and daily living support.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Whether you need home care services for a loved one recovering from surgery, hospital discharge support
              after a stay, or a doctor escort to accompany a family member to medical appointments, PSW Direct makes
              booking simple. Traditional home care agencies in {city} often charge around $55 per hour — our transparent
              pricing starts at just $30 per hour with no contracts or hidden fees.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              PSW Direct serves {city} and surrounding communities with vetted personal support workers who provide
              compassionate in-home support for seniors, individuals with disabilities, and anyone who needs assistance
              with daily activities. Book online in minutes and get matched with a qualified PSW near you.
            </p>
          </div>
        </section>

        {/* Services */}
        <section className="px-4 py-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            PSW Services Available in {city}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Personal Care & Senior Care</h3>
              <p className="text-sm text-muted-foreground">
                In-home personal support for seniors and individuals who need assistance with bathing, grooming,
                mobility, and daily living activities in {city}.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Companionship & In-Home Support</h3>
              <p className="text-sm text-muted-foreground">
                Friendly companionship and supervision for loved ones who need someone present for safety,
                social engagement, and emotional wellbeing.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Hospital Discharge Support</h3>
              <p className="text-sm text-muted-foreground">
                Safe transition from hospital to home with a qualified personal support worker who provides
                post-discharge care and recovery assistance.
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Doctor Escort Services</h3>
              <p className="text-sm text-muted-foreground">
                Accompaniment to doctor visits, specialist appointments, and medical procedures with reliable
                transportation support in {city}.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground mb-8">
              Transparent PSW Pricing in {city}
            </h2>
            <div className="flex flex-wrap justify-center gap-6">
              <div className="bg-card rounded-xl p-6 shadow-card border border-border flex-1 min-w-[220px]">
                <h3 className="font-semibold text-foreground text-lg">Home Care Visits</h3>
                <p className="text-primary text-3xl font-bold mt-2">$30</p>
                <p className="text-muted-foreground text-sm mt-1">per hour</p>
              </div>
              <div className="bg-card rounded-xl p-6 shadow-card border border-border flex-1 min-w-[220px]">
                <h3 className="font-semibold text-foreground text-lg">Doctor Escort Visits</h3>
                <p className="text-primary text-3xl font-bold mt-2">$35</p>
                <p className="text-muted-foreground text-sm mt-1">per hour</p>
              </div>
            </div>
            <div className="mt-8">
              <a href="https://psadirect.ca/">
                <Button size="lg" className="text-lg px-8 py-6">
                  Book a Personal Support Worker
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-sm opacity-80 mb-2">
              Proudly serving {city}, Toronto, the GTA, and communities across Ontario.
            </p>
            <p className="text-sm opacity-80 mb-4">
              Quality personal support care for Ontario families
            </p>
            <p className="text-xs opacity-60">
              © 2026 PSW Direct. All Rights Reserved. | PHIPA Compliant
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SEOCityLandingPage;
