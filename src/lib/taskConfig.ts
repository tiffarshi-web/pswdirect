// Task Configuration - Admin-managed task definitions
// Now fetches from Supabase service_tasks table with localStorage cache
import { supabase } from "@/integrations/supabase/client";

export type ServiceCategory = "standard" | "doctor-appointment" | "hospital-discharge";

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

// Default tasks used as fallback when DB is unavailable
export const DEFAULT_TASKS: TaskConfig[] = [
  { id: "personal-care", name: "Personal Care", includedMinutes: 45, baseCost: 35, isHospitalDoctor: false, serviceCategory: "standard", requiresDischargeUpload: false, applyHST: false },
  { id: "companionship", name: "Companionship Visit", includedMinutes: 60, baseCost: 32, isHospitalDoctor: false, serviceCategory: "standard", requiresDischargeUpload: false, applyHST: false },
  { id: "meal-prep", name: "Meal Preparation", includedMinutes: 30, baseCost: 30, isHospitalDoctor: false, serviceCategory: "standard", requiresDischargeUpload: false, applyHST: false },
  { id: "medication", name: "Medication Reminders", includedMinutes: 15, baseCost: 35, isHospitalDoctor: false, serviceCategory: "standard", requiresDischargeUpload: false, applyHST: false },
  { id: "light-housekeeping", name: "Light Housekeeping", includedMinutes: 30, baseCost: 28, isHospitalDoctor: false, serviceCategory: "standard", requiresDischargeUpload: false, applyHST: true },
  { id: "transportation", name: "Transportation Assistance", includedMinutes: 45, baseCost: 38, isHospitalDoctor: false, serviceCategory: "standard", requiresDischargeUpload: false, applyHST: true },
  { id: "respite", name: "Respite Care", includedMinutes: 60, baseCost: 40, isHospitalDoctor: false, serviceCategory: "standard", requiresDischargeUpload: false, applyHST: false },
  { id: "doctor-escort", name: "Doctor Appointment Escort", includedMinutes: 60, baseCost: 38, isHospitalDoctor: true, serviceCategory: "doctor-appointment", requiresDischargeUpload: false, applyHST: true },
  { id: "hospital-visit", name: "Hospital Pick-up/Drop-off (Discharge)", includedMinutes: 90, baseCost: 50, isHospitalDoctor: true, serviceCategory: "hospital-discharge", requiresDischargeUpload: true, applyHST: true },
];

// Cache key for localStorage
const TASKS_CACHE_KEY = "cachedServiceTasks";
const TASKS_CACHE_TIMESTAMP_KEY = "cachedServiceTasksTimestamp";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Transform DB row to TaskConfig
const dbRowToTaskConfig = (row: Record<string, unknown>): TaskConfig => ({
  id: String(row.id),
  name: String(row.task_name || ""),
  includedMinutes: Number(row.included_minutes) || 30,
  baseCost: Number(row.base_cost) || 35,
  isHospitalDoctor: Boolean(row.is_hospital_doctor),
  serviceCategory: (row.service_category as ServiceCategory) || "standard",
  requiresDischargeUpload: Boolean(row.requires_discharge_upload),
  applyHST: Boolean(row.apply_hst),
});

// Get tasks synchronously from cache, or return defaults
export const getTasks = (): TaskConfig[] => {
  const cached = localStorage.getItem(TASKS_CACHE_KEY);
  const timestamp = localStorage.getItem(TASKS_CACHE_TIMESTAMP_KEY);
  
  if (cached && timestamp) {
    const age = Date.now() - parseInt(timestamp, 10);
    if (age < CACHE_TTL_MS) {
      try {
        return JSON.parse(cached);
      } catch {
        // Fall through to defaults
      }
    }
  }
  
  // Trigger async refresh
  refreshTasksCache();
  
  return DEFAULT_TASKS;
};

// Async function to refresh tasks from database
export const refreshTasksCache = async (): Promise<TaskConfig[]> => {
  try {
    const { data, error } = await supabase
      .from("service_tasks")
      .select("*")
      .eq("is_active", true)
      .order("task_name");

    if (error) {
      console.error("Error fetching tasks from DB:", error);
      return getTasks(); // Return cached or defaults
    }

    const tasks = (data || []).map(dbRowToTaskConfig);
    
    // Update cache
    localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
    localStorage.setItem(TASKS_CACHE_TIMESTAMP_KEY, String(Date.now()));
    
    return tasks;
  } catch (err) {
    console.error("Failed to refresh tasks cache:", err);
    return getTasks();
  }
};

// Get tasks async (preferred method for components that can await)
export const getTasksAsync = async (): Promise<TaskConfig[]> => {
  return refreshTasksCache();
};

// Save tasks is now a no-op since we use Supabase
// Kept for backward compatibility
export const saveTasks = (tasks: TaskConfig[]): void => {
  console.warn("saveTasks is deprecated. Use useServiceTasks hook for DB operations.");
  localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
  localStorage.setItem(TASKS_CACHE_TIMESTAMP_KEY, String(Date.now()));
};

// Update a single task
export const updateTask = (taskId: string, updates: Partial<TaskConfig>): TaskConfig[] => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === taskId);
  if (index !== -1) {
    tasks[index] = { ...tasks[index], ...updates };
    saveTasks(tasks);
  }
  return tasks;
};

// Add a new task
export const addTask = (task: TaskConfig): TaskConfig[] => {
  const tasks = getTasks();
  tasks.push(task);
  saveTasks(tasks);
  return tasks;
};

// Delete a task
export const deleteTask = (taskId: string): TaskConfig[] => {
  const tasks = getTasks().filter(t => t.id !== taskId);
  saveTasks(tasks);
  return tasks;
};

// Get a task by ID
export const getTaskById = (taskId: string): TaskConfig | undefined => {
  return getTasks().find(t => t.id === taskId);
};

// Check if any selected tasks require discharge upload
export const requiresDischargeUpload = (selectedTaskIds: string[]): boolean => {
  const tasks = getTasks();
  return selectedTaskIds.some(taskId => {
    const task = tasks.find(t => t.id === taskId);
    return task?.requiresDischargeUpload === true;
  });
};

// Get service category for selected tasks (returns highest priority)
export const getServiceCategoryForTasks = (selectedTaskIds: string[]): ServiceCategory => {
  const tasks = getTasks();
  let hasHospitalDischarge = false;
  let hasDoctorAppointment = false;
  
  selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task?.serviceCategory === "hospital-discharge") hasHospitalDischarge = true;
    if (task?.serviceCategory === "doctor-appointment") hasDoctorAppointment = true;
  });
  
  if (hasHospitalDischarge) return "hospital-discharge";
  if (hasDoctorAppointment) return "doctor-appointment";
  return "standard";
};

// Calculate time remaining in base hour
export const calculateTimeRemaining = (selectedTaskIds: string[]): {
  totalMinutes: number;
  baseHourMinutes: number;
  remainingMinutes: number;
  exceeds: boolean;
  additionalBlocks: number;
  additionalCost: number;
} => {
  const tasks = getTasks();
  const BASE_HOUR_MINUTES = 60;
  const BLOCK_MINUTES = 30;
  
  let totalMinutes = 0;
  let totalCost = 0;
  let hasHospitalDoctor = false;
  
  selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      totalMinutes += task.includedMinutes;
      totalCost += task.baseCost;
      if (task.isHospitalDoctor) {
        hasHospitalDoctor = true;
      }
    }
  });
  
  // Hospital/Doctor services default to 60-min minimum
  if (hasHospitalDoctor && totalMinutes < 60) {
    totalMinutes = 60;
  }
  
  const exceeds = totalMinutes > BASE_HOUR_MINUTES;
  const remainingMinutes = exceeds ? 0 : BASE_HOUR_MINUTES - totalMinutes;
  
  // Calculate additional 30-min blocks if exceeds
  const overageMinutes = Math.max(0, totalMinutes - BASE_HOUR_MINUTES);
  const additionalBlocks = Math.ceil(overageMinutes / BLOCK_MINUTES);
  
  // Average hourly rate for additional time
  const avgRate = selectedTaskIds.length > 0 ? totalCost / selectedTaskIds.length : 35;
  const additionalCost = additionalBlocks * (avgRate / 2); // 30-min blocks = half hourly rate
  
  return {
    totalMinutes,
    baseHourMinutes: BASE_HOUR_MINUTES,
    remainingMinutes,
    exceeds,
    additionalBlocks,
    additionalCost,
  };
};

// Calculate base hour price
export const calculateTaskBasedPrice = (selectedTaskIds: string[], surgeMultiplier: number = 1): {
  baseHourTotal: number;
  additionalCost: number;
  surgeAmount: number;
  total: number;
  totalMinutes: number;
  exceeds: boolean;
  remainingMinutes: number;
  avgHourlyRate: number;
} => {
  const tasks = getTasks();
  let totalCost = 0;
  
  selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      totalCost += task.baseCost;
    }
  });
  
  // Base hour total is the average rate of selected tasks (min 1 hour)
  const avgHourlyRate = selectedTaskIds.length > 0 ? totalCost / selectedTaskIds.length : 35;
  const baseHourTotal = avgHourlyRate; // 1 hour minimum
  
  const timeCalc = calculateTimeRemaining(selectedTaskIds);
  
  const subtotal = baseHourTotal + timeCalc.additionalCost;
  const surgeAmount = subtotal * (surgeMultiplier - 1);
  const total = subtotal + surgeAmount;
  
  return {
    baseHourTotal,
    additionalCost: timeCalc.additionalCost,
    surgeAmount,
    total,
    totalMinutes: timeCalc.totalMinutes,
    exceeds: timeCalc.exceeds,
    remainingMinutes: timeCalc.remainingMinutes,
    avgHourlyRate,
  };
};
