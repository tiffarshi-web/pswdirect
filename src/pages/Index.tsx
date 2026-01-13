import { LoginForm } from "@/components/LoginForm";
import { Heart, Shield, Clock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] gradient-medical relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-32 right-20 w-96 h-96 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CareConnect</h1>
              <p className="text-white/80 text-sm">PSW Agency</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-lg">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
              Compassionate Care,
              <br />
              <span className="text-white/90">Professional Service</span>
            </h2>
            <p className="text-lg text-white/80 leading-relaxed mb-12">
              Connecting families with trusted Personal Support Workers. 
              Our platform ensures quality care delivery with seamless 
              scheduling and communication.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                { icon: Shield, text: "Verified & Certified PSWs" },
                { icon: Clock, text: "24/7 Care Coordination" },
                { icon: Heart, text: "Personalized Care Plans" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-sm text-white/60">
            © 2025 CareConnect PSW Agency. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-20">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-xl gradient-medical flex items-center justify-center shadow-card">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">CareConnect</h1>
            <p className="text-muted-foreground text-sm">PSW Agency</p>
          </div>
        </div>

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
      </div>
    </div>
  );
};

export default Index;
