export interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
  trashed?: boolean;
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
}

export type DarkMode = "light" | "dark" | "auto";

export type CookiePreference = "accepted" | "declined";

export interface DailyPlan {
  id: string;
  date: string; // YYYY-MM-DD format
  tasks: DailyTask[];
  createdAt: number;
  updatedAt: number;
}

export interface DailyTask {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  estimatedTime?: number; // in minutes
  category?: string;
  timeOfDay?: "morning" | "midday" | "evening";
}

export interface UserSettings {
  mealTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  workHours: {
    start: string;
    end: string;
  };
  habits: Habit[];
  goals: Goal[];
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly";
  streak: number;
  lastCompleted?: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate?: number;
  progress: number; // 0-100
  completed: boolean;
}

export interface AppState {
  folders: Folder[];
  notes: Note[];
  activeFolderId: string;
  activeNoteId: string | null;
  query: string;
  darkMode: DarkMode;
  dailyPlans: DailyPlan[];
  settings: UserSettings;
  cookiePreference?: CookiePreference;
}
