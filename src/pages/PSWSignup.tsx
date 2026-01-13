import { useState } from "react";
import { ArrowLeft, Heart, CheckCircle, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const PSWSignup = () => {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    yearsExperience: "",
    certifications: "",
    hasOwnTransport: "",
    availableShifts: "",
    coverLetter: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!agreedToPolicy) {
      toast.error("Please agree to the platform policy");
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log("PSW Application submitted:", {
        ...formData,
        status: "pending",
        appliedAt: new Date().toISOString(),
      });
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Direct</span>
          </div>
        </header>

        {/* Pending Status */}
        <main className="px-4 py-12 max-w-md mx-auto">
          <Card className="shadow-card text-center">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-amber-600" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Application Received!
                </h1>
                <p className="text-muted-foreground">
                  Thank you for applying, {formData.firstName}.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-foreground font-medium mb-2">What happens next?</p>
                <p className="text-sm text-muted-foreground">
                  Your application is being reviewed by our Admin team. 
                  You will be notified via email once you are vetted and activated.
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Status:</strong> Pending Review
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  You cannot access the PSW portal until your application is approved.
                </p>
              </div>

              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
                className="w-full"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full gradient-brand flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Our Team</h1>
          <p className="text-muted-foreground mt-1">
            Apply to become a PSW Direct care provider
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="Sarah"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Johnson"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sarah.johnson@email.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(416) 555-1234"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Experience & Certifications</CardTitle>
              <CardDescription>Help us understand your qualifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Select 
                  value={formData.yearsExperience}
                  onValueChange={(value) => updateFormData("yearsExperience", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-1">Less than 1 year</SelectItem>
                    <SelectItem value="1-3">1-3 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="5+">5+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications / Credentials</Label>
                <Textarea
                  id="certifications"
                  placeholder="e.g., PSW Certificate, First Aid, CPR, Dementia Care Training..."
                  value={formData.certifications}
                  onChange={(e) => updateFormData("certifications", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hasOwnTransport">Do you have your own transportation?</Label>
                <Select 
                  value={formData.hasOwnTransport}
                  onValueChange={(value) => updateFormData("hasOwnTransport", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes-car">Yes, I have a car</SelectItem>
                    <SelectItem value="yes-transit">Yes, I use public transit</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableShifts">Availability</Label>
                <Select 
                  value={formData.availableShifts}
                  onValueChange={(value) => updateFormData("availableShifts", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="When are you available?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekdays">Weekdays only</SelectItem>
                    <SelectItem value="weekends">Weekends only</SelectItem>
                    <SelectItem value="flexible">Flexible / Any time</SelectItem>
                    <SelectItem value="evenings">Evenings only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverLetter">Why do you want to join PSW Direct? (Optional)</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell us about your passion for caregiving..."
                  value={formData.coverLetter}
                  onChange={(e) => updateFormData("coverLetter", e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Platform Policy */}
          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Platform Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                <p className="font-medium text-foreground">Important: Please read carefully</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>All PSWs must maintain valid certifications</li>
                  <li>Missed shifts without 24-hour notice may result in removal</li>
                  <li>Client confidentiality must be maintained at all times</li>
                  <li>Professional conduct is expected during all interactions</li>
                </ul>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agreePolicy"
                  checked={agreedToPolicy}
                  onCheckedChange={(checked) => setAgreedToPolicy(checked as boolean)}
                />
                <Label htmlFor="agreePolicy" className="text-sm text-muted-foreground cursor-pointer">
                  I understand and agree to the PSW Direct platform policies, including the removal policy for missed shifts and professional conduct requirements.
                </Label>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={isLoading || !agreedToPolicy}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              "Submit Application"
            )}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default PSWSignup;
