import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Save, X, Clock, DollarSign, Hospital, Stethoscope, FileUp, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { getTasks, saveTasks, type TaskConfig, type ServiceCategory } from "@/lib/taskConfig";

export const TaskManagementSection = () => {
  const [tasks, setTasks] = useState<TaskConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TaskConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTask, setNewTask] = useState<TaskConfig>({
    id: "",
    name: "",
    includedMinutes: 30,
    baseCost: 35,
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
  });

  useEffect(() => {
    setTasks(getTasks());
  }, []);

  const handleEdit = (task: TaskConfig) => {
    setEditingId(task.id);
    setEditForm({ ...task });
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    
    const updatedTasks = tasks.map(t => 
      t.id === editForm.id ? editForm : t
    );
    saveTasks(updatedTasks);
    setTasks(updatedTasks);
    setEditingId(null);
    setEditForm(null);
    toast.success("Task updated successfully!");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleDelete = (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    saveTasks(updatedTasks);
    setTasks(updatedTasks);
    toast.success("Task deleted!");
  };

  const handleAddNew = () => {
    if (!newTask.name.trim()) {
      toast.error("Task name is required");
      return;
    }
    
    const id = newTask.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (tasks.some(t => t.id === id)) {
      toast.error("A task with this name already exists");
      return;
    }
    
    const taskToAdd = { ...newTask, id };
    const updatedTasks = [...tasks, taskToAdd];
    saveTasks(updatedTasks);
    setTasks(updatedTasks);
    setIsAddingNew(false);
    setNewTask({
      id: "",
      name: "",
      includedMinutes: 30,
      baseCost: 35,
      isHospitalDoctor: false,
      serviceCategory: "standard",
      requiresDischargeUpload: false,
    });
    toast.success("New task added!");
  };

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
                Changes here affect all new bookings immediately after saving.
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
                Define task names, included minutes, and base costs
              </CardDescription>
            </div>
            <Button 
              variant="brand" 
              size="sm" 
              onClick={() => setIsAddingNew(true)}
              disabled={isAddingNew}
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
                <TableHead className="text-center">Add-on Price</TableHead>
                <TableHead className="text-center">Category</TableHead>
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
                      value={newTask.name}
                      onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      step={5}
                      value={newTask.includedMinutes}
                      onChange={(e) => setNewTask(prev => ({ ...prev, includedMinutes: parseInt(e.target.value) || 30 }))}
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
                        value={newTask.baseCost}
                        onChange={(e) => setNewTask(prev => ({ ...prev, baseCost: parseInt(e.target.value) || 0 }))}
                        className="h-9 w-20 text-center"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={newTask.serviceCategory}
                      onValueChange={(value: ServiceCategory) => setNewTask(prev => ({ 
                        ...prev, 
                        serviceCategory: value,
                        isHospitalDoctor: value !== "standard",
                        requiresDischargeUpload: value === "hospital-discharge"
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
                      checked={newTask.requiresDischargeUpload}
                      onCheckedChange={(checked) => setNewTask(prev => ({ ...prev, requiresDischargeUpload: checked }))}
                      disabled={newTask.serviceCategory !== "hospital-discharge"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="brand" size="sm" onClick={handleAddNew}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing Tasks */}
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  {editingId === task.id && editForm ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                          className="h-9"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={5}
                          max={240}
                          step={5}
                          value={editForm.includedMinutes}
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, includedMinutes: parseInt(e.target.value) || 30 } : null)}
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
                            value={editForm.baseCost}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, baseCost: parseInt(e.target.value) || 0 } : null)}
                            className="h-9 w-20 text-center"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={editForm.serviceCategory || "standard"}
                          onValueChange={(value: ServiceCategory) => setEditForm(prev => prev ? { 
                            ...prev, 
                            serviceCategory: value,
                            isHospitalDoctor: value !== "standard",
                            requiresDischargeUpload: value === "hospital-discharge"
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
                          checked={editForm.requiresDischargeUpload || false}
                          onCheckedChange={(checked) => setEditForm(prev => prev ? { ...prev, requiresDischargeUpload: checked } : null)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="brand" size="sm" onClick={handleSaveEdit}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.name}</span>
                          {task.isHospitalDoctor && (
                            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                              {task.serviceCategory === "hospital-discharge" ? (
                                <><Hospital className="w-3 h-3 mr-1" />Discharge</>
                              ) : (
                                <><Stethoscope className="w-3 h-3 mr-1" />Doctor</>
                              )}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{task.includedMinutes} min</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-primary">${task.baseCost}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={task.serviceCategory === "hospital-discharge" ? "default" : task.serviceCategory === "doctor-appointment" ? "secondary" : "outline"}
                          className={task.serviceCategory === "hospital-discharge" ? "bg-amber-500" : ""}
                        >
                          {task.serviceCategory === "hospital-discharge" ? "Hospital" : task.serviceCategory === "doctor-appointment" ? "Doctor" : "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {task.requiresDischargeUpload ? (
                          <Badge variant="destructive" className="text-xs">
                            <FileUp className="w-3 h-3 mr-1" />Required
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(task.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {tasks.filter(t => t.isHospitalDoctor).length}
              </p>
              <p className="text-sm text-muted-foreground">Hospital/Doctor</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                ${Math.round(tasks.reduce((acc, t) => acc + t.baseCost, 0) / tasks.length || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Avg. Base Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
