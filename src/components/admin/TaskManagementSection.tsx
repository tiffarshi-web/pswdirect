import { useState } from "react";
import { Plus, Trash2, Save, X, Clock, DollarSign, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useServiceTasks, type ServiceTask, type ServiceTaskInput } from "@/hooks/useServiceTasks";

interface EditableTask extends ServiceTask {
  isEditing?: boolean;
  editedName?: string;
  editedMinutes?: number;
  editedCharge?: number;
}

export const TaskManagementSection = () => {
  const { tasks, loading, addTask, updateTask, deleteTask } = useServiceTasks();
  const [editingTasks, setEditingTasks] = useState<Record<string, EditableTask>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTask, setNewTask] = useState<ServiceTaskInput>({
    task_name: "",
    allotted_time_minutes: 30,
    extra_charge: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState<string | null>(null);

  const startEditing = (task: ServiceTask) => {
    setEditingTasks((prev) => ({
      ...prev,
      [task.id]: {
        ...task,
        isEditing: true,
        editedName: task.task_name,
        editedMinutes: task.allotted_time_minutes,
        editedCharge: task.extra_charge,
      },
    }));
  };

  const cancelEditing = (taskId: string) => {
    setEditingTasks((prev) => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
  };

  const handleSaveEdit = async (taskId: string) => {
    const editData = editingTasks[taskId];
    if (!editData) return;

    setSaving(taskId);
    const success = await updateTask(taskId, {
      task_name: editData.editedName,
      allotted_time_minutes: editData.editedMinutes,
      extra_charge: editData.editedCharge,
    });

    if (success) {
      cancelEditing(taskId);
    }
    setSaving(null);
  };

  const handleFieldChange = (taskId: string, field: keyof EditableTask, value: string | number) => {
    setEditingTasks((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value,
      },
    }));
  };

  const handleAddNew = async () => {
    if (!newTask.task_name.trim()) return;

    setSaving("new");
    const success = await addTask(newTask);
    if (success) {
      setIsAddingNew(false);
      setNewTask({
        task_name: "",
        allotted_time_minutes: 30,
        extra_charge: 0,
        is_active: true,
      });
    }
    setSaving(null);
  };

  const handleToggleActive = async (task: ServiceTask) => {
    setSaving(task.id);
    await updateTask(task.id, { is_active: !task.is_active });
    setSaving(null);
  };

  const handleDelete = async (taskId: string) => {
    setSaving(taskId);
    await deleteTask(taskId);
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
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
                Changes here are saved to the database immediately and affect all new bookings.
                The Client Booking page uses these exact values for duration calculations.
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
              <h3 className="font-medium text-foreground">How It Works</h3>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Time Allotment:</strong> Suggested duration shown to clients when selecting this task.
                <br />
                <strong>Extra Cost:</strong> Additional charge added to the base booking fee for this task.
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
                Service Tasks
              </CardTitle>
              <CardDescription>
                Manage task names, time allotments, and extra charges
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
                <TableHead className="w-[40%]">Task Name</TableHead>
                <TableHead className="text-center">Time (min)</TableHead>
                <TableHead className="text-center">Extra Cost ($)</TableHead>
                <TableHead className="text-center">Active</TableHead>
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
                      value={newTask.task_name}
                      onChange={(e) => setNewTask((prev) => ({ ...prev, task_name: e.target.value }))}
                      className="h-9"
                      autoFocus
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={newTask.allotted_time_minutes}
                      onChange={(e) =>
                        setNewTask((prev) => ({
                          ...prev,
                          allotted_time_minutes: parseInt(e.target.value) || 30,
                        }))
                      }
                      className="h-9 w-24 mx-auto text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={newTask.extra_charge}
                        onChange={(e) =>
                          setNewTask((prev) => ({
                            ...prev,
                            extra_charge: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="h-9 w-20 text-center"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={newTask.is_active}
                      onCheckedChange={(checked) =>
                        setNewTask((prev) => ({ ...prev, is_active: checked }))
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="brand"
                        size="sm"
                        onClick={handleAddNew}
                        disabled={!newTask.task_name.trim() || saving === "new"}
                      >
                        {saving === "new" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setIsAddingNew(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* Existing Tasks */}
              {tasks.map((task) => {
                const editData = editingTasks[task.id];
                const isEditing = !!editData?.isEditing;

                return (
                  <TableRow key={task.id} className={!task.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editData.editedName || ""}
                          onChange={(e) => handleFieldChange(task.id, "editedName", e.target.value)}
                          className="h-9"
                        />
                      ) : (
                        <span
                          className="font-medium cursor-pointer hover:text-primary"
                          onClick={() => startEditing(task)}
                        >
                          {task.task_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          type="number"
                          min={5}
                          max={480}
                          step={5}
                          value={editData.editedMinutes || 0}
                          onChange={(e) =>
                            handleFieldChange(task.id, "editedMinutes", parseInt(e.target.value) || 0)
                          }
                          className="h-9 w-24 mx-auto text-center"
                        />
                      ) : (
                        <div className="flex justify-center">
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80"
                            onClick={() => startEditing(task)}
                          >
                            {task.allotted_time_minutes} min
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={editData.editedCharge || 0}
                            onChange={(e) =>
                              handleFieldChange(task.id, "editedCharge", parseFloat(e.target.value) || 0)
                            }
                            className="h-9 w-20 text-center"
                          />
                        </div>
                      ) : (
                        <div
                          className="text-center font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => startEditing(task)}
                        >
                          ${task.extra_charge.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={task.is_active}
                        onCheckedChange={() => handleToggleActive(task)}
                        disabled={saving === task.id}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              variant="brand"
                              size="sm"
                              onClick={() => handleSaveEdit(task.id)}
                              disabled={saving === task.id}
                            >
                              {saving === task.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => cancelEditing(task.id)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={saving === task.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{task.task_name}"? This action cannot
                                  be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(task.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {tasks.length === 0 && !isAddingNew && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
              <p className="text-2xl font-bold text-primary">{tasks.length}</p>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">
                {tasks.filter((t) => t.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                <DollarSign className="w-5 h-5" />
                {tasks.length > 0
                  ? Math.round(tasks.reduce((acc, t) => acc + t.extra_charge, 0) / tasks.length)
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Extra Cost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
