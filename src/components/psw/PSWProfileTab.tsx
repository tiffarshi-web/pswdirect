import { useState, useEffect } from "react";
import { User, AlertTriangle, LogOut, FileText, Clock, MapPin, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getPSWProfile, updatePSWHomeLocation } from "@/lib/pswProfileStore";
import { isValidCanadianPostalCode, formatPostalCode } from "@/lib/postalCodeUtils";

export const PSWProfileTab = () => {
  const { user, logout } = useAuth();
  const firstName = user?.firstName || "Worker";
  
  const [homePostalCode, setHomePostalCode] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Load PSW profile data
  useEffect(() => {
    if (user?.id) {
      const profile = getPSWProfile(user.id);
      if (profile) {
        setHomePostalCode(profile.homePostalCode || "");
        setHomeCity(profile.homeCity || "");
      }
    }
  }, [user?.id]);

  const handleSaveHomeAddress = () => {
    if (!user?.id) return;

    // Validate postal code if provided
    if (homePostalCode && !isValidCanadianPostalCode(homePostalCode)) {
      toast.error("Invalid postal code", {
        description: "Please enter a valid Canadian postal code (e.g., M5V 1J9)",
      });
      return;
    }

    const formattedPostal = homePostalCode ? formatPostalCode(homePostalCode) : "";
    
    const updated = updatePSWHomeLocation(user.id, formattedPostal, homeCity || undefined);
    
    if (updated) {
      setHomePostalCode(formattedPostal);
      setIsEditing(false);
      toast.success("Home address saved", {
        description: "Jobs within 75km of your location will be shown.",
      });
    } else {
      toast.error("Failed to save address");
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header - First Name Only */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">{firstName}</h2>
          <p className="text-sm text-muted-foreground">Personal Support Worker</p>
        </div>
      </div>

      {/* Home Address for Distance Filtering */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Home Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Set your home location to see jobs within 75km of you.
          </p>
          
          {isEditing ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="M5V 1J9"
                  value={homePostalCode}
                  onChange={(e) => setHomePostalCode(e.target.value.toUpperCase())}
                  maxLength={7}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Input
                  id="city"
                  placeholder="Toronto"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveHomeAddress} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                {homePostalCode ? (
                  <>
                    <p className="font-medium text-foreground">{homePostalCode}</p>
                    {homeCity && (
                      <p className="text-sm text-muted-foreground">{homeCity}</p>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No address set</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                {homePostalCode ? "Edit" : "Add"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">32</p>
            <p className="text-xs text-muted-foreground">Hours This Week</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">8</p>
            <p className="text-xs text-muted-foreground">Shifts Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Missed Shift Policy */}
      <Card className="shadow-card border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4" />
            Missed Shift Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-sm text-amber-800/90 dark:text-amber-200/90 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>First missed shift: Written warning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Second missed shift: Suspension for 1 week</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Third missed shift: Termination of contract</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>24-hour notice required for cancellations</span>
            </li>
          </ul>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
            Emergency situations will be reviewed on a case-by-case basis.
          </p>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button 
        variant="outline" 
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
};
