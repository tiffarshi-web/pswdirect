import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleCard } from "@/components/RoleCard";
import { Shield, Heart, User, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";

type UserRole = "admin" | "psw" | "client";

const roles = [
  {
    id: "admin" as const,
    title: "Admin",
    description: "Manage staff & operations",
    icon: Shield,
  },
  {
    id: "psw" as const,
    title: "PSW",
    description: "Personal Support Worker",
    icon: Heart,
  },
  {
    id: "client" as const,
    title: "Client",
    description: "View care & schedules",
    icon: User,
  },
];

export function LoginForm() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("psw");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    
    // Simulate login - replace with actual auth
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`Welcome! Logged in as ${selectedRole}`);
    }, 1500);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in">
      {/* Role Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-foreground mb-4 text-center">
          Select your role
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role.id}
              title={role.title}
              description={role.description}
              icon={role.icon}
              selected={selectedRole === role.id}
              onClick={() => setSelectedRole(role.id)}
            />
          ))}
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-foreground font-medium">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 px-4 bg-card border-border focus:border-primary focus:ring-primary"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-foreground font-medium">
              Password
            </Label>
            <button
              type="button"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 px-4 pr-12 bg-card border-border focus:border-primary focus:ring-primary"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="brand"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Sign In
            </>
          )}
        </Button>
      </form>

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Need help accessing your account?{" "}
        <button className="text-primary hover:text-primary/80 font-medium transition-colors">
          Contact Support
        </button>
      </p>
    </div>
  );
}
