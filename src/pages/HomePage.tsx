import { useState, useEffect } from "react";
import { GuestBookingFlow } from "@/components/client/GuestBookingFlow";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Heart, Users, UserCircle, Menu, X, Phone } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { fetchOfficeNumber, DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";

import logo from "@/assets/logo.png";
const HomePage = () => {
  const {
    isAuthenticated,
    user
  } = useSupabaseAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);

  // Fetch office number from database
  useEffect(() => {
    fetchOfficeNumber().then(setOfficeNumber);
  }, []);

  // If logged in as client, pass their info
  const clientInfo = isAuthenticated && user ? {
    name: user.email?.split("@")[0] || "",
    email: user.email || "",
    phone: ""
  } : null;
  const handleBack = () => {
    if (isAuthenticated) {
      navigate("/client");
    }
  };
  const handleClientPortalClick = () => {
    if (isAuthenticated) {
      navigate("/client");
    } else {
      navigate("/client-login");
    }
  };
  const scrollToAbout = () => {
    const aboutSection = document.getElementById("about-us");
    if (aboutSection) {
      aboutSection.scrollIntoView({
        behavior: "smooth"
      });
    }
    setMobileMenuOpen(false);
  };
  const scrollToBooking = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
    setMobileMenuOpen(false);
  };
  return <div className="min-h-screen bg-background">
      {/* Professional Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-32">
            {/* Logo - Left */}
            <Link to="/" className="flex-shrink-0 flex flex-col items-center">
              <img src={logo} alt="PSA Direct Logo" className="h-20 w-auto" />
              <span className="text-xs font-semibold text-foreground tracking-wide mt-1">Personal Support Worker Direct</span>
            </Link>

            {/* Navigation - Center (Desktop) */}
            <nav className="hidden md:flex items-center justify-center flex-1 gap-16 px-8">
              <button onClick={scrollToBooking} className="text-lg text-foreground font-medium hover:text-primary transition-colors whitespace-nowrap">
                Book Now
              </button>
              <button onClick={scrollToAbout} className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                About Us
              </button>
              <Link to="/faq" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                FAQ
              </Link>
              <Link to="/join-team" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                Join Our Team
              </Link>
              {isAuthenticated && user?.email === "tiffarshi@gmail.com" && <Link to="/admin" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                  Dashboard
                </Link>}
              <Link to="/psw-login" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                PSW Login
              </Link>
            </nav>

            {/* Right side - Client Portal & Mobile Menu */}
            <div className="flex items-center gap-4">
              <Button variant="outline" size="default" onClick={handleClientPortalClick} className="hidden sm:flex gap-2 text-base px-5 py-2">
                <UserCircle className="w-5 h-5" />
                Client Login
              </Button>
              
              {/* Mobile menu button */}
              <Button variant="ghost" size="icon" className="md:hidden h-14 w-14" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && <div className="md:hidden py-4 border-t border-border animate-fade-in">
              <nav className="flex flex-col gap-4">
                <button onClick={scrollToBooking} className="text-left text-foreground font-medium py-2">
                  Book Now
                </button>
                <button onClick={scrollToAbout} className="text-left text-muted-foreground py-2">
                  About Us
                </button>
                <Link to="/faq" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
                  FAQ
                </Link>
                <Link to="/join-team" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
                  Join Our Team
                </Link>
                {isAuthenticated && user?.email === "tiffarshi@gmail.com" && <Link to="/admin" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>}
                <Link to="/psw-login" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
                  PSW Login
                </Link>
                <Button variant="outline" onClick={() => {
              handleClientPortalClick();
              setMobileMenuOpen(false);
            }} className="gap-2 w-full justify-center">
                  <UserCircle className="w-4 h-4" />
                  {isAuthenticated ? "My Care" : "Client Portal"}
                </Button>
              </nav>
            </div>}
        </div>
      </header>

      {/* Call Banner */}
      <div className="text-center py-2 bg-muted/50 border-b border-border">
        <a href="tel:2492884787" className="inline-flex items-center gap-2 text-foreground font-semibold text-lg hover:text-primary transition-colors">
          <Phone className="w-5 h-5" />
          Call: (249) 288-4787 — 24/7 Support
        </a>
        <p className="text-primary font-bold text-base mt-1">Book a PSW in 1 Minute · Our PSWs are screened and credential verified before being approved on the platform.</p>
      </div>

      {/* Main Content - Booking Flow */}
      <main className="px-4 py-8 pb-4 max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Personal Support Worker Near Me or Near Someone Else – Book Online in 1 Minute
          </h1>
          <p className="text-muted-foreground text-base">
            On-Demand PSW Services Across Toronto &amp; Ontario – No Contracts. Hire by the Hour.
          </p>
        </div>
        
        <GuestBookingFlow onBack={handleBack} existingClient={clientInfo} />
      </main>

      {/* PSW on Demand Banner */}
      <div className="text-center px-4 py-6 bg-muted/50 border-y border-border">
        <h3 className="text-xl font-bold text-foreground">
          PSW on Demand · Book Online · NO Contract · Hire by the Hour · Pay/hr
        </h3>
      </div>

      {/* Pricing Overview */}
      <div className="text-center px-4 pt-8 pb-4 bg-background">
        <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
          <div className="bg-card rounded-xl p-5 shadow-card border border-border flex-1 min-w-[200px]">
            <h4 className="font-semibold text-foreground text-lg">Home Service</h4>
            <p className="text-primary text-2xl font-bold mt-1">from $30</p>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border flex-1 min-w-[200px]">
            <h4 className="font-semibold text-foreground text-lg">Doctor Escort</h4>
            <p className="text-primary text-2xl font-bold mt-1">from $35</p>
          </div>
          <div className="bg-card rounded-xl p-5 shadow-card border border-border flex-1 min-w-[200px]">
            <h4 className="font-semibold text-foreground text-lg">Hospital Discharge</h4>
            <p className="text-primary text-2xl font-bold mt-1">from $40</p>
          </div>
        </div>
      </div>

      {/* SEO Content Section */}
      <section className="bg-background px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Personal Support Workers Across Toronto, the GTA &amp; Ontario – Affordable Home Care Near You
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              PSA Direct is an on-demand personal support worker (PSW) platform connecting families with vetted caregivers across Toronto, the GTA, and Ontario. If you're searching for a "personal support worker near me" or "affordable home care," our platform makes booking simple with transparent rates starting at $30 per hour. Traditional Toronto home care agencies often charge around $55 per hour, so our model helps families access reliable care without agency overhead.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-3">
              GTA Service Areas (Toronto + Surrounding Cities)
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We serve Toronto, North York, Scarborough, Etobicoke, York, East York, Mississauga, Brampton, Vaughan, Markham, Richmond Hill, Oakville, Burlington, Ajax, Pickering, Oshawa, Aurora, and Newmarket. Families use PSA Direct for companionship, personal care support, mobility assistance, and doctor escort services—bookable online in minutes.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Major Ontario Cities We Serve
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              PSA Direct supports families across Ontario, including Hamilton, Kitchener, Waterloo, Cambridge, Guelph, London, Windsor, St. Catharines, Niagara Falls, Barrie, Kingston, Ottawa, Peterborough, Sudbury, Thunder Bay, and more. Availability depends on caregiver coverage in each area, and we continue expanding as more PSWs join the platform.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Common Reasons Families Book a PSW
            </h3>
            <ul className="text-muted-foreground space-y-2 list-disc list-inside leading-relaxed">
              <li>In-home senior support and companionship</li>
              <li>Personal care assistance and mobility support</li>
              <li>Hospital discharge and recovery support</li>
              <li>Doctor escort and appointment accompaniment</li>
              <li>Short-term help for family caregivers needing relief</li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-muted-foreground leading-relaxed font-medium">
              Book an affordable personal support worker near you today. PSA Direct offers transparent pricing, flexible scheduling, and vetted caregivers across Toronto, the GTA, and Ontario.
            </p>
          </div>
        </div>
      </section>

      {/* Service Areas */}
      <div className="text-center px-4 pt-8 pb-4 bg-background">
        <h3 className="text-xl font-bold text-foreground mb-3">
          We Have Personal Support Workers In:
        </h3>
        <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Toronto, Brampton, Mississauga, Hamilton, Ottawa, London, Kitchener, Windsor, Oshawa, Barrie, St. Catharines, Cambridge, Guelph, Thunder Bay, Sudbury, Kingston, Niagara Falls, Peterborough, Brantford, Sarnia, Belleville, North Bay, Welland, Cornwall, Woodstock, Orillia, Stratford, Orangeville, Midland &amp; more across Ontario.
        </p>
      </div>

      {/* Logo Divider */}
      <div className="flex justify-center pb-12 bg-background">
        <div className="p-8 rounded-2xl bg-[hsl(220,30%,95%)] border border-[hsl(220,40%,85%)]">
          <img src={logo} alt="PSA Direct Logo" className="h-56 w-auto" />
        </div>
      </div>

      {/* About Us Section */}
      <section id="about-us" className="bg-muted/50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              About PSW Direct
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We began with a simple mission: to provide premium, safe, and compassionate care 
              that keeps our loved ones where they belong—at home.
            </p>
          </div>

          {/* Mission Statement */}
          <div className="bg-card rounded-2xl p-8 shadow-card mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary" />
              Our Mission
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Based in Toronto, we are redefining home care by combining top-tier professional 
              vetting with easy-to-use technology. As we expand across Ontario, our commitment 
              remains the same: high-quality care, total transparency, and peace of mind for 
              every family. Whether you need companionship, personal care, or assistance with 
              medical appointments, we're here to help.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Vetted & Verified PSWs</h4>
              <p className="text-sm text-muted-foreground">
                All Personal Support Workers (PSWs) are screened and credential verified before being approved on the platform. Book trusted PSWs near you with confidence across Toronto and Ontario.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Book a PSW in Minutes</h4>
              <p className="text-sm text-muted-foreground">
                Choose your service, select your location, and confirm care quickly. No long-term contracts. No agency delays. On-demand PSW services across Toronto and Ontario.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Transparent & Affordable Pricing</h4>
              <p className="text-sm text-muted-foreground">
                Traditional Toronto home care agencies often charge around $55 per hour. PSA Direct PSW services start at $30 per hour, with doctor escort visits from $35.
              </p>
            </div>
          </div>

          {/* Service Area */}
          <div className="mt-8 p-6 bg-card rounded-xl shadow-card text-center">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Proudly serving Toronto & the GTA,</strong>{" "}
              with expansion underway across Ontario.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="PSA Direct Logo" className="h-8 w-auto" />
            <span className="font-semibold">PSA Direct</span>
          </div>
          <p className="text-sm opacity-80 mb-2">
            Proudly serving Toronto & the GTA, with expansion underway across Ontario.
          </p>
          <p className="text-sm opacity-80 mb-4">
            Quality personal support care for Ontario families
          </p>
          <p className="text-xs opacity-60 mb-4">
            © 2026 PSA Direct. All Rights Reserved. | PHIPA Compliant
          </p>
          {/* Subtle PSA Login link */}
          <p className="text-xs opacity-50">
            <Link to="/psw-login" className="hover:opacity-80 hover:underline">
              Caregiver Login
            </Link>
          </p>
        </div>
      </footer>
    </div>;
};
export default HomePage;