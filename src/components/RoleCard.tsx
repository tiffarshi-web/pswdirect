import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface RoleCardProps {
  role: "admin" | "psw" | "client";
  title: string;
  description: string;
  icon: LucideIcon;
  selected: boolean;
  onClick: () => void;
}

const roleStyles = {
  admin: {
    bg: "bg-role-admin-light",
    border: "border-role-admin",
    icon: "text-role-admin",
    ring: "ring-role-admin",
  },
  psw: {
    bg: "bg-role-psw-light",
    border: "border-role-psw",
    icon: "text-role-psw",
    ring: "ring-role-psw",
  },
  client: {
    bg: "bg-role-client-light",
    border: "border-role-client",
    icon: "text-role-client",
    ring: "ring-role-client",
  },
};

export function RoleCard({
  role,
  title,
  description,
  icon: Icon,
  selected,
  onClick,
}: RoleCardProps) {
  const styles = roleStyles[role];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-300",
        "hover:shadow-card-hover hover:-translate-y-1",
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        styles.ring,
        selected
          ? cn(styles.border, styles.bg, "shadow-card")
          : "border-border bg-card hover:border-muted-foreground/30"
      )}
    >
      <div
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors",
          selected ? styles.bg : "bg-muted"
        )}
      >
        <Icon
          className={cn(
            "w-7 h-7 transition-colors",
            selected ? styles.icon : "text-muted-foreground"
          )}
        />
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center">{description}</p>
      
      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-3 right-3 w-5 h-5 rounded-full border-2 transition-all",
          selected
            ? cn(styles.border, styles.bg)
            : "border-muted-foreground/30"
        )}
      >
        {selected && (
          <div
            className={cn(
              "absolute inset-1 rounded-full",
              role === "admin" && "bg-role-admin",
              role === "psw" && "bg-role-psw",
              role === "client" && "bg-role-client"
            )}
          />
        )}
      </div>
    </button>
  );
}
