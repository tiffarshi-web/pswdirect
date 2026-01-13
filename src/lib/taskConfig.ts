// Task Configuration - Admin-managed task definitions
// Stores task names, included minutes, and base costs

export interface TaskConfig {
  id: string;
  name: string;
  includedMinutes: number;
  baseCost: number;
  isHospitalDoctor: boolean; // These default to 60-min minimum regardless of other tasks
}

export const DEFAULT_TASKS: TaskConfig[] = [
  { id: "personal-care", name: "Personal Care", includedMinutes: 45, baseCost: 35, isHospitalDoctor: false },
  { id: "companionship", name: "Companionship Visit", includedMinutes: 60, baseCost: 32, isHospitalDoctor: false },
  { id: "meal-prep", name: "Meal Preparation", includedMinutes: 30, baseCost: 30, isHospitalDoctor: false },
  { id: "medication", name: "Medication Reminders", includedMinutes: 15, baseCost: 35, isHospitalDoctor: false },
  { id: "light-housekeeping", name: "Light Housekeeping", includedMinutes: 30, baseCost: 28, isHospitalDoctor: false },
  { id: "transportation", name: "Transportation Assistance", includedMinutes: 45, baseCost: 38, isHospitalDoctor: false },
  { id: "respite", name: "Respite Care", includedMinutes: 60, baseCost: 40, isHospitalDoctor: false },
  { id: "doctor-escort", name: "Doctor Appointment Escort", includedMinutes: 60, baseCost: 38, isHospitalDoctor: true },
  { id: "hospital-visit", name: "Hospital Pick-up/Visit", includedMinutes: 60, baseCost: 40, isHospitalDoctor: true },
];

// Get tasks from localStorage (admin-set) or use defaults
export const getTasks = (): TaskConfig[] => {
  const stored = localStorage.getItem("adminTasks");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_TASKS;
    }
  }
  return DEFAULT_TASKS;
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
