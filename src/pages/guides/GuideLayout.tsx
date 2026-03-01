import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

interface GuideLayoutProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  children: React.ReactNode;
}

const GuideLayout = ({ title, metaTitle, metaDescription, slug, children }: GuideLayoutProps) => {
  const canonicalUrl = `https://psadirect.ca/guides/${slug}`;

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
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
              <a href="tel:2492884787" className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">(249) 288-4787</span>
              </a>
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <Link to="/guides" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Guides
          </Link>
        </div>

        {/* Article Content */}
        <article className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">{title}</h1>
          <div className="prose prose-slate max-w-none space-y-8 text-muted-foreground leading-relaxed">
            {children}
          </div>

          {/* Find PSWs Near You */}
          <div className="mt-12 border-t border-border pt-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Find Personal Support Workers Near You</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Toronto", path: "/psw-toronto" },
                { label: "Mississauga", path: "/psw-mississauga" },
                { label: "Brampton", path: "/psw-brampton" },
                { label: "Hamilton", path: "/psw-hamilton" },
                { label: "Ottawa", path: "/psw-ottawa" },
              ].map(({ label, path }) => (
                <Link key={path} to={path} className="text-primary font-medium hover:underline text-sm">
                  PSWs in {label} →
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-12 p-8 bg-muted/50 rounded-2xl border border-border text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Book a PSW?</h2>
            <p className="text-muted-foreground mb-6">
              PSW Direct connects families with vetted personal support workers across Toronto, the GTA and Ontario. Book online in minutes.
            </p>
            <a href="https://psadirect.ca/">
              <Button size="lg" className="text-lg px-8 py-6">
                Book a Personal Support Worker
              </Button>
            </a>
          </div>
        </article>

        {/* Footer */}
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
};

export default GuideLayout;
