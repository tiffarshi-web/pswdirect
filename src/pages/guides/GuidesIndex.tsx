import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Phone, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

const guides = [
  {
    slug: "how-to-hire-a-personal-support-worker",
    title: "How to Hire a Personal Support Worker",
    description: "A step-by-step guide to finding, vetting, and hiring a qualified PSW for your family in Ontario.",
  },
  {
    slug: "cost-of-home-care-ontario",
    title: "Cost of Home Care in Ontario",
    description: "Understand what home care costs in Ontario, what affects pricing, and how to find affordable options.",
  },
  {
    slug: "hospital-discharge-checklist",
    title: "Hospital Discharge Checklist",
    description: "Everything families need to prepare before bringing a loved one home from the hospital.",
  },
  {
    slug: "signs-your-parent-needs-home-care",
    title: "Signs Your Parent Needs Home Care",
    description: "How to recognize when a parent or aging loved one may benefit from professional in-home support.",
  },
  {
    slug: "psw-vs-nurse-difference",
    title: "PSW vs Nurse: What's the Difference?",
    description: "Understand the roles, training, and scope of practice that separate PSWs from registered nurses.",
  },
];

const GuidesIndex = () => (
  <>
    <Helmet>
      <title>Home Care Guides | PSW Direct</title>
      <meta name="description" content="Free guides on hiring a PSW, home care costs in Ontario, hospital discharge planning, and more. Expert advice from PSW Direct." />
      <link rel="canonical" href="https://psadirect.ca/guides" />
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

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Home Care Guides</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Free resources to help Ontario families navigate home care decisions with confidence.
        </p>

        <div className="space-y-4">
          {guides.map((g) => (
            <Link
              key={g.slug}
              to={`/guides/${g.slug}`}
              className="block bg-card rounded-xl p-6 shadow-card border border-border hover:border-primary/40 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2">{g.title}</h2>
                  <p className="text-muted-foreground text-sm">{g.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </main>

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

export default GuidesIndex;
