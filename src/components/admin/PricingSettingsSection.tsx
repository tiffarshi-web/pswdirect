import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, DollarSign, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PricingSetting {
  id: string;
  task_name: string;
  psw_hourly_rate: number;
  client_hourly_rate: number;
  surcharge_flat: number | null;
  is_active: boolean;
}

export const PricingSettingsSection = () => {
  const [pricingSettings, setPricingSettings] = useState<PricingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PricingSetting | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    task_name: "",
    psw_hourly_rate: 22,
    client_hourly_rate: 35,
    surcharge_flat: 0,
    is_active: true,
  });

  // Fetch pricing settings from Supabase
  const fetchPricingSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pricing_settings")
      .select("*")
      .order("task_name");
    
    if (error) {
      console.error("Error fetching pricing settings:", error);
      toast.error("Failed to load pricing settings");
    } else {
      setPricingSettings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPricingSettings();
  }, []);

  const resetForm = () => {
    setFormData({
      task_name: "",
      psw_hourly_rate: 22,
      client_hourly_rate: 35,
      surcharge_flat: 0,
      is_active: true,
    });
    setEditingItem(null);
  };

  const handleOpenEdit = (item: PricingSetting) => {
    setEditingItem(item);
    setFormData({
      task_name: item.task_name,
      psw_hourly_rate: item.psw_hourly_rate,
      client_hourly_rate: item.client_hourly_rate,
      surcharge_flat: item.surcharge_flat || 0,
      is_active: item.is_active,
    });
    setIsAddDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.task_name.trim()) {
      toast.error("Task name is required");
      return;
    }

    setSaving(true);

    try {
      if (editingItem) {
        // Update existing
        const { error } = await supabase
          .from("pricing_settings")
          .update({
            task_name: formData.task_name,
            psw_hourly_rate: formData.psw_hourly_rate,
            client_hourly_rate: formData.client_hourly_rate,
            surcharge_flat: formData.surcharge_flat || null,
            is_active: formData.is_active,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Pricing updated successfully");
      } else {
        // Create new
        const { error } = await supabase
          .from("pricing_settings")
          .insert({
            task_name: formData.task_name,
            psw_hourly_rate: formData.psw_hourly_rate,
            client_hourly_rate: formData.client_hourly_rate,
            surcharge_flat: formData.surcharge_flat || null,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success("Pricing added successfully");
      }

      await fetchPricingSettings();
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving pricing:", error);
      toast.error(error.message || "Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing setting?")) return;

    const { error } = await supabase
      .from("pricing_settings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting pricing:", error);
      toast.error("Failed to delete pricing");
    } else {
      toast.success("Pricing deleted");
      fetchPricingSettings();
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("pricing_settings")
      .update({ is_active: !currentValue })
      .eq("id", id);

    if (error) {
      console.error("Error toggling active status:", error);
      toast.error("Failed to update status");
    } else {
      fetchPricingSettings();
    }
  };

  const calculateMargin = (pswRate: number, clientRate: number): number => {
    return clientRate - pswRate;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing Settings
            </CardTitle>
            <CardDescription>
              Configure hourly rates for PSWs and clients per task type
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Task Pricing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Edit Pricing" : "Add New Pricing"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="task_name">Task Name</Label>
                  <Input
                    id="task_name"
                    value={formData.task_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, task_name: e.target.value }))}
                    placeholder="e.g., Hospital Pick-up"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="psw_rate">PSW Hourly Rate ($)</Label>
                    <Input
                      id="psw_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.psw_hourly_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, psw_hourly_rate: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-muted-foreground">Amount paid to PSW</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client_rate">Client Hourly Rate ($)</Label>
                    <Input
                      id="client_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.client_hourly_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_hourly_rate: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-xs text-muted-foreground">Amount charged to client</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surcharge">Flat Surcharge ($)</Label>
                  <Input
                    id="surcharge"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.surcharge_flat}
                    onChange={(e) => setFormData(prev => ({ ...prev, surcharge_flat: parseFloat(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-muted-foreground">Optional flat fee for short shifts</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                {formData.psw_hourly_rate > 0 && formData.client_hourly_rate > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      Margin: ${calculateMargin(formData.psw_hourly_rate, formData.client_hourly_rate).toFixed(2)}/hr
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead className="text-right">PSW Rate</TableHead>
              <TableHead className="text-right">Client Rate</TableHead>
              <TableHead className="text-right">Surcharge</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricingSettings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No pricing settings configured. Add your first task pricing above.
                </TableCell>
              </TableRow>
            ) : (
              pricingSettings.map((item) => (
                <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{item.task_name}</TableCell>
                  <TableCell className="text-right">${item.psw_hourly_rate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.client_hourly_rate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    {item.surcharge_flat ? `$${item.surcharge_flat.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    ${calculateMargin(item.psw_hourly_rate, item.client_hourly_rate).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item.id, item.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
