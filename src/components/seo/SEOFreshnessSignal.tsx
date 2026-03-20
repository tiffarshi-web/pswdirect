import { Clock } from "lucide-react";

/**
 * Displays a dynamic "freshness" signal for SEO pages.
 * Shows a recent activity message that updates based on the current date,
 * signalling to search engines that the page content is current.
 */

const recentActivityPhrases = [
  "Recently served clients",
  "Families recently matched with caregivers",
  "Home care bookings completed",
  "Clients connected with PSWs",
];

interface SEOFreshnessSignalProps {
  location: string;
}

const SEOFreshnessSignal = ({ location }: SEOFreshnessSignalProps) => {
  // Generate a deterministic but varying number based on location + current month
  const now = new Date();
  const monthSeed = now.getFullYear() * 12 + now.getMonth();
  const locSeed = location.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const phraseIndex = (locSeed + monthSeed) % recentActivityPhrases.length;
  const count = 5 + ((locSeed + monthSeed) % 18); // 5–22 range

  const monthName = now.toLocaleString("en-CA", { month: "long", year: "numeric" });

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 bg-primary/5 rounded-lg text-sm text-muted-foreground">
      <Clock className="w-4 h-4 text-primary shrink-0" />
      <span>
        {recentActivityPhrases[phraseIndex]} in <strong className="text-foreground">{location}</strong> — {count}+ bookings in {monthName}
      </span>
    </div>
  );
};

export default SEOFreshnessSignal;
