import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Phone, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";
import { SEO_CITIES } from "@/lib/seoCityData";
import SEOInternalLinks from "@/components/seo/SEOInternalLinks";

const canonicalUrl = `${SITE_URL}/ontario-home-care`;
const title = "Ontario Home Care Services | PSW Direct";
const description =
  "Browse PSW Direct home care and personal support worker services across Ontario. Find your city and book care online.";

const OntarioHomeCareHubPage = () => (
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
          { name: "Ontario Home Care", url: canonicalUrl },
        ]))}
      </script>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
          url: canonicalUrl,
          publisher: {
            "@type": "Organization",
            name: "PSW Direct",
            url: SITE_URL,
          },
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
              <span className="text-sm font-semibold text-foreground tracking-wide">PSW Direct</span>
            </Link>
            <a
              href="tel:2492884787"
              className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">(249) 288-4787</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-12 md:py-16 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
          <MapPin className="w-4 h-4" />
          {SEO_CITIES.length}+ Cities Across Ontario
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
          Home Care Services Across Ontario
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          PSW Direct provides vetted personal support workers and home care services across Ontario.
          Whether you need companionship, personal care, dementia support, or post-surgery assistance,
          our city-specific pages help you find local availability and book care online — starting at
          $35/hr with no contracts and no agency markup.
        </p>
      </section>

      {/* City links grid */}
      <section className="bg-muted/50 px-4 py-12 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
            Find Home Care in Your City
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SEO_CITIES.map((city) => (
              <Link
                key={city.key}
                to={`/home-care-${city.key}`}
                className="bg-card rounded-lg p-3 text-center border border-border hover:border-primary hover:shadow-md transition-all text-sm font-medium text-foreground"
              >
                Home Care in {city.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About blurb for word count / SEO */}
      <section className="px-4 py-12 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-foreground mb-4 text-center">
          Why Families Choose PSW Direct
        </h2>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>
            Finding reliable home care in Ontario can be overwhelming. Traditional agencies charge
            $55 or more per hour, lock families into long-term contracts, and provide little
            transparency about which caregiver will arrive at your door. PSW Direct was built to
            change that by connecting families directly with qualified personal support workers at
            fair, transparent rates.
          </p>
          <p>
            Every PSW on our platform is individually vetted with a valid PSW certificate, government
            ID verification, and a recent police background check. We serve more than {SEO_CITIES.length}{" "}
            communities across Ontario — from Toronto and Mississauga to Kingston, Barrie, and
            Ottawa — ensuring that quality home care is accessible no matter where you live.
          </p>
          <p>
            Our services include personal care, mobility assistance, companionship, meal preparation,
            medication reminders, dementia and Alzheimer's care, overnight care, respite care, and
            post-surgery recovery support. You can book by the hour, choose your preferred schedule,
            and cancel anytime — no contracts, no hidden fees.
          </p>
        </div>
      </section>

      {/* Related links */}
      <section className="px-4 py-8 max-w-4xl mx-auto text-center border-t border-border">
        <h2 className="text-lg font-bold text-foreground mb-3">Related Pages</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/home-care-ontario" className="text-primary hover:underline text-sm">Home Care Ontario</Link>
          <Link to="/in-home-care-ontario" className="text-primary hover:underline text-sm">In-Home Care Ontario</Link>
          <Link to="/private-home-care" className="text-primary hover:underline text-sm">Private Home Care</Link>
          <Link to="/psw-directory" className="text-primary hover:underline text-sm">PSW Directory</Link>
          <Link to="/cities" className="text-primary hover:underline text-sm">All Cities</Link>
          <Link to="/guides" className="text-primary hover:underline text-sm">Care Guides</Link>
        </div>
      </section>

      <SEOInternalLinks compact />

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
            <span className="font-semibold">PSW Direct</span>
          </div>
          <p className="text-sm opacity-80 mb-2">
            Proudly serving {SEO_CITIES.length}+ communities across Ontario.
          </p>
          <p className="text-xs opacity-60">
            © {new Date().getFullYear()} PSW Direct. All Rights Reserved. | PHIPA Compliant
          </p>
        </div>
      </footer>
    </div>
  </>
);

export default OntarioHomeCareHubPage;
