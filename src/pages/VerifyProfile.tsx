// Dynamic Verification Page for Clients and PSWs
// Displays live profile data - updates reflect instantly

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, CheckCircle2, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

type ProfileType = "client" | "psw";

interface ClientData {
  id: string;
  full_name: string | null;
  first_name: string | null;
  email: string;
  phone: string | null;
  default_address: string | null;
}

interface PSWData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  home_city: string | null;
  vetting_status: string | null;
  profile_photo_url: string | null;
  languages: string[] | null;
  certifications: string | null;
}

const VerifyProfile = () => {
  const { type, id } = useParams<{ type: ProfileType; id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [pswData, setPswData] = useState<PSWData | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [type, id]);

  const fetchProfile = async () => {
    if (!type || !id) {
      setError("Invalid verification link");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (type === "client") {
      const { data, error: fetchError } = await supabase
        .from("client_profiles")
        .select("id, full_name, first_name, email, phone, default_address")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching client:", fetchError);
        setError("Failed to load profile");
      } else if (!data) {
        setError("Profile not found");
      } else {
        setClientData(data);
      }
    } else if (type === "psw") {
      const { data, error: fetchError } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name, email, phone, home_city, vetting_status, profile_photo_url, languages, certifications")
        .eq("id", id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching PSW:", fetchError);
        setError("Failed to load profile");
      } else if (!data) {
        setError("Profile not found");
      } else {
        setPswData(data);
      }
    } else {
      setError("Invalid profile type");
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-card">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <User className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Profile Not Found</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">Verification</span>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6">
        {/* Client Profile */}
        {type === "client" && clientData && (
          <Card className="shadow-card">
            <CardHeader className="text-center pb-2">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-xl">
                {clientData.full_name || clientData.first_name || "Client"}
              </CardTitle>
              <Badge className="mt-2">Registered Client</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{clientData.email}</p>
                </div>
              </div>
              
              {clientData.phone && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{clientData.phone}</p>
                  </div>
                </div>
              )}
              
              {clientData.default_address && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">{clientData.default_address}</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Profile Verified</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This profile is registered with PSW Direct
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PSW Profile */}
        {type === "psw" && pswData && (
          <Card className="shadow-card">
            <CardHeader className="text-center pb-2">
              <Avatar className="w-24 h-24 mx-auto mb-4 ring-4 ring-primary/20">
                {pswData.profile_photo_url ? (
                  <AvatarImage src={pswData.profile_photo_url} alt={pswData.first_name} />
                ) : null}
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {pswData.first_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">
                {pswData.first_name} {pswData.last_name.charAt(0)}.
              </CardTitle>
              {pswData.vetting_status === "approved" ? (
                <Badge className="mt-2 bg-green-100 text-green-700">Verified Caregiver</Badge>
              ) : (
                <Badge variant="secondary" className="mt-2">
                  {pswData.vetting_status || "Pending Verification"}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {pswData.home_city && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Service Area</p>
                    <p className="text-sm font-medium">{pswData.home_city}</p>
                  </div>
                </div>
              )}
              
              {pswData.languages && pswData.languages.length > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Languages</p>
                  <div className="flex flex-wrap gap-1">
                    {pswData.languages.map((lang, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {pswData.certifications && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Certifications</p>
                  <p className="text-sm">{pswData.certifications}</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-border">
                {pswData.vetting_status === "approved" ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">Background Check Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="text-sm font-medium">Verification Pending</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  This caregiver is registered with PSW Direct
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </div>
      </main>
    </div>
  );
};

export default VerifyProfile;
