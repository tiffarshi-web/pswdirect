import { Badge } from "@/components/ui/badge";
import { HeartPulse } from "lucide-react";
import { formatCareConditionsBadges } from "@/lib/careConditions";

interface CareConditionBadgesProps {
  conditions: string[];
  otherText?: string | null;
  className?: string;
}

/**
 * Renders care conditions as clean inline badges.
 * Used in PSW job cards and admin booking views.
 */
export const CareConditionBadges = ({
  conditions,
  otherText,
  className = "",
}: CareConditionBadgesProps) => {
  if (!conditions || conditions.length === 0) return null;

  const badges = formatCareConditionsBadges(conditions, otherText);
  if (badges.length === 0) return null;

  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <HeartPulse className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
      <div className="flex flex-wrap gap-1">
        {badges.map((badge) => (
          <Badge
            key={badge}
            variant="outline"
            className="text-xs border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"
          >
            {badge}
          </Badge>
        ))}
      </div>
    </div>
  );
};
