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
  const [activeTab, setActiveTab] = useState<"schedule" | "habits" | "goals">(
    "schedule"
  );
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

  return (
    <div className="flex-1 p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">
            Customize your daily schedule, habits, and goals
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          {[
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

            <div className="p-6 bg-gray-800 rounded-xl border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                💼 Work Hours
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Start Time
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
                    End Time
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
      </div>
    </div>
  );
}
