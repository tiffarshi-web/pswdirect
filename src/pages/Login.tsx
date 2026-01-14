import { LoginForm } from "@/components/LoginForm";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Login = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Direct</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-md mx-auto w-full">
        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Welcome back
          </h2>
          <p className="text-muted-foreground">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Login Form */}
        <LoginForm />

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-border space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-center"
            onClick={() => navigate("/")}
          >
            Book Care Without Signing In
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-between text-muted-foreground"
            onClick={() => navigate("/join-team")}
          >
            Join Our Team as a PSW
            <Heart className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Login;
