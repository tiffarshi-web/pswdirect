import { useState, useEffect } from "react";
import { GuestBookingFlow } from "@/components/client/GuestBookingFlow";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Heart, Users, UserCircle, Menu, X, Phone, Download } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { fetchOfficeNumber, DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";
import { PSWAppAccessDialog } from "@/components/psw/PSWAppAccessDialog";

import logo from "@/assets/logo.png";
const HomePage = () => {
  const {
    isAuthenticated,
    user
  } = useSupabaseAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);
  const [pswAccessOpen, setPswAccessOpen] = useState(false);

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
            <Link to="/" className="flex-shrink-0">
              <img src={logo} alt="PSA Direct Logo" className="h-28 w-auto" />
            </Link>

            {/* Navigation - Center (Desktop) */}
            <nav className="hidden md:flex items-center justify-center flex-1 gap-10 px-8">
              {isAuthenticated && user?.email === "tiffarshi@gmail.com" && <Link to="/admin" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                  Dashboard
                </Link>}
              <Link to="/join-team" className="text-lg font-semibold border-2 border-primary rounded-lg px-5 py-2 text-primary hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap">
                Join Our Team
              </Link>
            </nav>

            {/* Right side - Download App & Client Portal & Mobile Menu */}
            <div className="flex items-stretch gap-4">
              <Button variant="outline" size="lg" onClick={() => setPswAccessOpen(true)} className="gap-3 hidden sm:flex text-lg px-6 py-6 flex-col h-auto bg-white text-[hsl(220,60%,45%)] border-[hsl(220,40%,80%)] hover:bg-[hsl(220,30%,97%)]">
                <Download className="h-8 w-8 text-[hsl(220,60%,45%)]" />
                <div className="flex items-center gap-2 font-semibold">
                  Download App
                </div>
                <span className="text-sm text-[hsl(220,40%,55%)]">PSW Access</span>
                <img src={logo} alt="PSA Direct" className="h-10 w-auto mt-1" />
              </Button>
              <Button variant="outline" size="lg" onClick={handleClientPortalClick} className="gap-3 hidden sm:flex text-lg px-6 py-6 flex-col h-auto bg-[hsl(220,30%,95%)] text-[hsl(220,60%,25%)] border-[hsl(220,40%,85%)] hover:bg-[hsl(220,30%,90%)]">
                <img src={logo} alt="PSA Direct" className="h-10 w-auto" />
                <div className="flex items-center gap-2 font-semibold">
                  {isAuthenticated ? "My Care" : "Client Portal"}
                </div>
                <span className="text-sm text-[hsl(220,40%,40%)]">Client Login</span>
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
                {isAuthenticated && user?.email === "tiffarshi@gmail.com" && <Link to="/admin" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>}
                <Link to="/join-team" className="font-semibold text-primary py-2" onClick={() => setMobileMenuOpen(false)}>
                  Join Our Team
                </Link>
                <button onClick={() => { setPswAccessOpen(true); setMobileMenuOpen(false); }} className="text-left text-muted-foreground py-2">
                  Download App
                </button>
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

      {/* Main Content - Booking Flow */}
      <main className="px-4 pt-14 pb-4 max-w-3xl mx-auto">
        <GuestBookingFlow onBack={handleBack} existingClient={clientInfo} />
      </main>

      {/* PSW App Access Dialog */}
      <PSWAppAccessDialog open={pswAccessOpen} onOpenChange={setPswAccessOpen} />

      {/* Logo Divider */}
      <div className="flex justify-center -mt-2 pb-12 bg-background">
        <div className="p-8 rounded-2xl bg-[hsl(220,30%,95%)] border border-[hsl(220,40%,85%)]">
          <img src={logo} alt="PSA Direct Logo" className="h-56 w-auto" />
        </div>
      </div>

      {/* About Us Section */}
      <section id="about-us" className="bg-muted/50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              About PSA Direct
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
              <h4 className="font-semibold text-foreground mb-2">Verified & Certified</h4>
              <p className="text-sm text-muted-foreground">
                All our PSAs undergo thorough background checks, credential verification, 
                and are registered with HSCPOA.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">24/7 Care Coordination</h4>
              <p className="text-sm text-muted-foreground">
                Our team is available around the clock to match you with the right 
                caregiver and handle any scheduling needs.
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 shadow-card">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Personalized Matching</h4>
              <p className="text-sm text-muted-foreground">
                We match caregivers based on language preferences, experience, 
                and specific care requirements.
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
            <button onClick={() => setPswAccessOpen(true)} className="hover:opacity-80 hover:underline">
              Caregiver Login
            </button>
          </p>
        </div>
      </footer>
    </div>;
};
export default HomePage;