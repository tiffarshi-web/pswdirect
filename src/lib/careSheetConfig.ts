// Care Sheet Configuration
// Admin-configurable options for PSW care sheet form

export interface MoodOption {
  value: string;
  label: string;
  order: number;
}

export interface CareSheetConfig {
  moodOptions: MoodOption[];
  alwaysShowTasks: string[]; // Task IDs that always appear on care sheet
}

const DEFAULT_MOOD_OPTIONS: MoodOption[] = [
  { value: "happy", label: "Happy", order: 1 },
  { value: "content", label: "Content", order: 2 },
  { value: "neutral", label: "Neutral", order: 3 },
  { value: "anxious", label: "Anxious", order: 4 },
  { value: "sad", label: "Sad", order: 5 },
  { value: "agitated", label: "Agitated", order: 6 },
];

const DEFAULT_CONFIG: CareSheetConfig = {
  moodOptions: DEFAULT_MOOD_OPTIONS,
  alwaysShowTasks: [],
};

// Get care sheet config from localStorage
export const getCareSheetConfig = (): CareSheetConfig => {
  const stored = localStorage.getItem("pswdirect_caresheet_config");
  if (stored) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
};

// Save care sheet config to localStorage
export const saveCareSheetConfig = (config: Partial<CareSheetConfig>): CareSheetConfig => {
  const current = getCareSheetConfig();
  const updated = { ...current, ...config };
  localStorage.setItem("pswdirect_caresheet_config", JSON.stringify(updated));
  return updated;
};

// Get sorted mood options
export const getMoodOptions = (): MoodOption[] => {
  const config = getCareSheetConfig();
  return [...config.moodOptions].sort((a, b) => a.order - b.order);
};

// Add a new mood option
export const addMoodOption = (label: string): CareSheetConfig => {
  const config = getCareSheetConfig();
  const maxOrder = Math.max(...config.moodOptions.map(m => m.order), 0);
  const value = label.toLowerCase().replace(/\s+/g, "-");
  
  // Check if already exists
  if (config.moodOptions.some(m => m.value === value)) {
    return config;
  }
  
  const newOption: MoodOption = {
    value,
    label,
    order: maxOrder + 1,
  };
  
  return saveCareSheetConfig({
    moodOptions: [...config.moodOptions, newOption],
  });
};

// Remove a mood option
export const removeMoodOption = (value: string): CareSheetConfig => {
  const config = getCareSheetConfig();
  return saveCareSheetConfig({
    moodOptions: config.moodOptions.filter(m => m.value !== value),
  });
};

// Reorder mood options
export const reorderMoodOptions = (options: MoodOption[]): CareSheetConfig => {
  return saveCareSheetConfig({ moodOptions: options });
};

// Get always-show tasks
export const getAlwaysShowTasks = (): string[] => {
  return getCareSheetConfig().alwaysShowTasks;
};

// Toggle always-show task
export const toggleAlwaysShowTask = (taskId: string): CareSheetConfig => {
  const config = getCareSheetConfig();
  const alwaysShowTasks = config.alwaysShowTasks.includes(taskId)
    ? config.alwaysShowTasks.filter(id => id !== taskId)
    : [...config.alwaysShowTasks, taskId];
  
  return saveCareSheetConfig({ alwaysShowTasks });
};

// Reset to defaults
export const resetCareSheetConfig = (): CareSheetConfig => {
  localStorage.removeItem("pswdirect_caresheet_config");
  return DEFAULT_CONFIG;
};
