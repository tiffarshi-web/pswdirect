import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Phone, Calculator, DollarSign } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import logo from "@/assets/logo.png";
import { SITE_URL, OG_IMAGE, buildBreadcrumbList } from "@/lib/seoUtils";

const canonicalUrl = `${SITE_URL}/psw-pay-calculator`;
const title = "PSW Pay Calculator | Estimate Your Earnings | PSW Direct";
const description = "Calculate how much you can earn as a personal support worker in Ontario. Estimate weekly and monthly income based on hourly rate and hours worked.";

const PSWPayCalculatorPage = () => {
  const [hourlyRate, setHourlyRate] = useState(25);
  const [hoursPerWeek, setHoursPerWeek] = useState(30);

  const weeklyPay = hourlyRate * hoursPerWeek;
  const monthlyPay = weeklyPay * 4.33;
  const annualPay = weeklyPay * 52;

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
            { name: "PSW Pay Calculator", url: canonicalUrl },
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
            <Calculator className="w-4 h-4" />
            Earnings Estimator
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-6">PSW Pay Calculator</h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-8">
            Estimate how much you can earn as a personal support worker in Ontario. Adjust the hourly rate
            and weekly hours to see your projected income.
          </p>
        </section>

        <section className="px-4 pb-12 max-w-2xl mx-auto">
          <div className="bg-card rounded-2xl p-6 md:p-8 border border-border shadow-card space-y-8">
            {/* Hourly Rate */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-foreground">Hourly Rate</label>
                <span className="text-primary font-bold text-xl">${hourlyRate}/hr</span>
              </div>
              <Slider
                value={[hourlyRate]}
                onValueChange={(v) => setHourlyRate(v[0])}
                min={18}
                max={35}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$18</span>
                <span>$35</span>
              </div>
            </div>

            {/* Hours per week */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="font-semibold text-foreground">Hours per Week</label>
                <span className="text-primary font-bold text-xl">{hoursPerWeek} hrs</span>
              </div>
              <Slider
                value={[hoursPerWeek]}
                onValueChange={(v) => setHoursPerWeek(v[0])}
                min={5}
                max={60}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5 hrs</span>
                <span>60 hrs</span>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Weekly</span>
                </div>
                <p className="text-xl font-bold text-foreground">${weeklyPay.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Monthly</span>
                </div>
                <p className="text-xl font-bold text-foreground">${Math.round(monthlyPay).toLocaleString()}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Annual</span>
                </div>
                <p className="text-xl font-bold text-foreground">${annualPay.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/join-team">
              <Button size="lg" className="text-lg px-8 py-6">Apply to Join PSW Direct</Button>
            </Link>
          </div>
        </section>

        <section className="bg-muted/50 px-4 py-12 border-y border-border">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">PSW Pay in Ontario</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Personal support workers in Ontario earn between $18 and $28 per hour depending on the employer,
                experience level, and care setting. Traditional agencies typically pay $18–$22/hr, while private
                marketplace platforms like PSW Direct offer $22–$28/hr by cutting out agency overhead.
              </p>
              <p>
                PSW Direct pays workers directly with weekly Thursday payouts. There are no long-term contracts,
                and you set your own hours. Overnight and 24-hour shifts are also available for higher earning potential.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 max-w-4xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/psw-work-areas-ontario" className="text-primary hover:underline text-sm">Work Areas</Link>
            <Link to="/psw-agency-vs-private-pay" className="text-primary hover:underline text-sm">Agency vs Private Pay</Link>
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

export default PSWPayCalculatorPage;
