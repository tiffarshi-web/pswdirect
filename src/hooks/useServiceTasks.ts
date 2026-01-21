// Hook for fetching and managing service tasks from Supabase
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ServiceCategory = "standard" | "doctor-appointment" | "hospital-discharge";

export interface ServiceTask {
  id: string;
  task_name: string;
  included_minutes: number;
  base_cost: number;
  is_hospital_doctor: boolean;
  service_category: ServiceCategory;
  requires_discharge_upload: boolean;
  apply_hst: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Transform DB row to legacy TaskConfig format for compatibility
export interface TaskConfig {
  id: string;
  name: string;
  includedMinutes: number;
  baseCost: number;
  isHospitalDoctor: boolean;
  serviceCategory: ServiceCategory;
  requiresDischargeUpload: boolean;
  applyHST: boolean;
}

export const dbToTaskConfig = (task: ServiceTask): TaskConfig => ({
  id: task.id,
  name: task.task_name,
  includedMinutes: task.included_minutes,
  baseCost: Number(task.base_cost),
  isHospitalDoctor: task.is_hospital_doctor,
  serviceCategory: task.service_category as ServiceCategory,
  requiresDischargeUpload: task.requires_discharge_upload,
  applyHST: task.apply_hst,
});

export const taskConfigToDb = (task: TaskConfig): Partial<ServiceTask> => ({
  id: task.id,
  task_name: task.name,
  included_minutes: task.includedMinutes,
  base_cost: task.baseCost,
  is_hospital_doctor: task.isHospitalDoctor,
  service_category: task.serviceCategory,
  requires_discharge_upload: task.requiresDischargeUpload,
  apply_hst: task.applyHST,
});

export const useServiceTasks = () => {
  const [tasks, setTasks] = useState<ServiceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from("service_tasks")
      .select("*")
      .order("task_name");

    if (fetchError) {
      console.error("Error fetching service tasks:", fetchError);
      setError(fetchError.message);
      toast.error("Failed to load tasks");
    } else {
      // Cast the data to include new columns
      setTasks((data || []) as ServiceTask[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (task: Omit<ServiceTask, "id" | "created_at" | "updated_at">) => {
    const { data, error } = await supabase
      .from("service_tasks")
      .insert({
        task_name: task.task_name,
        included_minutes: task.included_minutes,
        base_cost: task.base_cost,
        is_hospital_doctor: task.is_hospital_doctor,
        service_category: task.service_category,
        requires_discharge_upload: task.requires_discharge_upload,
        apply_hst: task.apply_hst,
        is_active: task.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task");
      return null;
    }

    toast.success("Task created successfully");
    await fetchTasks();
    return data;
  };

  const updateTask = async (id: string, updates: Partial<ServiceTask>) => {
    const { error } = await supabase
      .from("service_tasks")
      .update({
        task_name: updates.task_name,
        included_minutes: updates.included_minutes,
        base_cost: updates.base_cost,
        is_hospital_doctor: updates.is_hospital_doctor,
        service_category: updates.service_category,
        requires_discharge_upload: updates.requires_discharge_upload,
        apply_hst: updates.apply_hst,
        is_active: updates.is_active,
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
      return false;
    }

    toast.success("Task updated successfully");
    await fetchTasks();
    return true;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from("service_tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
      return false;
    }

    toast.success("Task deleted successfully");
    await fetchTasks();
    return true;
  };

  // Get tasks in legacy TaskConfig format
  const getTaskConfigs = (): TaskConfig[] => {
    return tasks.filter(t => t.is_active).map(dbToTaskConfig);
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    getTaskConfigs,
  };
};

// Standalone function to fetch tasks (for use outside React components)
export const fetchTasksFromDb = async (): Promise<TaskConfig[]> => {
  const { data, error } = await supabase
    .from("service_tasks")
    .select("*")
    .eq("is_active", true)
    .order("task_name");

  if (error) {
    console.error("Error fetching service tasks:", error);
    return [];
  }

  return ((data || []) as ServiceTask[]).map(dbToTaskConfig);
};
