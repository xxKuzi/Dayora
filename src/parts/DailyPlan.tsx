import { useState } from "react";
import type { DailyPlan, DailyTask, UserSettings } from "../types";
import { Button, Input, Textarea } from "../components";

interface DailyPlanProps {
  dailyPlan: DailyPlan | null;
  settings: UserSettings;
  onUpdatePlan: (plan: DailyPlan) => void;
  onCreatePlan: (date: string) => void;
  onGenerateWithGemini: (tasks: string) => Promise<void>;
  aiError?: string | null;
}

export default function DailyPlan({
  dailyPlan,
  onUpdatePlan,
  onCreatePlan,
  onGenerateWithGemini,
  aiError,
}: DailyPlanProps) {
  const [rawTasks, setRawTasks] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showManualTable, setShowManualTable] = useState(false);
  const [useTableMode, setUseTableMode] = useState(false);
  const [useAIMode, setUseAIMode] = useState(true);
  const [tableTasks, setTableTasks] = useState<Partial<DailyTask>[]>([
    { text: "", priority: "medium", timeOfDay: "morning" },
    { text: "", priority: "medium", timeOfDay: "midday" },
    { text: "", priority: "medium", timeOfDay: "evening" },
    { text: "", priority: "medium", timeOfDay: "morning" },
  ]);
  const [manualTasks, setManualTasks] = useState<Partial<DailyTask>[]>([
    { text: "", priority: "medium", timeOfDay: "morning" },
  ]);

  const today = new Date().toISOString().split("T")[0];

  const handleToggleTask = (taskId: string) => {
    if (!dailyPlan) return;

    const updatedPlan = {
      ...dailyPlan,
      tasks: dailyPlan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
      updatedAt: Date.now(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!dailyPlan) return;

    const updatedPlan = {
      ...dailyPlan,
      tasks: dailyPlan.tasks.filter((task) => task.id !== taskId),
      updatedAt: Date.now(),
    };

    onUpdatePlan(updatedPlan);
  };

  const handleGeneratePlan = async () => {
    if (!useAIMode) {
      // Manual mode - save tasks directly (always table mode in manual)
      const validTasks = tableTasks.filter((task) => task.text?.trim());
      if (validTasks.length === 0) return;

      const newTasks: DailyTask[] = validTasks.map((task) => ({
        id: `task_${Math.random().toString(36).slice(2, 9)}`,
        text: task.text!.trim(),
        completed: false,
        priority: task.priority || "medium",
        timeOfDay: task.timeOfDay || "morning",
      }));

      if (!dailyPlan) {
        const newPlan: DailyPlan = {
          id: `plan_${Math.random().toString(36).slice(2, 9)}`,
          date: today,
          tasks: newTasks,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onCreatePlan(today);
        onUpdatePlan(newPlan);
      } else {
        const updatedPlan = {
          ...dailyPlan,
          tasks: [...dailyPlan.tasks, ...newTasks],
          updatedAt: Date.now(),
        };
        onUpdatePlan(updatedPlan);
      }

      // Reset table
      setTableTasks([
        { text: "", priority: "medium", timeOfDay: "morning" },
        { text: "", priority: "medium", timeOfDay: "midday" },
        { text: "", priority: "medium", timeOfDay: "evening" },
        { text: "", priority: "medium", timeOfDay: "morning" },
      ]);
    } else {
      // AI mode
      if (useTableMode) {
        // AI Table mode - save tasks directly (no AI processing)
        const validTasks = tableTasks.filter((task) => task.text?.trim());
        if (validTasks.length === 0) return;

        const newTasks: DailyTask[] = validTasks.map((task) => ({
          id: `task_${Math.random().toString(36).slice(2, 9)}`,
          text: task.text!.trim(),
          completed: false,
          priority: task.priority || "medium",
          timeOfDay: task.timeOfDay || "morning",
        }));

        if (!dailyPlan) {
          const newPlan: DailyPlan = {
            id: `plan_${Math.random().toString(36).slice(2, 9)}`,
            date: today,
            tasks: newTasks,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          onCreatePlan(today);
          onUpdatePlan(newPlan);
        } else {
          const updatedPlan = {
            ...dailyPlan,
            tasks: [...dailyPlan.tasks, ...newTasks],
            updatedAt: Date.now(),
          };
          onUpdatePlan(updatedPlan);
        }

        // Reset table
        setTableTasks([
          { text: "", priority: "medium", timeOfDay: "morning" },
          { text: "", priority: "medium", timeOfDay: "midday" },
          { text: "", priority: "medium", timeOfDay: "evening" },
          { text: "", priority: "medium", timeOfDay: "morning" },
        ]);
      } else {
        // AI Text mode - use AI generation
        if (!rawTasks.trim()) return;

        setIsGenerating(true);
        try {
          await onGenerateWithGemini(rawTasks);
          setRawTasks("");
        } catch (error) {
          console.error("Failed to generate plan:", error);
        } finally {
          setIsGenerating(false);
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGeneratePlan();
    }
  };

  const handleAddTableTask = () => {
    setTableTasks([
      ...tableTasks,
      { text: "", priority: "medium", timeOfDay: "morning" },
    ]);
  };

  const handleTableTaskChange = (
    index: number,
    field: keyof DailyTask,
    value: any
  ) => {
    const updated = [...tableTasks];
    updated[index] = { ...updated[index], [field]: value };
    setTableTasks(updated);
  };

  const handleRemoveTableTask = (index: number) => {
    if (tableTasks.length > 1) {
      setTableTasks(tableTasks.filter((_, i) => i !== index));
    }
  };

  const handleAddManualTask = () => {
    setManualTasks([
      ...manualTasks,
      { text: "", priority: "medium", timeOfDay: "morning" },
    ]);
  };

  const handleManualTaskChange = (
    index: number,
    field: keyof DailyTask,
    value: any
  ) => {
    const updated = [...manualTasks];
    updated[index] = { ...updated[index], [field]: value };
    setManualTasks(updated);
  };

  const handleRemoveManualTask = (index: number) => {
    if (manualTasks.length > 1) {
      setManualTasks(manualTasks.filter((_, i) => i !== index));
    }
  };

  const handleSaveManualTasks = () => {
    const validTasks = manualTasks.filter((task) => task.text?.trim());
    if (validTasks.length === 0) return;

    const newTasks: DailyTask[] = validTasks.map((task) => ({
      id: `task_${Math.random().toString(36).slice(2, 9)}`,
      text: task.text!.trim(),
      completed: false,
      priority: task.priority || "medium",
      timeOfDay: task.timeOfDay || "morning",
    }));

    if (!dailyPlan) {
      const newPlan: DailyPlan = {
        id: `plan_${Math.random().toString(36).slice(2, 9)}`,
        date: today,
        tasks: newTasks,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onCreatePlan(today);
      onUpdatePlan(newPlan);
    } else {
      const updatedPlan = {
        ...dailyPlan,
        tasks: [...dailyPlan.tasks, ...newTasks],
        updatedAt: Date.now(),
      };
      onUpdatePlan(updatedPlan);
    }

    setManualTasks([{ text: "", priority: "medium", timeOfDay: "morning" }]);
    setShowManualTable(false);
  };

  const getTimeOfDayColor = (timeOfDay: string) => {
    switch (timeOfDay) {
      case "morning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "midday":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "evening":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (!dailyPlan) {
    return (
      <div className="flex-1 p-6 bg-black text-white min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 pt-8">
            <h1 className="text-4xl font-bold mb-2">Daily Planning</h1>
            <p className="text-gray-400">Start your day with a clear plan</p>
          </div>

          {/* Main Input Area */}
          <div className="mb-8">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-semibold text-white">
                    {useAIMode
                      ? "✨ AI Plan Generator"
                      : "📋 Manual Plan Creator"}
                  </h3>
                  {useAIMode && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUseTableMode(false)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          !useTableMode
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        📝 Text
                      </button>
                      <button
                        onClick={() => setUseTableMode(true)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          useTableMode
                            ? "bg-purple-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        📋 Table
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setUseAIMode(true)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      useAIMode
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    🤖 AI
                  </button>
                  <button
                    onClick={() => setUseAIMode(false)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      !useAIMode
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    ✋ Manual
                  </button>
                </div>
              </div>

              {!useAIMode ? (
                // Manual mode - always show table
                <>
                  <p className="text-gray-400 mb-4">
                    Fill in your tasks with priority and time preferences. Use
                    the quick buttons (1-3) for time selection:
                    <br />
                    <span className="text-yellow-400">
                      1 - Morning (6AM-12PM)
                    </span>{" "}
                    •
                    <span className="text-orange-400">
                      {" "}
                      2 - Midday (12PM-6PM)
                    </span>{" "}
                    •
                    <span className="text-purple-400">
                      {" "}
                      3 - Evening (6PM-12AM)
                    </span>
                  </p>

                  <div className="space-y-3">
                    {tableTasks.map((task, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <Input
                          value={task.text || ""}
                          onChange={(e) =>
                            handleTableTaskChange(index, "text", e.target.value)
                          }
                          placeholder="Task name..."
                          className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        />
                        <select
                          value={task.priority || "medium"}
                          onChange={(e) =>
                            handleTableTaskChange(
                              index,
                              "priority",
                              e.target.value
                            )
                          }
                          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <div className="flex gap-1">
                          {[
                            {
                              key: "morning",
                              label: "1",
                              title:
                                "Morning (6AM-12PM): Start your day, important tasks",
                            },
                            {
                              key: "midday",
                              label: "2",
                              title:
                                "Midday (12PM-6PM): Meetings, focused work",
                            },
                            {
                              key: "evening",
                              label: "3",
                              title:
                                "Evening (6PM-12AM): Wind down, personal tasks",
                            },
                          ].map((time) => (
                            <button
                              key={time.key}
                              onClick={() =>
                                handleTableTaskChange(
                                  index,
                                  "timeOfDay",
                                  time.key
                                )
                              }
                              title={time.title}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                task.timeOfDay === time.key
                                  ? getTimeOfDayColor(time.key)
                                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                              }`}
                            >
                              {time.label}
                            </button>
                          ))}
                        </div>
                        {tableTasks.length > 1 && (
                          <button
                            onClick={() => handleRemoveTableTask(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={handleAddTableTask}
                      className="!bg-gray-700 hover:!bg-gray-600 !text-white !border-gray-600 hover:!scale-100"
                    >
                      + Add Task
                    </Button>
                  </div>
                </>
              ) : !useTableMode ? (
                // AI Text mode
                <>
                  <p className="text-gray-400 mb-4">
                    Describe what you need to do today. Press{" "}
                    <kbd className="px-2 py-1 bg-gray-800 rounded text-sm">
                      Cmd+Enter
                    </kbd>{" "}
                    to generate or use the button.
                  </p>

                  {aiError && (
                    <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                      <p className="text-red-400 text-sm">
                        <span className="font-medium">AI Error:</span> {aiError}
                      </p>
                    </div>
                  )}

                  <Textarea
                    value={rawTasks}
                    onChange={(e) => setRawTasks(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Write your tasks here... e.g., 'Meeting with team at 2pm, finish project report, buy groceries, call mom'"
                    className="w-full min-h-[120px] bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500"
                  />
                </>
              ) : (
                // AI Table mode
                <>
                  <p className="text-gray-400 mb-4">
                    Fill in your tasks with priority and time preferences. Use
                    the quick buttons (1-3) for time selection:
                    <br />
                    <span className="text-yellow-400">
                      1 - Morning (6AM-12PM)
                    </span>{" "}
                    •
                    <span className="text-orange-400">
                      {" "}
                      2 - Midday (12PM-6PM)
                    </span>{" "}
                    •
                    <span className="text-purple-400">
                      {" "}
                      3 - Evening (6PM-12AM)
                    </span>
                  </p>

                  <div className="space-y-3">
                    {tableTasks.map((task, index) => (
                      <div key={index} className="flex gap-3 items-center">
                        <Input
                          value={task.text || ""}
                          onChange={(e) =>
                            handleTableTaskChange(index, "text", e.target.value)
                          }
                          placeholder="Task name..."
                          className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                        />
                        <select
                          value={task.priority || "medium"}
                          onChange={(e) =>
                            handleTableTaskChange(
                              index,
                              "priority",
                              e.target.value
                            )
                          }
                          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <div className="flex gap-1">
                          {[
                            {
                              key: "morning",
                              label: "1",
                              title:
                                "Morning (6AM-12PM): Start your day, important tasks",
                            },
                            {
                              key: "midday",
                              label: "2",
                              title:
                                "Midday (12PM-6PM): Meetings, focused work",
                            },
                            {
                              key: "evening",
                              label: "3",
                              title:
                                "Evening (6PM-12AM): Wind down, personal tasks",
                            },
                          ].map((time) => (
                            <button
                              key={time.key}
                              onClick={() =>
                                handleTableTaskChange(
                                  index,
                                  "timeOfDay",
                                  time.key
                                )
                              }
                              title={time.title}
                              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                task.timeOfDay === time.key
                                  ? getTimeOfDayColor(time.key)
                                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                              }`}
                            >
                              {time.label}
                            </button>
                          ))}
                        </div>
                        {tableTasks.length > 1 && (
                          <button
                            onClick={() => handleRemoveTableTask(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                    <Button
                      onClick={handleAddTableTask}
                      className="!bg-gray-700 hover:!bg-gray-600 !text-white !border-gray-600 hover:!scale-100"
                    >
                      + Add Task
                    </Button>
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={
                    !useAIMode
                      ? !tableTasks.some((task) => task.text?.trim())
                      : useTableMode
                      ? !tableTasks.some((task) => task.text?.trim())
                      : !rawTasks.trim() || isGenerating
                  }
                  className="!bg-gradient-to-r !from-purple-500 !to-pink-500 hover:!from-purple-600 hover:!to-pink-600 !text-white !border-none !backdrop-blur-none flex-1 hover:!scale-100"
                >
                  {isGenerating
                    ? "Generating..."
                    : !useAIMode
                    ? "✨ Add Tasks to Plan"
                    : useTableMode
                    ? "✨ Add Tasks to Plan"
                    : "✨ Generate Smart Plan"}
                </Button>
              </div>
            </div>
          </div>

          {/* Manual Task Table */}
          {showManualTable && (
            <div className="mb-8">
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <h3 className="text-xl font-semibold mb-4 text-white">
                  📋 Manual Task Entry
                </h3>
                <div className="space-y-4">
                  {manualTasks.map((task, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Input
                        value={task.text || ""}
                        onChange={(e) =>
                          handleManualTaskChange(index, "text", e.target.value)
                        }
                        placeholder="Task name..."
                        className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      <select
                        value={task.priority || "medium"}
                        onChange={(e) =>
                          handleManualTaskChange(
                            index,
                            "priority",
                            e.target.value
                          )
                        }
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <div className="flex gap-1">
                        {[
                          {
                            key: "morning",
                            label: "1",
                            title:
                              "Morning (6AM-12PM): Start your day, important tasks",
                          },
                          {
                            key: "midday",
                            label: "2",
                            title: "Midday (12PM-6PM): Meetings, focused work",
                          },
                          {
                            key: "evening",
                            label: "3",
                            title:
                              "Evening (6PM-12AM): Wind down, personal tasks",
                          },
                        ].map((time) => (
                          <button
                            key={time.key}
                            onClick={() =>
                              handleManualTaskChange(
                                index,
                                "timeOfDay",
                                time.key
                              )
                            }
                            title={time.title}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              task.timeOfDay === time.key
                                ? getTimeOfDayColor(time.key)
                                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                            }`}
                          >
                            {time.label}
                          </button>
                        ))}
                      </div>
                      {manualTasks.length > 1 && (
                        <button
                          onClick={() => handleRemoveManualTask(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddManualTask}
                      className="!bg-gray-700 hover:!bg-gray-600 !text-white !border-gray-600 hover:!scale-100"
                    >
                      + Add Task
                    </Button>
                    <Button
                      onClick={handleSaveManualTasks}
                      className="!bg-green-600 hover:!bg-green-700 !text-white !border-green-500 hover:!scale-100"
                    >
                      Save Tasks
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <Button
              onClick={() => onCreatePlan(today)}
              className="!bg-gray-800 hover:!bg-gray-700 !text-white !border-gray-600 hover:!scale-100"
            >
              Create Empty Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const completedTasks = dailyPlan.tasks.filter(
    (task) => task.completed
  ).length;
  const totalTasks = dailyPlan.tasks.length;
  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="flex-1 p-6 bg-black text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white">Daily Plan</h1>
              <p className="text-gray-400">
                {new Date(dailyPlan.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                {completedTasks}/{totalTasks}
              </div>
              <div className="text-sm text-gray-400">
                {Math.round(progressPercentage)}% complete
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* AI or MANUAL Generation */}
        <div className="mb-8">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-semibold text-white">
                  {useAIMode
                    ? "✨ AI Plan Generator"
                    : "📋 Manual Plan Creator"}
                </h3>
                {useAIMode && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUseTableMode(false)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        !useTableMode
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      📝 Text
                    </button>
                    <button
                      onClick={() => setUseTableMode(true)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        useTableMode
                          ? "bg-purple-600 text-white"
                          : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                      }`}
                    >
                      📋 Table
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setUseAIMode(true)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                    useAIMode
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  🤖 AI
                </button>
                <button
                  onClick={() => setUseAIMode(false)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                    !useAIMode
                      ? "bg-purple-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  ✋ Manual
                </button>
              </div>
            </div>

            {!useAIMode ? (
              // Manual mode - always show table
              <>
                <p className="text-gray-400 mb-10">
                  Add more tasks to your plan. Fill in your tasks with priority
                  and time preferences. Use the quick buttons (1-3) for time
                  selection:
                  <br />
                  <span className="text-yellow-400">
                    1 - Morning (6AM-12PM)
                  </span>{" "}
                  •
                  <span className="text-orange-400">
                    {" "}
                    2 - Midday (12PM-6PM)
                  </span>{" "}
                  •
                  <span className="text-purple-400">
                    {" "}
                    3 - Evening (6PM-12AM)
                  </span>
                </p>

                <div className="space-y-3">
                  {tableTasks.map((task, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Input
                        value={task.text || ""}
                        onChange={(e) =>
                          handleTableTaskChange(index, "text", e.target.value)
                        }
                        placeholder="Task name..."
                        className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      <select
                        value={task.priority || "medium"}
                        onChange={(e) =>
                          handleTableTaskChange(
                            index,
                            "priority",
                            e.target.value
                          )
                        }
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <div className="flex gap-1">
                        {[
                          {
                            key: "morning",
                            label: "1",
                            title:
                              "Morning (6AM-12PM): Start your day, important tasks",
                          },
                          {
                            key: "midday",
                            label: "2",
                            title: "Midday (12PM-6PM): Meetings, focused work",
                          },
                          {
                            key: "evening",
                            label: "3",
                            title:
                              "Evening (6PM-12AM): Wind down, personal tasks",
                          },
                        ].map((time) => (
                          <button
                            key={time.key}
                            onClick={() =>
                              handleTableTaskChange(
                                index,
                                "timeOfDay",
                                time.key
                              )
                            }
                            title={time.title}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              task.timeOfDay === time.key
                                ? getTimeOfDayColor(time.key)
                                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                            }`}
                          >
                            {time.label}
                          </button>
                        ))}
                      </div>
                      {tableTasks.length > 1 && (
                        <button
                          onClick={() => handleRemoveTableTask(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    onClick={handleAddTableTask}
                    className="!bg-gray-700 hover:!bg-gray-600 !text-white !border-gray-600 hover:!scale-100"
                  >
                    + Add Task
                  </Button>
                </div>
              </>
            ) : !useTableMode ? (
              // AI Text mode
              <>
                <p className="text-gray-400 mb-10">
                  Add more tasks to your plan. Press{" "}
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-sm">
                    Cmd+Enter
                  </kbd>{" "}
                  to generate or use the button.
                </p>

                {aiError && (
                  <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                    <p className="text-red-400 text-sm">
                      <span className="font-medium">AI Error:</span> {aiError}
                    </p>
                  </div>
                )}

                <Textarea
                  value={rawTasks}
                  onChange={(e) => setRawTasks(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Write your tasks here... e.g., 'Meeting with team at 2pm, finish project report, buy groceries, call mom'"
                  className="w-full min-h-[120px] bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-purple-500"
                />
              </>
            ) : (
              // AI Table mode
              <>
                <p className="text-gray-400 mb-10">
                  Fill in your tasks with priority and time preferences. Use the
                  quick buttons (1-3) for time selection:
                  <br />
                  <span className="text-yellow-400">
                    1 - Morning (6AM-12PM)
                  </span>{" "}
                  •
                  <span className="text-orange-400">
                    {" "}
                    2 - Midday (12PM-6PM)
                  </span>{" "}
                  •
                  <span className="text-purple-400">
                    {" "}
                    3 - Evening (6PM-12AM)
                  </span>
                </p>

                <div className="space-y-3">
                  {tableTasks.map((task, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Input
                        value={task.text || ""}
                        onChange={(e) =>
                          handleTableTaskChange(index, "text", e.target.value)
                        }
                        placeholder="Task name..."
                        className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                      <select
                        value={task.priority || "medium"}
                        onChange={(e) =>
                          handleTableTaskChange(
                            index,
                            "priority",
                            e.target.value
                          )
                        }
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <div className="flex gap-1">
                        {[
                          {
                            key: "morning",
                            label: "1",
                            title:
                              "Morning (6AM-12PM): Start your day, important tasks",
                          },
                          {
                            key: "midday",
                            label: "2",
                            title: "Midday (12PM-6PM): Meetings, focused work",
                          },
                          {
                            key: "evening",
                            label: "3",
                            title:
                              "Evening (6PM-12AM): Wind down, personal tasks",
                          },
                        ].map((time) => (
                          <button
                            key={time.key}
                            onClick={() =>
                              handleTableTaskChange(
                                index,
                                "timeOfDay",
                                time.key
                              )
                            }
                            title={time.title}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              task.timeOfDay === time.key
                                ? getTimeOfDayColor(time.key)
                                : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                            }`}
                          >
                            {time.label}
                          </button>
                        ))}
                      </div>
                      {tableTasks.length > 1 && (
                        <button
                          onClick={() => handleRemoveTableTask(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    onClick={handleAddTableTask}
                    className="!bg-gray-700 hover:!bg-gray-600 !text-white !border-gray-600 hover:!scale-100"
                  >
                    + Add Task
                  </Button>
                </div>
              </>
            )}

            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleGeneratePlan}
                disabled={
                  !useAIMode
                    ? !tableTasks.some((task) => task.text?.trim())
                    : useTableMode
                    ? !tableTasks.some((task) => task.text?.trim())
                    : !rawTasks.trim() || isGenerating
                }
                className="!bg-gradient-to-r !from-purple-500 !to-pink-500 hover:!from-purple-600 hover:!to-pink-600 !text-white !border-none !backdrop-blur-none flex-1 hover:!scale-100"
              >
                {isGenerating
                  ? "Generating..."
                  : !useAIMode
                  ? "✨ Add Tasks to Plan"
                  : useTableMode
                  ? "✨ Add Tasks to Plan"
                  : "✨ Generate Smart Plan"}
              </Button>
            </div>
          </div>
        </div>

        {/* Manual Task Table */}
        {showManualTable && (
          <div className="mb-8">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-xl font-semibold mb-4 text-white">
                📋 Manual Task Entry
              </h3>
              <div className="space-y-4">
                {manualTasks.map((task, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <Input
                      value={task.text || ""}
                      onChange={(e) =>
                        handleManualTaskChange(index, "text", e.target.value)
                      }
                      placeholder="Task name..."
                      className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                    />
                    <select
                      value={task.priority || "medium"}
                      onChange={(e) =>
                        handleManualTaskChange(
                          index,
                          "priority",
                          e.target.value
                        )
                      }
                      className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <div className="flex gap-1">
                      {["morning", "midday", "evening"].map((time) => (
                        <button
                          key={time}
                          onClick={() =>
                            handleManualTaskChange(index, "timeOfDay", time)
                          }
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            task.timeOfDay === time
                              ? getTimeOfDayColor(time)
                              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                          }`}
                        >
                          {time === "morning"
                            ? "1"
                            : time === "midday"
                            ? "2"
                            : "3"}
                        </button>
                      ))}
                    </div>
                    {manualTasks.length > 1 && (
                      <button
                        onClick={() => handleRemoveManualTask(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddManualTask}
                    className="!bg-gray-700 hover:!bg-gray-600 !text-white !border-gray-600 hover:!scale-100"
                  >
                    + Add Task
                  </Button>
                  <Button
                    onClick={handleSaveManualTasks}
                    className="!bg-green-600 hover:!bg-green-700 !text-white !border-green-500"
                  >
                    Save Tasks
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks List - Grouped by Time */}
        <div className="space-y-6">
          {dailyPlan.tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">📝</div>
              <p>No tasks yet. Add some tasks to get started!</p>
            </div>
          ) : (
            (() => {
              // Group tasks by time of day
              const groupedTasks = dailyPlan.tasks.reduce((groups, task) => {
                const timeOfDay = task.timeOfDay || "morning";
                if (!groups[timeOfDay]) {
                  groups[timeOfDay] = [];
                }
                groups[timeOfDay].push(task);
                return groups;
              }, {} as Record<string, typeof dailyPlan.tasks>);

              // Define time order and labels
              const timeOrder = ["morning", "midday", "evening"];
              const timeLabels = {
                morning: { label: "🌅 Morning", subtitle: "6AM - 12PM" },
                midday: { label: "☀️ Midday", subtitle: "12PM - 6PM" },
                evening: { label: "🌙 Evening", subtitle: "6PM - 12AM" },
              };

              return timeOrder
                .map((timeOfDay) => {
                  const tasks = groupedTasks[timeOfDay] || [];
                  if (tasks.length === 0) return null;

                  const completedCount = tasks.filter(
                    (task) => task.completed
                  ).length;
                  const totalCount = tasks.length;
                  const progressPercentage =
                    totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

                  return (
                    <div key={timeOfDay} className="space-y-3">
                      {/* Time Group Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">
                            {
                              timeLabels[timeOfDay as keyof typeof timeLabels]
                                .label
                            }
                          </h3>
                          <span className="text-sm text-gray-400">
                            {
                              timeLabels[timeOfDay as keyof typeof timeLabels]
                                .subtitle
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">
                            {completedCount}/{totalCount} completed
                          </span>
                          <div className="w-16 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tasks in this time group */}
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all duration-200 ${
                              task.completed
                                ? "bg-green-900/20 border-green-800"
                                : "bg-gray-900 border-gray-800 hover:border-gray-700"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTask(task.id)}
                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  task.completed
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-gray-600 hover:border-green-500"
                                }`}
                              >
                                {task.completed && (
                                  <span className="text-xs">✓</span>
                                )}
                              </button>
                              <div className="flex-1">
                                <p
                                  className={`text-white ${
                                    task.completed
                                      ? "line-through opacity-60"
                                      : ""
                                  }`}
                                >
                                  {task.text}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {task.priority !== "medium" && (
                                    <span
                                      className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(
                                        task.priority
                                      )}`}
                                    >
                                      {task.priority} priority
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="text-gray-400 hover:text-red-400 transition-colors"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
                .filter(Boolean);
            })()
          )}
        </div>
      </div>
    </div>
  );
}
