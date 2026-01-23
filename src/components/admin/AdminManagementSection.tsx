import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Send, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Loader2,
  Shield,
  Mail
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AdminInvitation {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string;
}

export function AdminManagementSection() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user and data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

      await Promise.all([fetchInvitations(), fetchAdminUsers()]);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (err) {
      console.error("Failed to fetch invitations:", err);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      // Get all admin role assignments
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "admin");

      if (rolesError) throw rolesError;

      // Get emails for each user from accepted invitations
      const adminList: AdminUser[] = [];
      
      for (const role of roles || []) {
        // Try to find email from invitations
        const { data: invite } = await supabase
          .from("admin_invitations")
          .select("email")
          .eq("status", "accepted")
          .single();

        // Use a placeholder if we can't find the email
        adminList.push({
          user_id: role.user_id,
          email: invite?.email || "admin@pswdirect.ca",
          created_at: role.created_at,
        });
      }

      setAdminUsers(adminList);
    } catch (err) {
      console.error("Failed to fetch admin users:", err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsInviting(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { email: inviteEmail.toLowerCase().trim() },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success("Invitation sent successfully!");
      setInviteEmail("");
      await fetchInvitations();

      // If setup URL is returned (dev mode), show it
      if (data.setupUrl) {
        console.log("Setup URL:", data.setupUrl);
        toast.info("Check console for setup URL (email not configured)");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send invitation";
      toast.error(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("admin_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast.success("Invitation deleted");
      await fetchInvitations();
    } catch (err) {
      toast.error("Failed to delete invitation");
    }
  };

  const handleResendInvitation = async (invitation: AdminInvitation) => {
    try {
      // Delete old invitation
      await supabase
        .from("admin_invitations")
        .delete()
        .eq("id", invitation.id);

      // Create new one
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { email: invitation.email },
      });

      if (error) throw error;

      toast.success("Invitation resent!");
      await fetchInvitations();
    } catch (err) {
      toast.error("Failed to resend invitation");
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    if (userId === currentUserId) {
      toast.error("You cannot revoke your own admin access");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;

      toast.success("Admin access revoked");
      await fetchAdminUsers();
    } catch (err) {
      toast.error("Failed to revoke admin access");
    }
  };

  const getStatusBadge = (invitation: AdminInvitation) => {
    const isExpired = new Date(invitation.expires_at) < new Date();
    
    if (invitation.status === "accepted") {
      return <Badge variant="default" className="bg-green-500">Accepted</Badge>;
    }
    if (isExpired || invitation.status === "expired") {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite New Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite New Admin
          </CardTitle>
          <CardDescription>
            Send an invitation to a new admin. They will receive an email to set up their password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email" className="sr-only">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>
            <Button type="submit" variant="brand" disabled={isInviting}>
              {isInviting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Pending Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No pending invitations
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  const isPending = invitation.status === "pending" && !isExpired;
                  
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{getStatusBadge(invitation)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          {(isExpired || invitation.status === "expired") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvitation(invitation)}
                            >
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Resend
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invitation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the invitation for {invitation.email}.
                                  They will no longer be able to use the invitation link.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteInvitation(invitation.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Active Admins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Active Administrators
          </CardTitle>
          <CardDescription>
            Users with admin access to this portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {adminUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No administrators found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((admin) => (
                  <TableRow key={admin.user_id}>
                    <TableCell className="font-medium">
                      {admin.email}
                      {admin.user_id === currentUserId && (
                        <Badge variant="outline" className="ml-2">You</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(admin.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {admin.user_id !== currentUserId && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Revoke
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke Admin Access?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove admin access for {admin.email}.
                                They will no longer be able to log in to the admin portal.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevokeAdmin(admin.user_id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Revoke Access
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
