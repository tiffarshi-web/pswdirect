import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_URL, buildBreadcrumbList } from "@/lib/seoUtils";

interface QuestionSEOPageProps {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  city?: string;
  content: string;
}

const QuestionSEOPage = ({ slug, title, h1, metaDescription, city, content }: QuestionSEOPageProps) => {
  const canonicalUrl = `${SITE_URL}/${slug}`;

  const breadcrumbs = [
    { name: "Home", url: SITE_URL },
    ...(city ? [{ name: `PSW ${city}`, url: `${SITE_URL}/psw-${city.toLowerCase().replace(/\s+/g, "-")}` }] : []),
    { name: h1, url: canonicalUrl },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: h1,
        acceptedAnswer: {
          "@type": "Answer",
          text: content.substring(0, 500),
        },
      },
    ],
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [buildBreadcrumbList(breadcrumbs), faqSchema],
  };

  // Convert markdown-like content to HTML paragraphs
  const renderContent = () => {
    const sections = content.split("\n\n");
    return sections.map((section, i) => {
      const trimmed = section.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return (
          <h2 key={i} className="text-xl font-bold text-foreground mt-8 mb-3">
            {trimmed.replace(/\*\*/g, "")}
          </h2>
        );
      }

      if (trimmed.startsWith("- ")) {
        const items = trimmed.split("\n").filter((l) => l.startsWith("- "));
        return (
          <ul key={i} className="list-disc list-inside space-y-1 text-muted-foreground mb-4">
            {items.map((item, j) => {
              const text = item.replace(/^- /, "");
              // Handle bold within list items
              const parts = text.split(/\*\*(.*?)\*\*/);
              return (
                <li key={j}>
                  {parts.map((part, k) =>
                    k % 2 === 1 ? (
                      <strong key={k} className="text-foreground">{part}</strong>
                    ) : (
                      <span key={k}>{part}</span>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        );
      }

      // Regular paragraph with bold handling
      const parts = trimmed.split(/\*\*(.*?)\*\*/);
      return (
        <p key={i} className="text-muted-foreground mb-4 leading-relaxed">
          {parts.map((part, k) =>
            k % 2 === 1 ? (
              <strong key={k} className="text-foreground">{part}</strong>
            ) : (
              <span key={k}>{part}</span>
            )
          )}
        </p>
      );
    });
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/lovable-uploads/a6e05da5-a71c-4e12-8d31-63ac338a2a17.png" alt="PSW Direct" className="h-8" />
              <span className="font-bold text-lg text-foreground">PSW Direct</span>
            </Link>
            <Link to="/">
              <Button variant="default" size="sm">
                Book a PSW <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Breadcrumb */}
        <nav className="max-w-4xl mx-auto px-4 py-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            {city && (
              <>
                <li>/</li>
                <li>
                  <Link to={`/psw-${city.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-foreground">
                    PSW {city}
                  </Link>
                </li>
              </>
            )}
            <li>/</li>
            <li className="text-foreground font-medium truncate max-w-[200px]">{h1}</li>
          </ol>
        </nav>

        {/* Content */}
        <article className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">{h1}</h1>
          <div className="prose prose-lg max-w-none">{renderContent()}</div>

          {/* Internal links cluster */}
          <div className="mt-10 pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-3">Related Resources</h2>
            <div className="flex flex-wrap gap-2">
              <Link to="/ontario-psw-locations" className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">All Ontario Locations</Link>
              {city && <Link to={`/psw-${city.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">PSWs in {city}</Link>}
              <Link to="/home-care-ontario" className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">Home Care Ontario</Link>
              <Link to="/coverage" className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">Coverage Map</Link>
              <Link to="/guides" className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">Home Care Guides</Link>
              <Link to="/psw-directory" className="text-sm text-primary hover:underline bg-muted px-3 py-1 rounded-full">PSW Directory</Link>
            </div>
          </div>
        </article>

        {/* CTA */}
        <section className="bg-primary/5 py-10">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Ready to Book a PSW{city ? ` in ${city}` : ""}?
            </h2>
            <p className="text-muted-foreground mb-6">
              Get matched with a vetted Personal Support Worker today. No contracts, no commitments.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/">
                <Button size="lg">Book Care Now <ArrowRight className="ml-2 w-5 h-5" /></Button>
              </Link>
              <Link to="/coverage">
                <Button size="lg" variant="outline">View Coverage Map</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-card py-6">
          <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} PSW Direct — Personal Support Workers across Ontario
          </div>
        </footer>
      </div>
    </>
  );
};

export default QuestionSEOPage;
