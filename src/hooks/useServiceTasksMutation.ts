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

// Convert TaskConfig to database insert format
const taskConfigToInsert = (task: TaskConfig) => ({
  task_name: task.name,
  included_minutes: task.includedMinutes,
  base_cost: task.baseCost,
  is_hospital_doctor: task.isHospitalDoctor,
  service_category: task.serviceCategory,
  requires_discharge_upload: task.requiresDischargeUpload,
  apply_hst: task.applyHST,
  is_active: true,
  legacy_extra_charge: 0,
});

// Convert TaskConfig to database update format
const taskConfigToUpdate = (task: TaskConfig) => ({
  task_name: task.name,
  included_minutes: task.includedMinutes,
  base_cost: task.baseCost,
  is_hospital_doctor: task.isHospitalDoctor,
  service_category: task.serviceCategory,
  requires_discharge_upload: task.requiresDischargeUpload,
  apply_hst: task.applyHST,
});

// Create a new service task
export const createServiceTask = async (task: TaskConfig): Promise<TaskConfig | null> => {
  const insertData = taskConfigToInsert(task);
  
  const { data, error } = await supabase
    .from("service_tasks")
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error("Error creating service task:", error);
    throw error;
  }

  // Update localStorage cache
  updateLocalCache();
  
  return data ? rowToTaskConfig(data as ServiceTaskRow) : null;
};

// Update an existing service task
export const updateServiceTask = async (id: string, task: Partial<TaskConfig>): Promise<TaskConfig | null> => {
  const updateData: Record<string, unknown> = {};
  
  if (task.name !== undefined) updateData.task_name = task.name;
  if (task.includedMinutes !== undefined) updateData.included_minutes = task.includedMinutes;
  if (task.baseCost !== undefined) updateData.base_cost = task.baseCost;
  if (task.isHospitalDoctor !== undefined) updateData.is_hospital_doctor = task.isHospitalDoctor;
  if (task.serviceCategory !== undefined) updateData.service_category = task.serviceCategory;
  if (task.requiresDischargeUpload !== undefined) updateData.requires_discharge_upload = task.requiresDischargeUpload;
  if (task.applyHST !== undefined) updateData.apply_hst = task.applyHST;

  const { data, error } = await supabase
    .from("service_tasks")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating service task:", error);
    throw error;
  }

  // Update localStorage cache
  updateLocalCache();
  
  return data ? rowToTaskConfig(data as ServiceTaskRow) : null;
};

// Soft delete a service task (set is_active to false)
export const deleteServiceTask = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from("service_tasks")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deleting service task:", error);
    throw error;
  }

  // Update localStorage cache
  updateLocalCache();
  
  return true;
};

// Hard delete a service task (permanently remove)
export const hardDeleteServiceTask = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from("service_tasks")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error hard deleting service task:", error);
    throw error;
  }

  // Update localStorage cache
  updateLocalCache();
  
  return true;
};

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

// Update localStorage cache after mutations
const updateLocalCache = async () => {
  const { data } = await supabase
    .from("service_tasks")
    .select("*")
    .eq("is_active", true)
    .order("task_name");
    
  if (data) {
    const converted = data.map(row => rowToTaskConfig(row as ServiceTaskRow));
    localStorage.setItem("adminTasks", JSON.stringify(converted));
  }
};
