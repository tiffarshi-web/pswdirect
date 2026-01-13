import { useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestBookingFlow } from "@/components/client/GuestBookingFlow";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const BookService = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  // If logged in as client, pass their info
  const clientInfo = isAuthenticated && user?.role === "client" 
    ? { name: user.name, email: user.email, phone: "(416) 555-1234" }
    : null;

  const handleBack = () => {
    if (isAuthenticated && user?.role === "client") {
      navigate("/client");
    } else {
      navigate("/");
    }
  };

  const handleLoginClick = () => {
    navigate("/?login=client");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
          </div>
          
          {/* Login button for returning customers */}
          {!isAuthenticated && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLoginClick}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        <GuestBookingFlow 
          onBack={handleBack}
          existingClient={clientInfo}
        />
      </main>
    </div>
  );
};

export default BookService;
