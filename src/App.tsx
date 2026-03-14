import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import { DevMenu } from "@/components/dev/DevMenu";
import { isProductionDomain } from "@/lib/devConfig";
// Hydrate pricing config cache on app boot (fire-and-forget)
import { fetchPricingRatesFromDB } from "@/lib/pricingConfigStore";
fetchPricingRatesFromDB();
import HomePage from "./pages/HomePage";
import OfficeLogin from "./pages/OfficeLogin";
import AdminPortal from "./pages/AdminPortal";
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary";
import ClientPortal from "./pages/ClientPortal";
import ClientLogin from "./pages/ClientLogin";
import PSWDashboard from "./pages/PSWDashboard";
import PSWLogin from "./pages/PSWLogin";
import PSWPendingStatus from "./pages/PSWPendingStatus";
import PSWSignup from "./pages/PSWSignup";
import InstallApp from "./pages/InstallApp";
import AdminSetup from "./pages/AdminSetup";
import VerifyProfile from "./pages/VerifyProfile";
import NotFound from "./pages/NotFound";
import FAQ from "./pages/FAQ";
import SEOCityLandingPage from "./pages/seo/SEOCityLandingPage";
import PSWProfileSEO from "./pages/seo/PSWProfileSEO";
import PSWDirectory from "./pages/seo/PSWDirectory";
import { seoRoutes, homeCareCityRoutes } from "./pages/seo/seoRoutes";
import HomeCareCityPage from "./pages/seo/HomeCareCityPage";
import NearMeLandingPage from "./pages/seo/NearMeLandingPage";
import PSWNearMePage from "./pages/seo/PSWNearMePage";
import SEOCityServicePage from "./pages/seo/SEOCityServicePage";
import { cityServiceRoutes } from "./pages/seo/cityServiceRoutes";
import PSWLanguagePage from "./pages/seo/PSWLanguagePage";
import { languageRoutes } from "./pages/seo/languageRoutes";
import PSWLanguageCityPage from "./pages/seo/PSWLanguageCityPage";
import { languageCityRoutes } from "./pages/seo/languageCityRoutes";
import PSWLanguageServiceCityPage from "./pages/seo/PSWLanguageServiceCityPage";
import { languageServiceCityRoutes } from "./pages/seo/languageServiceCityRoutes";
import GuidesIndex from "./pages/guides/GuidesIndex";
import HowToHireAPSW from "./pages/guides/HowToHireAPSW";
import CostOfHomeCareOntario from "./pages/guides/CostOfHomeCareOntario";
import HospitalDischargeChecklist from "./pages/guides/HospitalDischargeChecklist";
import SignsParentNeedsHomeCare from "./pages/guides/SignsParentNeedsHomeCare";
import PSWvsNurseDifference from "./pages/guides/PSWvsNurseDifference";
import PaymentLinkPage from "./pages/PaymentLinkPage";
import PSWOntarioDirectory from "./pages/seo/PSWOntarioDirectory";
import OntarioPSWLocationsHub from "./pages/seo/OntarioPSWLocationsHub";
import EmergencyCareLandingPage from "./pages/seo/EmergencyCareLandingPage";
import { emergencyCareRoutes } from "./pages/seo/emergencyCareRoutes";
import HomeCareOntarioPage from "./pages/seo/HomeCareOntarioPage";
import PSWJobCityPage from "./pages/seo/PSWJobCityPage";
import { pswJobCityRoutes } from "./pages/seo/pswJobRoutes";
import PSWJobTypePage from "./pages/seo/PSWJobTypePage";
import PSWPayCalculatorPage from "./pages/seo/PSWPayCalculatorPage";
import PSWAgencyVsPrivatePayPage from "./pages/seo/PSWAgencyVsPrivatePayPage";
import PSWWorkAreasOntarioPage from "./pages/seo/PSWWorkAreasOntarioPage";
import CoverageMapPage from "./pages/seo/CoverageMapPage";
import QuestionSEOPage from "./pages/seo/QuestionSEOPage";
import { questionRoutes } from "./pages/seo/questionRoutes";
import AboutPage from "./pages/seo/AboutPage";
import PSWCostPage from "./pages/seo/PSWCostPage";
import SeniorCareNearMePage from "./pages/seo/SeniorCareNearMePage";
import PrivateCaregiverPage from "./pages/seo/PrivateCaregiverPage";
import InHomeCareOntarioPage from "./pages/seo/InHomeCareOntarioPage";
import HomeCareKeywordCityPage from "./pages/seo/HomeCareKeywordCityPage";
import { homeCareKeywordRoutes } from "./pages/seo/homeCareKeywordRoutes";
import LanguagesHubPage from "./pages/seo/LanguagesHubPage";
import CitiesHubPage from "./pages/seo/CitiesHubPage";

const queryClient = new QueryClient();

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// DevMenu wrapper - only renders on non-production domains with dev mode enabled
const DevMenuWrapper = () => {
  // PRODUCTION KILL: Never show dev menu on production domain
  if (isProductionDomain()) return null;
  
  // Only show if dev mode is explicitly enabled
  return <DevMenu />;
};

// Protected route for admin - must be used inside AuthProvider
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/office-login" replace />;
  }
  
  return <>{children}</>;
};

// GA4 SPA page-view tracker
const GA4RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    const g = (window as any).gtag;
    if (typeof g === "function") {
      g("event", "page_view", { page_path: location.pathname });
    }
  }, [location.pathname]);
  return null;
};

// Main app content - separated to use hooks inside AuthProvider
const AppRoutes = () => (
  <BrowserRouter>
    <GA4RouteTracker />
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/join-team" element={<PSWSignup />} />
      
      {/* PSW Routes */}
      <Route path="/psw-login" element={<PSWLogin />} />
      <Route path="/psw-pending" element={<PSWPendingStatus />} />
      <Route path="/psw/profile/:slug" element={<PSWProfileSEO />} />
      <Route path="/psw-directory" element={<PSWDirectory />} />
      <Route path="/psw" element={<PSWDashboard />} />
      <Route path="/install" element={<InstallApp />} />
      
      {/* Hidden Admin Routes */}
      <Route path="/office-login" element={<OfficeLogin />} />
      <Route path="/admin-setup" element={<AdminSetup />} />
      <Route path="/admin" element={
        <AdminRoute>
          <AdminErrorBoundary>
            <AdminPortal />
          </AdminErrorBoundary>
        </AdminRoute>
      } />
      
      {/* Payment Link Route */}
      <Route path="/pay/:token" element={<PaymentLinkPage />} />
      
      {/* Client Routes */}
      <Route path="/client-login" element={<ClientLogin />} />
      <Route path="/client" element={<ClientPortal />} />
      
      {/* Verification Routes (QR Code landing pages) */}
      <Route path="/verify/:type/:id" element={<VerifyProfile />} />
      
      {/* Near Me SEO Pages */}
      <Route path="/psw-near-me" element={<PSWNearMePage />} />
      <Route path="/home-care-near-me" element={<NearMeLandingPage variant="home-care-near-me" />} />
      <Route path="/personal-support-worker-near-me" element={<NearMeLandingPage variant="personal-support-worker-near-me" />} />
      
      {/* SEO City Landing Pages */}
      {seoRoutes.map(({ slug, city }) => (
        <Route key={slug} path={`/${slug}`} element={<SEOCityLandingPage city={city} slug={slug} />} />
      ))}
      
      {/* City + Service SEO Pages */}
      {cityServiceRoutes.map(({ slug, city, service, serviceLabel }) => (
        <Route key={slug} path={`/${slug}`} element={<SEOCityServicePage city={city} service={service} serviceLabel={serviceLabel} slug={slug} />} />
      ))}
      
      {/* Language SEO Pages */}
      {languageRoutes.map(({ slug, code, label }) => (
        <Route key={slug} path={`/${slug}`} element={<PSWLanguagePage languageCode={code} languageLabel={label} slug={slug} />} />
      ))}
      
      {/* Language + City SEO Pages */}
      {languageCityRoutes.map(({ slug, languageCode, languageLabel, city, citySlug, languageSlug }) => (
        <Route key={slug} path={`/${slug}`} element={<PSWLanguageCityPage languageCode={languageCode} languageLabel={languageLabel} city={city} slug={slug} citySlug={citySlug} languageSlug={languageSlug} />} />
      ))}
      
      {/* Language + Service + City SEO Pages */}
      {languageServiceCityRoutes.map(({ slug, languageCode, languageLabel, city, citySlug, languageSlug, service, serviceLabel }) => (
        <Route key={slug} path={`/${slug}`} element={<PSWLanguageServiceCityPage languageCode={languageCode} languageLabel={languageLabel} city={city} slug={slug} citySlug={citySlug} languageSlug={languageSlug} service={service} serviceLabel={serviceLabel} />} />
      ))}
      
      {/* Ontario PSW Index */}
      <Route path="/personal-support-workers-ontario" element={<PSWOntarioDirectory />} />
      <Route path="/home-care-ontario" element={<HomeCareOntarioPage />} />
      <Route path="/ontario-psw-locations" element={<OntarioPSWLocationsHub />} />
      
      {/* Emergency / Same-Day Care Pages */}
      {emergencyCareRoutes.map(({ slug, city, variant }) => (
        <Route key={slug} path={`/${slug}`} element={<EmergencyCareLandingPage city={city} slug={slug} variant={variant} />} />
      ))}
      
      {/* PSW Recruitment Pages */}
      {pswJobCityRoutes.map(({ slug, city }) => (
        <Route key={slug} path={`/${slug}`} element={<PSWJobCityPage city={city} slug={slug} />} />
      ))}
      <Route path="/private-psw-jobs" element={<PSWJobTypePage variant="private" />} />
      <Route path="/overnight-psw-jobs" element={<PSWJobTypePage variant="overnight" />} />
      <Route path="/24-hour-psw-jobs" element={<PSWJobTypePage variant="24-hour" />} />
      <Route path="/psw-part-time-jobs" element={<PSWJobTypePage variant="part-time" />} />
      <Route path="/psw-pay-calculator" element={<PSWPayCalculatorPage />} />
      <Route path="/psw-agency-vs-private-pay" element={<PSWAgencyVsPrivatePayPage />} />
      <Route path="/psw-work-areas-ontario" element={<PSWWorkAreasOntarioPage />} />
      <Route path="/coverage" element={<CoverageMapPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/psw-cost" element={<PSWCostPage />} />
      <Route path="/senior-care-near-me" element={<SeniorCareNearMePage />} />
      <Route path="/private-caregiver" element={<PrivateCaregiverPage />} />
      <Route path="/in-home-care-ontario" element={<InHomeCareOntarioPage />} />
      <Route path="/languages" element={<LanguagesHubPage />} />
      <Route path="/cities" element={<CitiesHubPage />} />
      
      {/* Home Care Keyword + City Pages */}
      {homeCareKeywordRoutes.map(({ slug, city, keyword, keywordLabel }) => (
        <Route key={slug} path={`/${slug}`} element={<HomeCareKeywordCityPage city={city} slug={slug} keyword={keyword} keywordLabel={keywordLabel} />} />
      ))}
      
      {/* Question SEO Pages */}
      {questionRoutes.map(({ slug, title, h1, metaDescription, city, content }) => (
        <Route key={slug} path={`/${slug}`} element={<QuestionSEOPage slug={slug} title={title} h1={h1} metaDescription={metaDescription} city={city} content={content} />} />
      ))}
      
      {/* Guides */}
      <Route path="/guides" element={<GuidesIndex />} />
      <Route path="/guides/how-to-hire-a-personal-support-worker" element={<HowToHireAPSW />} />
      <Route path="/guides/cost-of-home-care-ontario" element={<CostOfHomeCareOntario />} />
      <Route path="/guides/hospital-discharge-checklist" element={<HospitalDischargeChecklist />} />
      <Route path="/guides/signs-your-parent-needs-home-care" element={<SignsParentNeedsHomeCare />} />
      <Route path="/guides/psw-vs-nurse-difference" element={<PSWvsNurseDifference />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    {/* Dev Menu - COMPLETELY HIDDEN on production domain */}
    <DevMenuWrapper />
  </BrowserRouter>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <AppRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
