import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, DollarSign, Building2, UserCheck, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const canonicalUrl = `${SITE_URL}/psw-agency-vs-private-pay`;
const title = "PSW Agency vs Private Pay | Compare Earnings | PSW Direct";
const description = "Compare PSW agency pay vs private marketplace pay in Ontario. Learn how much more you can earn working independently with PSW Direct.";

const PSWAgencyVsPrivatePayPage = () => {
  const comparisons = [
    { category: "Hourly Pay", agency: "$18–$22/hr", private: "$22–$28/hr" },
    { category: "Scheduling", agency: "Set by agency", private: "You choose your hours" },
    { category: "Contracts", agency: "Often required", private: "No contracts" },
    { category: "Client Choice", agency: "Assigned by agency", private: "You claim preferred shifts" },
    { category: "Payouts", agency: "Bi-weekly or monthly", private: "Weekly (every Thursday)" },
    { category: "Overhead Fees", agency: "Agency takes 30–50%", private: "Transparent platform fee" },
  ];

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
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">
          {JSON.stringify(buildBreadcrumbList([
            { name: "Home", url: SITE_URL },
            { name: "Agency vs Private Pay", url: canonicalUrl },
          ]))}
        </script>
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
            <DollarSign className="w-4 h-4" />
            Pay Comparison
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            PSW Agency vs Private Pay
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Traditional home care agencies take 30–50% of what clients pay. Private marketplace platforms like PSW Direct
            pass more of that value to the workers — meaning higher hourly pay, more flexibility, and fewer restrictions.
          </p>
        </section>

        {/* Comparison Table */}
        <section className="px-4 pb-12 max-w-3xl mx-auto">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-muted/50 p-4 border-b border-border">
              <div className="font-semibold text-foreground text-sm"></div>
              <div className="font-semibold text-foreground text-sm text-center flex items-center justify-center gap-2">
                <Building2 className="w-4 h-4" /> Agency
              </div>
              <div className="font-semibold text-primary text-sm text-center flex items-center justify-center gap-2">
                <UserCheck className="w-4 h-4" /> PSW Direct
              </div>
            </div>
            {comparisons.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 p-4 ${i < comparisons.length - 1 ? "border-b border-border" : ""}`}>
                <div className="font-medium text-foreground text-sm">{row.category}</div>
                <div className="text-muted-foreground text-sm text-center">{row.agency}</div>
                <div className="text-primary font-medium text-sm text-center">{row.private}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-foreground text-center">How Private PSW Work Pays More</h2>
            <p className="text-muted-foreground leading-relaxed">
              When a family pays $55/hr to a traditional agency, the PSW typically receives $18–$22/hr. The agency keeps the
              rest for overhead, management, and profit. With PSW Direct, families pay $30–$35/hr and workers earn $22–$28/hr
              — a better deal for both sides.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Private marketplace platforms eliminate the middleman. You work directly with clients, choose your own hours,
              and keep more of what you earn. There are no long-term contracts, no shift assignments you can't refuse, and
              no agency politics.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Earn More?</h2>
          <p className="text-muted-foreground mb-6">Join PSW Direct and start earning $22–$28/hr with flexible scheduling.</p>
          <Link to="/join-team">
            <Button size="lg" className="text-lg px-8 py-6 gap-2">
              Apply Now <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </section>

        <section className="px-4 py-8 max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/psw-pay-calculator" className="text-primary hover:underline text-sm">Pay Calculator</Link>
            <Link to="/psw-work-areas-ontario" className="text-primary hover:underline text-sm">Work Areas</Link>
            <Link to="/private-psw-jobs" className="text-primary hover:underline text-sm">Private PSW Jobs</Link>
            <Link to="/psw-jobs-toronto" className="text-primary hover:underline text-sm">PSW Jobs Toronto</Link>
          </div>
        </section>

        <footer className="bg-secondary text-secondary-foreground py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
              <span className="font-semibold">PSW Direct</span>
            </div>
            <p className="text-xs opacity-60">© 2026 PSW Direct. All Rights Reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PSWAgencyVsPrivatePayPage;
