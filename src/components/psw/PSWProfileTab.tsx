import { User, AlertTriangle, LogOut, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const PSWProfileTab = () => {
  const { user, logout } = useAuth();
  const firstName = user?.firstName || "Worker";

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
