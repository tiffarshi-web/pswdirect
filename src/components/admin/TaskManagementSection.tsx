import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Clock, DollarSign, Hospital, Stethoscope, FileUp, Shield, Receipt, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useServiceTasks, ServiceTask, ServiceCategory } from "@/hooks/useServiceTasks";

export const TaskManagementSection = () => {
  const { tasks, loading, createTask, updateTask, deleteTask } = useServiceTasks();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceTask> | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState<Partial<ServiceTask>>({
    task_name: "",
    included_minutes: 30,
    base_cost: 35,
    is_hospital_doctor: false,
    service_category: "standard",
    requires_discharge_upload: false,
    apply_hst: false,
    is_active: true,
  });

  const handleEdit = (task: ServiceTask) => {
    setEditingId(task.id);
    setEditForm({ ...task });
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingId) return;
    
    setSaving(true);
    await updateTask(editingId, editForm);
    setEditingId(null);
    setEditForm(null);
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleDelete = async (taskId: string) => {
    setSaving(true);
    await deleteTask(taskId);
    setSaving(false);
  };

  const handleAddNew = async () => {
    if (!newTask.task_name?.trim()) {
      return;
    }
    
    setSaving(true);
    await createTask(newTask as Omit<ServiceTask, "id" | "created_at" | "updated_at">);
    setIsAddingNew(false);
    setNewTask({
      task_name: "",
      included_minutes: 30,
      base_cost: 35,
      is_hospital_doctor: false,
      service_category: "standard",
      requires_discharge_upload: false,
      apply_hst: false,
      is_active: true,
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin-Only Notice */}
      <Card className="shadow-card border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Admin-Only Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Only users with the Admin role can view and edit these pricing and task settings.
                Changes are saved to the database immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header Info */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">First Hour Rule</h3>
              <p className="text-sm text-muted-foreground mt-1">
                As long as total task minutes ≤ 60, price stays at base 1-hour rate.
                If tasks exceed 60 minutes, additional time is billed in 15-minute increments.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Table */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Task Management
              </CardTitle>
              <CardDescription>
                Define task names, included minutes, and base costs (persisted to database)
              </CardDescription>
            </div>
            <Button 
              variant="brand" 
              size="sm" 
              onClick={() => setIsAddingNew(true)}
              disabled={isAddingNew || saving}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead className="text-center">Minutes</TableHead>
                <TableHead className="text-center">Base Cost</TableHead>
                <TableHead className="text-center">Category</TableHead>
                <TableHead className="text-center">HST 13%</TableHead>
                <TableHead className="text-center">Discharge Req.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Add New Row */}
              {isAddingNew && (
                <TableRow className="bg-primary/5">
                  <TableCell>
                    <Input
                      placeholder="Task name"
                      value={newTask.task_name || ""}
                      onChange={(e) => setNewTask(prev => ({ ...prev, task_name: e.target.value }))}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      step={5}
                      value={newTask.included_minutes || 30}
                      onChange={(e) => setNewTask(prev => ({ ...prev, included_minutes: parseInt(e.target.value) || 30 }))}
                      className="h-9 w-20 mx-auto text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={newTask.base_cost || 35}
                        onChange={(e) => setNewTask(prev => ({ ...prev, base_cost: parseFloat(e.target.value) || 0 }))}
                        className="h-9 w-20 text-center"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newTask.service_category || "standard"}
                      onValueChange={(value: ServiceCategory) => setNewTask(prev => ({ 
                        ...prev, 
                        service_category: value,
                        is_hospital_doctor: value !== "standard",
                        requires_discharge_upload: value === "hospital-discharge"
                      }))}
                    >
                      <SelectTrigger className="h-9 w-32 mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="doctor-appointment">Doctor Appt</SelectItem>
                        <SelectItem value="hospital-discharge">Hospital Discharge</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={newTask.apply_hst || false}
                      onCheckedChange={(checked) => setNewTask(prev => ({ ...prev, apply_hst: checked }))}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={newTask.requires_discharge_upload || false}
                      onCheckedChange={(checked) => setNewTask(prev => ({ ...prev, requires_discharge_upload: checked }))}
                      disabled={newTask.service_category !== "hospital-discharge"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="brand" size="sm" onClick={handleAddNew} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)} disabled={saving}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing Tasks */}
              {tasks.map((task) => (
                <TableRow key={task.id} className={!task.is_active ? "opacity-50" : ""}>
                  {editingId === task.id && editForm ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.task_name || ""}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, task_name: e.target.value } : null)}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={5}
                          max={240}
                          step={5}
                          value={editForm.included_minutes || 30}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, included_minutes: parseInt(e.target.value) || 30 } : null)}
                          className="h-9 w-20 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={editForm.base_cost || 35}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, base_cost: parseFloat(e.target.value) || 0 } : null)}
                            className="h-9 w-20 text-center"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editForm.service_category || "standard"}
                          onValueChange={(value: ServiceCategory) => setEditForm(prev => prev ? { 
                            ...prev, 
                            service_category: value,
                            is_hospital_doctor: value !== "standard",
                            requires_discharge_upload: value === "hospital-discharge"
                          } : null)}
                        >
                          <SelectTrigger className="h-9 w-32 mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="doctor-appointment">Doctor Appt</SelectItem>
                            <SelectItem value="hospital-discharge">Hospital Discharge</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={editForm.apply_hst || false}
                          onCheckedChange={(checked) => setEditForm(prev => prev ? { ...prev, apply_hst: checked } : null)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={editForm.requires_discharge_upload || false}
                          onCheckedChange={(checked) => setEditForm(prev => prev ? { ...prev, requires_discharge_upload: checked } : null)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="brand" size="sm" onClick={handleSaveEdit} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={saving}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.task_name}</span>
                          {task.is_hospital_doctor && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                              {task.service_category === "hospital-discharge" ? (
                                <><Hospital className="w-3 h-3 mr-1" />Discharge</>
                              ) : (
                                <><Stethoscope className="w-3 h-3 mr-1" />Doctor</>
                              )}
                            </Badge>
                          )}
                          {!task.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{task.included_minutes} min</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-primary">${Number(task.base_cost).toFixed(0)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={task.service_category === "hospital-discharge" ? "default" : task.service_category === "doctor-appointment" ? "secondary" : "outline"}
                          className={task.service_category === "hospital-discharge" ? "bg-amber-500" : ""}
                        >
                          {task.service_category === "hospital-discharge" ? "Hospital" : task.service_category === "doctor-appointment" ? "Doctor" : "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {task.apply_hst ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                            <Receipt className="w-3 h-3 mr-1" />+13%
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">Exempt</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {task.requires_discharge_upload ? (
                          <Badge variant="destructive" className="text-xs">
                            <FileUp className="w-3 h-3 mr-1" />Required
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(task)} disabled={saving}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(task.id)}
                            className="text-destructive hover:text-destructive"
                            disabled={saving}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}

              {tasks.length === 0 && !isAddingNew && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No tasks configured. Click "Add Task" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{tasks.filter(t => t.is_active).length}</p>
              <p className="text-sm text-muted-foreground">Active Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {tasks.filter(t => t.is_hospital_doctor && t.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">Hospital/Doctor Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                ${tasks.filter(t => t.is_active).length > 0 
                  ? (tasks.filter(t => t.is_active).reduce((sum, t) => sum + Number(t.base_cost), 0) / tasks.filter(t => t.is_active).length).toFixed(0)
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Base Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
