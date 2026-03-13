import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, DollarSign, CheckCircle, TrendingDown } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const canonicalUrl = `${SITE_URL}/psw-cost`;
const title = "PSW Cost in Ontario 2025 | Home Care Pricing | PSW Direct";
const description =
  "How much does a Personal Support Worker cost in Ontario? Compare PSW rates, understand pricing factors, and see how PSW Direct offers care from $30/hour.";

const PSWCostPage = () => (
  <>
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="article" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script type="application/ld+json">
        {JSON.stringify(buildBreadcrumbList([
          { name: "Home", url: SITE_URL },
          { name: "PSW Cost", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How much does a PSW cost per hour in Ontario?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "PSW rates in Ontario typically range from $25 to $55 per hour depending on the provider. Traditional home care agencies charge $40–$55/hr. PSW Direct offers personal support worker services starting at $30/hr by connecting families directly with verified PSWs.",
              },
            },
            {
              "@type": "Question",
              name: "Why is PSW Direct more affordable than agencies?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "PSW Direct operates as a direct-matching platform rather than a traditional staffing agency. This reduces overhead costs like office space, middle management, and administrative fees — savings that are passed directly to families.",
              },
            },
            {
              "@type": "Question",
              name: "Are there extra fees for same-day or weekend PSW care?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "PSW Direct may apply a small surge fee during peak demand periods such as same-day ASAP requests. Standard scheduled bookings are billed at the posted hourly rate with no hidden fees.",
              },
            },
          ],
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
          <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
            How Much Does a PSW Cost in Ontario?
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Understand home care pricing, compare agency vs. direct rates, and learn how PSW Direct keeps costs lower — starting at <strong className="text-foreground">$30/hour</strong>.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 text-center">
            PSW Cost Comparison
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted">
                  <th className="px-6 py-4 text-sm font-semibold text-foreground">Provider Type</th>
                  <th className="px-6 py-4 text-sm font-semibold text-foreground">Hourly Rate</th>
                  <th className="px-6 py-4 text-sm font-semibold text-foreground hidden sm:table-cell">Vetting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-primary/5">
                  <td className="px-6 py-4 font-medium text-foreground">PSW Direct</td>
                  <td className="px-6 py-4 text-primary font-bold">From $30/hr</td>
                  <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">ID + Cert + Police Check</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-foreground">Traditional Agency</td>
                  <td className="px-6 py-4 text-muted-foreground">$40 – $55/hr</td>
                  <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">Varies</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-foreground">Private Hire (Kijiji, etc.)</td>
                  <td className="px-6 py-4 text-muted-foreground">$20 – $35/hr</td>
                  <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">None / Self-reported</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium text-foreground">Government (LHIN/OHIP)</td>
                  <td className="px-6 py-4 text-muted-foreground">Free (waitlisted)</td>
                  <td className="px-6 py-4 text-muted-foreground hidden sm:table-cell">Government screened</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What Affects Cost */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-8 text-center">
            What Affects PSW Pricing?
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { title: "Service Type", desc: "Personal care, companionship, doctor escorts, and hospital discharge each carry different rates based on complexity." },
              { title: "Location", desc: "Downtown Toronto rates may include a small urban surcharge. Rural areas may have limited availability." },
              { title: "Time of Day", desc: "Evening, overnight, and weekend shifts may be priced slightly higher due to demand." },
              { title: "Duration", desc: "Longer bookings (4+ hours) are generally more cost-effective per hour than short visits." },
            ].map(({ title: t, desc }) => (
              <div key={t} className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold text-foreground mb-2">{t}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why PSW Direct */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <TrendingDown className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">
            Why PSW Direct Costs Less
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 text-left">
            {[
              "No agency markup — you pay the caregiver rate directly",
              "No sign-up fees or monthly subscriptions",
              "Transparent pricing — see costs before you book",
              "Verified PSWs — no compromise on safety",
              "Same-day ASAP booking available",
              "No minimum contract — book as needed",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-primary text-primary-foreground text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-3">Ready to Book Affordable Home Care?</h2>
          <p className="mb-6 opacity-90">Verified PSWs from $30/hour — no agency fees, no hidden costs.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/client-login">
              <Button variant="secondary" size="lg">Get Started</Button>
            </Link>
            <Link to="/psw-pay-calculator">
              <Button variant="outline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                PSW Pay Calculator
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  </>
);

export default PSWCostPage;
