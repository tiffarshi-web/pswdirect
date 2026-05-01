import HighConvertLandingPage, { type HighConvertPageConfig } from "./HighConvertLandingPage";

const pages: Record<string, HighConvertPageConfig> = {
  "home-care-covered-by-insurance": {
    slug: "home-care-covered-by-insurance",
    title: "Home Care Covered by Insurance Ontario | Insurance Claims | PSW Direct",
    description: "Is home care covered by insurance in Ontario? PSW Direct supports Blue Cross, Sun Life, Manulife, and Canada Life claims. Book care and receive itemized invoices for reimbursement.",
    headline: "Home Care Covered by Insurance in Ontario",
    subheadline: "Many extended health benefit plans cover home care services. PSW Direct provides itemized invoices accepted by Blue Cross, Sun Life, Manulife, Canada Life, and other major insurers — making reimbursement simple.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Insurance Coverage", url: "/home-care-covered-by-insurance" }],
    faqs: [
      { question: "Which insurance companies cover home care?", answer: "Most major Canadian insurers cover home care, including Blue Cross, Sun Life, Manulife, Canada Life, Great-West Life, Desjardins, and Industrial Alliance. Coverage varies by plan — check your policy for 'personal support worker' or 'home care' benefits." },
      { question: "How do I submit an insurance claim for home care?", answer: "After each visit, PSW Direct provides an itemized invoice with the PSW's credentials, service details, date, duration, and cost. Submit this invoice to your insurer for reimbursement." },
      { question: "Does PSW Direct bill insurance directly?", answer: "PSW Direct operates on a private-pay model. You pay for care upfront and submit our detailed invoices to your insurer for reimbursement. We also support Veterans Affairs Canada direct billing." },
      { question: "What information does the invoice include?", answer: "Our invoices include the provider name (PSW Direct), PSW credentials, service type, date and time of service, duration, hourly rate, total amount, HST (if applicable), and your booking code." },
    ],
  },
  "blue-cross-home-care-coverage": {
    slug: "blue-cross-home-care-coverage",
    title: "Blue Cross Home Care Coverage | PSW Services | PSW Direct",
    description: "Blue Cross home care coverage in Ontario. PSW Direct provides itemized invoices accepted by Blue Cross for PSW and home care reimbursement. Book care from $35/hr.",
    headline: "Blue Cross Home Care Coverage — How It Works",
    subheadline: "If you have Blue Cross extended health benefits, your home care may be covered. PSW Direct provides detailed, professional invoices that Blue Cross accepts for personal support worker reimbursement claims.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Blue Cross Coverage", url: "/blue-cross-home-care-coverage" }],
    faqs: [
      { question: "Does Blue Cross cover PSW services?", answer: "Many Blue Cross plans include coverage for personal support worker services under 'home care' or 'paramedical services'. Check your specific plan for coverage limits and requirements." },
      { question: "How do I claim Blue Cross for home care?", answer: "Book care through PSW Direct, receive your itemized invoice after each visit, and submit it to Blue Cross online, by mail, or through their app. Most claims are processed within 2-4 weeks." },
      { question: "What does Blue Cross need on the invoice?", answer: "Blue Cross typically requires the provider name, PSW credentials, date of service, type of service, duration, and amount charged. PSW Direct invoices include all required information." },
      { question: "Is there a maximum amount Blue Cross covers?", answer: "Coverage limits depend on your specific Blue Cross plan. Some plans cover $500-$2,000/year in home care services. Check your plan details or call Blue Cross directly." },
    ],
  },
  "home-care-direct-billing-ontario": {
    slug: "home-care-direct-billing-ontario",
    title: "Home Care Direct Billing Ontario | Invoice for Insurance | PSW Direct",
    description: "Home care invoicing and direct billing in Ontario. PSW Direct provides detailed invoices for insurance reimbursement and supports Veterans Affairs Canada direct billing.",
    headline: "Home Care Billing & Insurance Claims in Ontario",
    subheadline: "PSW Direct makes insurance claims easy. Every visit generates a detailed, professional invoice with all information your insurer needs. For Veterans Affairs Canada clients, we support direct billing.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Direct Billing", url: "/home-care-direct-billing-ontario" }],
    faqs: [
      { question: "Does PSW Direct provide invoices for insurance?", answer: "Yes. Every completed visit generates a detailed invoice including provider credentials, service type, date, duration, hourly rate, and total amount — everything insurers require for reimbursement." },
      { question: "Does PSW Direct support VAC direct billing?", answer: "Yes. Veterans Affairs Canada clients can enter their K-number and authorization details during booking. PSW Direct supports VAC benefit programs for eligible veterans." },
      { question: "How quickly do I receive my invoice?", answer: "Invoices are generated immediately after each visit is completed. You can access them through your booking confirmation or contact us for copies." },
    ],
  },
  "private-home-care-insurance-claims": {
    slug: "private-home-care-insurance-claims",
    title: "Private Home Care Insurance Claims | How to Claim | PSW Direct",
    description: "How to submit private home care insurance claims in Ontario. PSW Direct provides itemized invoices for Blue Cross, Sun Life, Manulife, and Canada Life reimbursement.",
    headline: "How to Submit Private Home Care Insurance Claims",
    subheadline: "Claiming home care through your private insurance is straightforward with PSW Direct. We provide professional, itemized invoices accepted by all major Canadian insurers — making reimbursement hassle-free.",
    breadcrumbTrail: [{ name: "Home Care", url: "/home-care" }, { name: "Insurance Claims", url: "/private-home-care-insurance-claims" }],
    faqs: [
      { question: "How do I submit a home care insurance claim?", answer: "After your PSW visit, you'll receive an itemized invoice. Submit this to your insurer online, by mail, or through their app. Most insurers process home care claims within 2-4 weeks." },
      { question: "Which insurers accept PSW Direct invoices?", answer: "Our invoices are accepted by all major Canadian insurers including Blue Cross, Sun Life, Manulife, Canada Life, Great-West Life, Desjardins, and Industrial Alliance." },
      { question: "Do I pay upfront or does insurance pay directly?", answer: "PSW Direct is a private-pay service. You pay for each visit and submit invoices for reimbursement. The exception is Veterans Affairs Canada, where we support direct billing." },
      { question: "What if my claim is denied?", answer: "If your claim is denied, check that your plan covers 'personal support worker' or 'home care' services. Contact your insurer for plan specifics. PSW Direct can provide additional documentation if needed." },
    ],
  },
};

export const insurancePageSlugs = Object.keys(pages);

const InsuranceSEOPage = ({ slug }: { slug: string }) => {
  const config = pages[slug];
  if (!config) return null;
  return <HighConvertLandingPage config={config} />;
};

export default InsuranceSEOPage;
