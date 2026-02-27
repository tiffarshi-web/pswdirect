import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Menu, X, UserCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { fetchOfficeNumber, DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import logo from "@/assets/logo.png";
import { Helmet } from "react-helmet-async";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does home care cost in Toronto and the GTA?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Traditional Toronto home care agencies often charge around $55 per hour, though rates vary depending on care level and provider. PSA Direct home care starts at $30 per hour. Doctor escort services start at $35. PSA Direct's platform model reduces traditional agency overhead, allowing more affordable pricing. Rates vary by provider, care complexity, and service type."
      }
    },
    {
      "@type": "Question",
      "name": "Is a Personal Support Worker covered by OHIP?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "OHIP covers medically necessary services provided by physicians and hospitals. However, OHIP does not cover private personal support worker services. Families requiring ongoing home care typically use private-pay options or extended health insurance to fund PSW care."
      }
    },
    {
      "@type": "Question",
      "name": "Can insurance help pay for home care services?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Extended health benefits through employer plans may cover some home care costs. Long-term care insurance policies and disability policies can also help offset the expense of in-home caregiving in Ontario."
      }
    },
    {
      "@type": "Question",
      "name": "Should families update their will when planning long-term care?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. When planning long-term care, families should review their estate plans including wills, power of attorney documents, health directives, and asset planning to ensure everything is current and reflects care needs."
      }
    },
    {
      "@type": "Question",
      "name": "What does a Personal Support Worker do during a home visit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "A Personal Support Worker assists with personal hygiene, companionship, medication reminders, dementia support, mobility assistance, and doctor escort services during home visits."
      }
    },
    {
      "@type": "Question",
      "name": "What areas in Ontario do you serve?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "PSA Direct provides home care services across Ontario including Toronto, North York, Scarborough, Etobicoke, Mississauga, Brampton, Vaughan, Richmond Hill, Markham, Ajax, Pickering, Oshawa, Oakville, Hamilton, Aurora, Newmarket and surrounding Ontario regions."
      }
    }
  ]
};

const FAQ = () => {
  const { isAuthenticated, user } = useSupabaseAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);

  useEffect(() => {
    fetchOfficeNumber().then(setOfficeNumber);
  }, []);

  const handleClientPortalClick = () => {
    navigate(isAuthenticated ? "/client" : "/client-login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Home Care & Personal Support Worker FAQ | Toronto, GTA & Ontario | PSA Direct</title>
        <meta name="description" content="Learn about Toronto home care costs, PSW hourly rates, insurance coverage, doctor escort services, and affordable caregiver options across the GTA and Ontario. Home care starting at $30/hour." />
        <link rel="canonical" href="https://psadirect.ca/faq" />
        <meta property="og:title" content="Home Care & Personal Support Worker FAQ | Toronto, GTA & Ontario | PSA Direct" />
        <meta property="og:description" content="Learn about Toronto home care costs, PSW hourly rates, insurance coverage, doctor escort services, and affordable caregiver options across the GTA and Ontario. Home care starting at $30/hour." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://psadirect.ca/faq" />
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-32">
            <Link to="/" className="flex-shrink-0">
              <img src={logo} alt="PSA Direct Logo" className="h-28 w-auto" />
            </Link>

            <nav className="hidden md:flex items-center justify-center flex-1 gap-16 px-8">
              <Link to="/" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                Book Now
              </Link>
              <Link to="/faq" className="text-lg text-foreground font-medium transition-colors whitespace-nowrap">
                FAQ
              </Link>
              <Link to="/join-team" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                Join Our Team
              </Link>
              <Link to="/psw-login" className="text-lg text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                PSW Login
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Button variant="outline" size="lg" onClick={handleClientPortalClick} className="gap-3 hidden sm:flex text-lg px-6 py-6 flex-col h-auto bg-[hsl(220,30%,95%)] text-[hsl(220,60%,25%)] border-[hsl(220,40%,85%)] hover:bg-[hsl(220,30%,90%)]">
                <img src={logo} alt="PSA Direct" className="h-10 w-auto" />
                <div className="flex items-center gap-2 font-semibold">
                  {isAuthenticated ? "My Care" : "Client Portal"}
                </div>
                <span className="text-sm text-[hsl(220,40%,40%)]">Client Login</span>
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden h-14 w-14" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-fade-in">
              <nav className="flex flex-col gap-4">
                <Link to="/" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Book Now</Link>
                <Link to="/faq" className="text-foreground font-medium py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
                <Link to="/join-team" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Join Our Team</Link>
                <Link to="/psw-login" className="text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>PSW Login</Link>
                <Button variant="outline" onClick={() => { handleClientPortalClick(); setMobileMenuOpen(false); }} className="gap-2 w-full justify-center">
                  <UserCircle className="w-4 h-4" />
                  {isAuthenticated ? "My Care" : "Client Portal"}
                </Button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Call Banner */}
      <div className="text-center py-2 bg-muted/50 border-b border-border">
        <a href="tel:2492884787" className="inline-flex items-center gap-2 text-foreground font-semibold text-lg hover:text-primary transition-colors">
          <Phone className="w-5 h-5" />
          Call: (249) 288-4787 — 24/7 Support
        </a>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
          Home Care & Personal Support Worker FAQ – Toronto & Ontario
        </h1>

        {/* Intro Section */}
        <div className="prose prose-lg max-w-none mb-12">
          <p className="text-muted-foreground leading-relaxed">
            Finding reliable and affordable home care in Toronto can be overwhelming. Whether you're searching for a 
            personal support worker near me, exploring affordable home care in the GTA, or looking to book a PSW online 
            in Ontario, PSA Direct makes it simple. Our platform connects families with vetted, compassionate caregivers 
            who provide in-home personal support, companionship, mobility assistance, and doctor escort services in Toronto 
            and beyond.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We proudly serve families across Toronto, North York, Scarborough, Etobicoke, Mississauga, Brampton, Vaughan, 
            Richmond Hill, Markham, Ajax, Pickering, Oshawa, Oakville, Hamilton, and surrounding Ontario cities. Our 
            coverage continues to expand as more verified caregivers join our network across the province.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Toronto home care agencies typically charge around $55 per hour, though rates vary by provider and care 
            complexity. PSA Direct home care starts at just $30 per hour, and doctor escort services start at $35. Our 
            technology-driven platform eliminates traditional agency overhead, passing those savings directly to families.
          </p>
          <p className="text-foreground font-semibold text-lg">
            Book an affordable Personal Support Worker near you today.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="space-y-8">
          {/* Q1 */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              How much does home care cost in Toronto and the GTA?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Traditional Toronto home care agencies often charge around $55 per hour for personal support worker services. 
              However, the Toronto home care cost varies depending on the level of care required, the provider, and 
              service type. PSW hourly rates in Toronto can range significantly between agencies.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PSA Direct offers affordable home care in Toronto starting at $30 per hour. Doctor escort services start at 
              $35. Our platform model connects clients directly with verified caregivers, reducing the overhead costs 
              associated with traditional agencies and passing those savings on to families across Ontario.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The personal support worker cost in Ontario depends on factors including care complexity, scheduling 
              requirements, and geographic location. PSA Direct's transparent pricing ensures families know exactly 
              what they'll pay.
            </p>
            <p className="text-sm text-muted-foreground italic mb-4">
              Rates vary by provider, care complexity, and service type.
            </p>
            <p className="text-foreground font-semibold">
              Book an affordable Personal Support Worker near you today.
            </p>
          </section>

          {/* Q2 */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Is a Personal Support Worker covered by OHIP?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              OHIP (Ontario Health Insurance Plan) covers medically necessary services delivered by physicians, hospitals, 
              and certain allied health professionals. Some government-funded home care programs through Ontario Health 
              atHome may provide limited PSW hours at no cost, but waitlists can be lengthy and hours are often insufficient 
              for families who need consistent daily support.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Private personal support worker services are generally not covered by OHIP. Families requiring reliable, 
              ongoing Ontario home care coverage often turn to private-pay options to supplement government-funded care 
              or to access care immediately without waiting.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              For long-term planning, families should explore extended health insurance, long-term care insurance policies, 
              and tax credits such as the Medical Expense Tax Credit and the Canada Caregiver Credit, which may help 
              offset some costs of private home care.
            </p>
          </section>

          {/* Q3 */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Can insurance help pay for home care services?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Yes—home care insurance in Ontario can significantly reduce out-of-pocket costs. Many employer-sponsored 
              extended health benefit plans include coverage for caregiver insurance in Toronto and the GTA, which may 
              reimburse a portion of personal support worker fees.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Long-term care insurance policies are specifically designed to cover extended caregiving needs, including 
              in-home support. Disability insurance policies may also provide benefits that can be applied toward home 
              care costs, depending on the terms of your coverage.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We recommend speaking with a licensed insurance advisor to understand your options. For professional 
              guidance on insurance and financial planning for home care, visit{" "}
              <a
                href="https://local.cooperators.ca/chazz-financial-en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Cooperators – Chazz Financial
              </a>.
            </p>
          </section>

          {/* Q4 */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              Should families update their will when planning long-term care?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Absolutely. When planning for long-term care, reviewing your estate planning documents is essential. Wills 
              in Ontario should be updated to reflect any changes in care needs, living arrangements, or financial 
              obligations related to caregiving.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Families should also ensure they have a current Power of Attorney for both property and personal care, 
              as well as up-to-date health directives. Estate planning in Toronto should account for potential long-term 
              care costs and asset protection strategies.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
            For affordable and accessible will preparation, visit{" "}
              <a
                href="https://www.formalwill.ca/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                FormalWill.ca
              </a>. For compassionate estate planning support, contact{" "}
              <a
                href="https://aryasher.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              >
                Ary Asher
              </a>.
            </p>
          </section>

          {/* Q5 */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              What does a Personal Support Worker do during a home visit?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A Personal Support Worker provides a wide range of non-medical in-home care services. During a typical 
              home visit, an in-home caregiver in Toronto may assist with personal hygiene tasks such as bathing, 
              grooming, and dressing.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              PSWs also provide companionship, helping to reduce feelings of isolation and loneliness—especially 
              important for seniors living alone. They offer medication reminders to help clients stay on schedule with 
              prescribed treatments, and provide specialized dementia support for those living with Alzheimer's or 
              other cognitive conditions.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Mobility assistance is another core service, helping clients move safely around their home or during 
              outings. PSWs also provide doctor escort support, accompanying clients to medical appointments and 
              ensuring they arrive safely and on time.
            </p>
          </section>

          {/* Q6 */}
          <section className="bg-card rounded-2xl p-6 md:p-8 shadow-card border border-border">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
              What areas in Ontario do you serve?
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              PSA Direct provides home care services across Ontario. Our verified personal support workers are available 
              throughout Toronto, North York, Scarborough, Etobicoke, Mississauga, Brampton, Vaughan, Richmond Hill, 
              Markham, Ajax, Pickering, Oshawa, Oakville, Hamilton, Aurora, Newmarket, and surrounding Ontario regions. 
              Our network continues to grow as more qualified caregivers join the platform, expanding coverage to 
              communities across the province.
            </p>
          </section>
        </div>

        {/* Bottom CTA */}
        <section className="mt-16 text-center bg-card rounded-2xl p-8 md:p-12 shadow-card border border-border">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            Need Affordable Home Care in Toronto or the GTA?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" onClick={() => navigate("/")} className="text-lg">
              Book a PSW Now
            </Button>
            <Button size="xl" variant="outline" onClick={() => navigate("/join-team")} className="text-lg">
              Apply to Join Our PSW Team
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 px-4 mt-16">
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
          <p className="text-xs opacity-50">
            <Link to="/psw-login" className="hover:opacity-80 hover:underline">
              Caregiver Login
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FAQ;
