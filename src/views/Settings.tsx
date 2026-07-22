import { useState } from "react";
import type { UserSettings, Habit, Goal } from "../types";
import { Button, Input, Textarea } from "../components";

interface SettingsProps {
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

export default function Settings({
  settings,
  onUpdateSettings,
}: SettingsProps) {
  const [activeTab, setActiveTab] = useState<
    "profile" | "schedule" | "habits" | "goals"
  >("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [newHabit, setNewHabit] = useState({
    name: "",
    description: "",
    frequency: "daily" as const,
  });
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    targetDate: "",
    progress: 0,
  });

  const handleUserTypeChange = (userType: UserSettings["userType"]) => {
    onUpdateSettings({
      ...settings,
      userType,
    });
  };

  const handleMealTimeChange = (
    meal: keyof UserSettings["mealTimes"],
    time: string
  ) => {
    onUpdateSettings({
      ...settings,
      mealTimes: {
        ...settings.mealTimes,
        [meal]: time,
      },
    });
  };

  const handleWorkHoursChange = (type: "start" | "end", time: string) => {
    onUpdateSettings({
      ...settings,
      workHours: {
        ...settings.workHours,
        [type]: time,
      },
    });
  };

  const handleAddHabit = () => {
    if (!newHabit.name.trim()) return;

    const habit: Habit = {
      id: `habit_${Math.random().toString(36).slice(2, 9)}`,
      name: newHabit.name.trim(),
      description: newHabit.description.trim(),
      frequency: newHabit.frequency,
      streak: 0,
    };

    onUpdateSettings({
      ...settings,
      habits: [...settings.habits, habit],
    });

    setNewHabit({ name: "", description: "", frequency: "daily" });
  };

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return;

    const goal: Goal = {
      id: `goal_${Math.random().toString(36).slice(2, 9)}`,
      title: newGoal.title.trim(),
      description: newGoal.description.trim(),
      targetDate: newGoal.targetDate
        ? new Date(newGoal.targetDate).getTime()
        : undefined,
      progress: newGoal.progress,
      completed: false,
    };

    onUpdateSettings({
      ...settings,
      goals: [...settings.goals, goal],
    });

    setNewGoal({ title: "", description: "", targetDate: "", progress: 0 });
  };

  const handleDeleteHabit = (habitId: string) => {
    onUpdateSettings({
      ...settings,
      habits: settings.habits.filter((h) => h.id !== habitId),
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    onUpdateSettings({
      ...settings,
      goals: settings.goals.filter((g) => g.id !== goalId),
    });
  };

  const handleUpdateGoalProgress = (goalId: string, progress: number) => {
    onUpdateSettings({
      ...settings,
      goals: settings.goals.map((g) =>
        g.id === goalId
          ? { ...g, progress: Math.max(0, Math.min(100, progress)) }
          : g
      ),
    });
  };

  // Calculate summary stats safely
  const profileLabel = settings?.userType
    ? {
        kid: "🧒 Kid",
        student: "🎓 Student",
        worker: "💼 Worker",
        retired: "🏖️ Retired",
      }[settings.userType]
    : "Not Set";

  const profileDesc = settings?.userType
    ? {
        kid: "Under 13 years old",
        student: `School: ${settings.workHours?.start || "N/A"} - ${settings.workHours?.end || "N/A"}`,
        worker: `Work: ${settings.workHours?.start || "N/A"} - ${settings.workHours?.end || "N/A"}`,
        retired: "Leisure & enjoyment",
      }[settings.userType]
    : "Configure your profile";

  const mealsCount = settings?.mealTimes 
    ? Object.values(settings.mealTimes).filter(Boolean).length 
    : 0;
  const scheduleDesc = mealsCount > 0 
    ? `Meals: ${mealsCount} scheduled`
    : "No meals scheduled";

  const habitsList = settings?.habits || [];
  const habitCount = habitsList.length;
  const maxStreak = habitCount > 0 ? Math.max(0, ...habitsList.map((h) => h.streak || 0)) : 0;
  const habitsDesc = habitCount > 0 
    ? `${habitCount} Habit${habitCount > 1 ? "s" : ""}`
    : "Create a routine";

  const goalsList = settings?.goals || [];
  const goalCount = goalsList.length;
  const completedGoals = goalsList.filter((g) => g.completed || g.progress === 100).length;
  const avgProgress = goalCount > 0 
    ? Math.round(goalsList.reduce((acc, curr) => acc + (curr.progress || 0), 0) / goalCount) 
    : 0;
  const goalsDesc = goalCount > 0 
    ? `${goalCount} Goal${goalCount > 1 ? "s" : ""}`
    : "Define your targets";

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen shrink-0">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">
            Customize your daily schedule, habits, and goals
          </p>
        </div>

        {!isEditing ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/40 backdrop-blur-md border border-gray-700/50 rounded-3xl p-8 shadow-2xl space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-700/60 pb-6">
                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 text-2xl border border-purple-500/20">
                  ⚙️
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Settings Summary</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Your daily profile, schedule, habits, and goals overview</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Profile */}
                <div className="space-y-1 group cursor-pointer" onClick={() => { setActiveTab("profile"); setIsEditing(true); }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-400">
                    <span>👤</span> Profile Type
                  </div>
                  <div className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">{profileLabel}</div>
                  <div className="text-xs text-gray-400">{profileDesc}</div>
                </div>

                {/* Schedule */}
                <div className="space-y-1 group cursor-pointer" onClick={() => { setActiveTab("schedule"); setIsEditing(true); }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                    <span>⏰</span> Daily Schedule
                  </div>
                  <div className="text-white font-bold text-lg group-hover:text-blue-300 transition-colors">{scheduleDesc}</div>
                  <div className="text-xs text-gray-400">
                    B: {settings?.mealTimes?.breakfast || "N/A"} • L: {settings?.mealTimes?.lunch || "N/A"} • D: {settings?.mealTimes?.dinner || "N/A"}
                  </div>
                </div>

                {/* Habits */}
                <div className="space-y-1 group cursor-pointer" onClick={() => { setActiveTab("habits"); setIsEditing(true); }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    <span>🎯</span> Tracked Habits
                  </div>
                  <div className="text-white font-bold text-lg group-hover:text-emerald-300 transition-colors">{habitsDesc}</div>
                  <div className="text-xs text-gray-400">
                    {habitCount > 0 ? `Max streak: ${maxStreak} days` : "Start building habits"}
                  </div>
                </div>

                {/* Goals */}
                <div className="space-y-1 group cursor-pointer" onClick={() => { setActiveTab("goals"); setIsEditing(true); }}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                    <span>🏆</span> Core Goals
                  </div>
                  <div className="text-white font-bold text-lg group-hover:text-amber-300 transition-colors">{goalsDesc}</div>
                  <div className="text-xs text-gray-400">
                    {goalCount > 0 ? `${completedGoals} of ${goalCount} completed` : "Track long-term goals"}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-700/60 flex justify-center">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
                >
                  <span>✏️</span>
                  <span>Edit Configuration & Routines</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back to Overview Header */}
            <div className="flex justify-between items-center mb-4 bg-gray-800/40 p-4 rounded-xl border border-gray-800/85 shadow-md">
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer group"
              >
                <span className="group-hover:-translate-x-1 transition-transform duration-200">←</span>
                Back to Overview
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-xs font-semibold rounded-lg shadow-md text-white transition-colors"
              >
                Done
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8">
              {[
                { id: "profile", label: "👤 Profile", icon: "👤" },
                { id: "schedule", label: "📅 Schedule", icon: "⏰" },
                { id: "habits", label: "🔄 Habits", icon: "🎯" },
                { id: "goals", label: "🏆 Goals", icon: "⭐" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-purple-600 text-white shadow-md"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    👤 User Profile
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        What describes you best?
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          {
                            value: "kid",
                            label: "🧒 Kid",
                            description: "Under 13",
                          },
                          {
                            value: "student",
                            label: "🎓 Student",
                            description: "Learning & studying",
                          },
                          {
                            value: "worker",
                            label: "💼 Worker",
                            description: "Professional life",
                          },
                          {
                            value: "retired",
                            label: "🏖️ Retired",
                            description: "Enjoying life",
                          },
                        ].map((type) => (
                          <button
                            key={type.value}
                            onClick={() =>
                              handleUserTypeChange(
                                type.value as UserSettings["userType"]
                              )
                            }
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              settings.userType === type.value
                                ? "border-purple-500 bg-purple-500/10"
                                : "border-gray-600 hover:border-gray-500 bg-gray-700/50"
                            }`}
                          >
                            <div className="text-lg font-semibold text-white mb-1">
                              {type.label}
                            </div>
                            <div className="text-xs text-gray-400">
                              {type.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium text-white">Selected:</span>{" "}
                        {settings.userType === "kid"
                          ? "🧒 Kid"
                          : settings.userType === "student"
                          ? "🎓 Student"
                          : settings.userType === "worker"
                          ? "💼 Worker"
                          : "🏖️ Retired"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        This helps personalize your daily planning experience and
                        task suggestions.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === "schedule" && (
              <div className="space-y-6">
                <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    🍽️ Meal Times
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Breakfast
                      </label>
                      <Input
                        type="time"
                        value={settings.mealTimes.breakfast}
                        onChange={(e) =>
                          handleMealTimeChange("breakfast", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Lunch
                      </label>
                      <Input
                        type="time"
                        value={settings.mealTimes.lunch}
                        onChange={(e) =>
                          handleMealTimeChange("lunch", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Dinner
                      </label>
                      <Input
                        type="time"
                        value={settings.mealTimes.dinner}
                        onChange={(e) =>
                          handleMealTimeChange("dinner", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                {(settings.userType === "student" ||
                  settings.userType === "worker") && (
                  <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      {settings.userType === "student" && "🎓 School Hours"}
                      {settings.userType === "worker" && "💼 Work Hours"}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          {settings.userType === "student" && "School Start"}
                          {settings.userType === "worker" && "Work Start"}
                        </label>
                        <Input
                          type="time"
                          value={settings.workHours.start}
                          onChange={(e) =>
                            handleWorkHoursChange("start", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          {settings.userType === "student" && "School End"}
                          {settings.userType === "worker" && "Work End"}
                        </label>
                        <Input
                          type="time"
                          value={settings.workHours.end}
                          onChange={(e) =>
                            handleWorkHoursChange("end", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Habits Tab */}
            {activeTab === "habits" && (
              <div className="space-y-6">
                <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Add New Habit
                  </h3>
                  <div className="space-y-4">
                    <Input
                      value={newHabit.name}
                      onChange={(e) =>
                        setNewHabit({ ...newHabit, name: e.target.value })
                      }
                      placeholder="Habit name (e.g., 'Drink water', 'Exercise')"
                    />
                    <Textarea
                      value={newHabit.description}
                      onChange={(e) =>
                        setNewHabit({ ...newHabit, description: e.target.value })
                      }
                      placeholder="Description (optional)"
                      className="min-h-[80px]"
                    />
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Frequency
                      </label>
                      <select
                        value={newHabit.frequency}
                        onChange={(e) =>
                          setNewHabit({
                            ...newHabit,
                            frequency: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 rounded bg-zinc-200/80 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleAddHabit}
                      disabled={!newHabit.name.trim()}
                    >
                      Add Habit
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {settings.habits.map((habit) => (
                    <div
                      key={habit.id}
                      className="p-4 bg-gray-800 rounded-xl border border-gray-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{habit.name}</h4>
                          {habit.description && (
                            <p className="text-sm text-gray-400 mt-1">
                              {habit.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                              {habit.frequency}
                            </span>
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              {habit.streak} day streak
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Goals Tab */}
            {activeTab === "goals" && (
              <div className="space-y-6">
                <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Add New Goal
                  </h3>
                  <div className="space-y-4">
                    <Input
                      value={newGoal.title}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, title: e.target.value })
                      }
                      placeholder="Goal title"
                    />
                    <Textarea
                      value={newGoal.description}
                      onChange={(e) =>
                        setNewGoal({ ...newGoal, description: e.target.value })
                      }
                      placeholder="Goal description"
                      className="min-h-[80px]"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Target Date
                        </label>
                        <Input
                          type="date"
                          value={newGoal.targetDate}
                          onChange={(e) =>
                            setNewGoal({ ...newGoal, targetDate: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          Progress (%)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={newGoal.progress.toString()}
                          onChange={(e) =>
                            setNewGoal({
                              ...newGoal,
                              progress: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddGoal}
                      disabled={!newGoal.title.trim()}
                    >
                      Add Goal
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {settings.goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="p-4 bg-gray-800 rounded-xl border border-gray-700"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-sm text-gray-400 mt-1">
                              {goal.description}
                            </p>
                          )}
                          {goal.targetDate && (
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                              Target:{" "}
                              {new Date(goal.targetDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Progress</span>
                          <span className="font-medium text-white">
                            {goal.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateGoalProgress(goal.id, goal.progress - 10)
                            }
                            disabled={goal.progress <= 0}
                          >
                            -10%
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateGoalProgress(goal.id, goal.progress + 10)
                            }
                            disabled={goal.progress >= 100}
                          >
                            +10%
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back Done button */}
            <div className="mt-8 pt-6 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg border border-gray-700 hover:border-gray-600 transition-colors shadow-md active:scale-95 cursor-pointer"
              >
                Done Editing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
