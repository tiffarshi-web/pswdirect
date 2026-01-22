// Task Configuration - Admin-managed task definitions
// Stores task names, included minutes, base costs, and service type flags

export type ServiceCategory = "standard" | "doctor-appointment" | "hospital-discharge";

export interface TaskConfig {
  id: string;
  name: string;
  includedMinutes: number;
  baseCost: number; // Add-on price for this task
  isHospitalDoctor: boolean; // These default to 60-min minimum regardless of other tasks
  serviceCategory: ServiceCategory; // Differentiates doctor vs hospital vs standard
  requiresDischargeUpload: boolean; // If true, PSW must upload discharge papers before sign-out
  applyHST: boolean; // If true, 13% HST is applied to this task
}

export const DEFAULT_TASKS: TaskConfig[] = [
  { 
    id: "personal-care", 
    name: "Personal Care", 
    includedMinutes: 45, 
    baseCost: 35, 
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
    applyHST: false, // Personal care is HST exempt
  },
  { 
    id: "companionship", 
    name: "Companionship Visit", 
    includedMinutes: 60, 
    baseCost: 32, 
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
    applyHST: false, // Personal care is HST exempt
  },
  { 
    id: "meal-prep", 
    name: "Meal Preparation", 
    includedMinutes: 30, 
    baseCost: 30, 
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
    applyHST: false, // Personal care is HST exempt
  },
  { 
    id: "medication", 
    name: "Medication Reminders", 
    includedMinutes: 15, 
    baseCost: 35, 
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
    applyHST: false, // Personal care is HST exempt
  },
  { 
    id: "light-housekeeping", 
    name: "Light Housekeeping", 
    includedMinutes: 30, 
    baseCost: 28, 
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
    applyHST: true, // Housekeeping is taxable
  },
  { 
    id: "transportation", 
    name: "Transportation Assistance", 
    includedMinutes: 45, 
    baseCost: 38, 
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
    applyHST: true, // Transportation is taxable
  },
  { 
    id: "respite", 
    name: "Respite Care", 
    includedMinutes: 60, 
    baseCost: 40, 
    isHospitalDoctor: false,
    serviceCategory: "standard",
    requiresDischargeUpload: false,
    applyHST: false, // Personal care is HST exempt
  },
  { 
    id: "doctor-escort", 
    name: "Doctor Appointment Escort", 
    includedMinutes: 60, 
    baseCost: 38, 
    isHospitalDoctor: true,
    serviceCategory: "doctor-appointment",
    requiresDischargeUpload: false,
    applyHST: true, // Medical escort is taxable
  },
  { 
    id: "hospital-visit", 
    name: "Hospital Pick-up/Drop-off (Discharge)", 
    includedMinutes: 90, 
    baseCost: 50, 
    isHospitalDoctor: true,
    serviceCategory: "hospital-discharge",
    requiresDischargeUpload: true, // MUST upload discharge papers
    applyHST: true, // Medical escort is taxable
  },
];

// In-memory cache for tasks fetched from Supabase
let cachedTasks: TaskConfig[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Get tasks synchronously from cache or defaults (for immediate render)
export const getTasks = (): TaskConfig[] => {
  // Return cached tasks if available and fresh
  if (cachedTasks && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedTasks;
  }
  // Fallback to localStorage or defaults for sync access
  const stored = localStorage.getItem("adminTasks");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((t: Partial<TaskConfig>) => ({
        ...t,
        serviceCategory: t.serviceCategory || (t.isHospitalDoctor ? "doctor-appointment" : "standard"),
        requiresDischargeUpload: t.requiresDischargeUpload || false,
        applyHST: t.applyHST ?? (t.id === "light-housekeeping" || t.id === "transportation" || t.isHospitalDoctor),
      }));
    } catch {
      return DEFAULT_TASKS;
    }
  }
  return DEFAULT_TASKS;
};

// Async function to fetch tasks from Supabase and update cache
export const fetchTasksFromSupabase = async (): Promise<TaskConfig[]> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    
    const { data, error } = await supabase
      .from("service_tasks")
      .select("*")
      .eq("is_active", true)
      .order("task_name", { ascending: true });

    if (error) {
      console.error("[taskConfig] Supabase fetch error:", error.message, error.details, error.hint);
      return getTasks(); // Fallback to cached/localStorage
    }

    if (!data || data.length === 0) {
      console.warn("[taskConfig] No active tasks found in service_tasks table");
      return DEFAULT_TASKS;
    }

    // Map Supabase columns to TaskConfig interface
    const tasks: TaskConfig[] = data.map((row) => ({
      id: row.id,
      name: row.task_name,
      includedMinutes: row.included_minutes,
      baseCost: Number(row.base_cost),
      isHospitalDoctor: row.is_hospital_doctor,
      serviceCategory: row.service_category as ServiceCategory,
      requiresDischargeUpload: row.requires_discharge_upload,
      applyHST: row.apply_hst,
    }));

    // Update cache and localStorage for sync access
    cachedTasks = tasks;
    cacheTimestamp = Date.now();
    localStorage.setItem("adminTasks", JSON.stringify(tasks));
    
    console.log("[taskConfig] Successfully fetched", tasks.length, "tasks from Supabase");
    return tasks;
  } catch (err) {
    console.error("[taskConfig] Unexpected error fetching tasks:", err);
    return getTasks(); // Fallback
  }
};

// Save tasks to localStorage
export const saveTasks = (tasks: TaskConfig[]): void => {
  localStorage.setItem("adminTasks", JSON.stringify(tasks));
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
