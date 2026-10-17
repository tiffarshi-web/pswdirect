import { Phone } from "lucide-react";
import { BUSINESS_CONTACT } from "@/lib/contactConfig";
import { cn } from "@/lib/utils";

/** Visible call button for public SEO pages. Uses the central business number. */
const SeoCallCta = ({ className }: { className?: string }) => (
  <a
    href={BUSINESS_CONTACT.phoneTel}
    className={cn(
      "inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary/10 transition-colors",
      className,
    )}
  >
    <Phone className="w-4 h-4" /> Call {BUSINESS_CONTACT.phone}
  </a>
);

export default SeoCallCta;
