import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ServiceTask {
  id: string;
  task_name: string;
  allotted_time_minutes: number;
  extra_charge: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceTaskInput {
  task_name: string;
  allotted_time_minutes: number;
  extra_charge: number;
  is_active?: boolean;
}

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
      .order("task_name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setTasks([]);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (task: ServiceTaskInput): Promise<boolean> => {
    const { data, error: insertError } = await supabase
      .from("service_tasks")
      .insert({
        task_name: task.task_name,
        allotted_time_minutes: task.allotted_time_minutes,
        extra_charge: task.extra_charge,
        is_active: task.is_active ?? true,
      })
      .select()
      .single();

    if (insertError) {
      toast.error(`Failed to add task: ${insertError.message}`);
      return false;
    }

    setTasks((prev) => [...prev, data].sort((a, b) => a.task_name.localeCompare(b.task_name)));
    toast.success("Task added successfully!");
    return true;
  };

  const updateTask = async (id: string, updates: Partial<ServiceTaskInput>): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from("service_tasks")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      toast.error(`Failed to update task: ${updateError.message}`);
      return false;
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t))
    );
    toast.success("Task updated!");
    return true;
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from("service_tasks")
      .delete()
      .eq("id", id);

    if (deleteError) {
      toast.error(`Failed to delete task: ${deleteError.message}`);
      return false;
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Task deleted!");
    return true;
  };

  const getActiveTasks = () => tasks.filter((t) => t.is_active);

  // Calculate total duration for selected task IDs
  const calculateTotalDuration = (taskIds: string[]): number => {
    return tasks
      .filter((t) => taskIds.includes(t.id))
      .reduce((sum, t) => sum + t.allotted_time_minutes, 0);
  };

  // Calculate total extra charges for selected task IDs
  const calculateTotalExtraCharge = (taskIds: string[]): number => {
    return tasks
      .filter((t) => taskIds.includes(t.id))
      .reduce((sum, t) => sum + t.extra_charge, 0);
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
    getActiveTasks,
    calculateTotalDuration,
    calculateTotalExtraCharge,
  };
};
