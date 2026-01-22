import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TaskConfig, ServiceCategory } from "@/lib/taskConfig";

interface ServiceTaskRow {
  id: string;
  task_name: string;
  included_minutes: number;
  base_cost: number;
  is_hospital_doctor: boolean;
  service_category: string;
  requires_discharge_upload: boolean;
  apply_hst: boolean;
  is_active: boolean;
  legacy_extra_charge: number;
}

// Convert database row to TaskConfig
const rowToTaskConfig = (row: ServiceTaskRow): TaskConfig => ({
  id: row.id,
  name: row.task_name,
  includedMinutes: row.included_minutes,
  baseCost: row.base_cost,
  isHospitalDoctor: row.is_hospital_doctor,
  serviceCategory: row.service_category as ServiceCategory,
  requiresDischargeUpload: row.requires_discharge_upload,
  applyHST: row.apply_hst,
});

// Hook for fetching service tasks from database
export const useServiceTasks = () => {
  const [tasks, setTasks] = useState<TaskConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from("service_tasks")
      .select("*")
      .eq("is_active", true)
      .order("task_name");
    
    if (fetchError) {
      console.error("Error fetching service tasks:", fetchError);
      setError(fetchError.message);
      setTasks([]);
    } else {
      const converted = (data || []).map(rowToTaskConfig);
      setTasks(converted);
      // Also cache to localStorage for offline/fallback
      localStorage.setItem("adminTasks", JSON.stringify(converted));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
};

// Standalone async function to fetch tasks (for use outside React components)
export const fetchServiceTasksAsync = async (): Promise<TaskConfig[]> => {
  const { data, error } = await supabase
    .from("service_tasks")
    .select("*")
    .eq("is_active", true)
    .order("task_name");
  
  if (error) {
    console.error("Error fetching service tasks:", error);
    // Fallback to localStorage cache
    const cached = localStorage.getItem("adminTasks");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return [];
      }
    }
    return [];
  }
  
  const converted = (data || []).map(rowToTaskConfig);
  // Update cache
  localStorage.setItem("adminTasks", JSON.stringify(converted));
  return converted;
};

// Synchronous getter with cache (for immediate use in calculations)
export const getServiceTasksCached = (): TaskConfig[] => {
  const cached = localStorage.getItem("adminTasks");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }
  return [];
};
