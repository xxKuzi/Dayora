import { useState, useEffect, useRef } from "react";
import type { DailyPlan, DailyTask, UserSettings } from "../types";
import { Button, Input, Textarea } from "../components";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "../services/firebase";

interface DailyPlanProps {
  dailyPlan: DailyPlan | null;
  settings: UserSettings;
  onUpdatePlan: (plan: DailyPlan) => void;
  onCreatePlan: (date: string) => void;
  onGenerateWithGemini: (tasks: string) => Promise<void>;
  aiError?: string | null;
  user: User | null;
}

const parseRawTextEvent = (raw: string | undefined) => {
  if (!raw)
    return {
      text: "",
      timeOfDay: "morning" as const,
      priority: "medium" as const,
    };
  const parts = raw.split("-").map((p) => p.trim());
  const text = parts[0] || "";
  const timeStr = parts[1] || "";
  const priorityStr = parts[2] || "";

  // Parse timeOfDay
  let timeOfDay: "morning" | "midday" | "evening" = "morning";
  const timeLower = timeStr.toLowerCase();
  if (
    timeLower === "1" ||
    timeLower.includes("am") ||
    timeLower.includes("morn")
  ) {
    timeOfDay = "morning";
  } else if (
    timeLower === "2" ||
    timeLower.includes("noon") ||
    timeLower.includes("mid") ||
    timeLower.includes("lunch")
  ) {
    timeOfDay = "midday";
  } else if (
    timeLower === "3" ||
    timeLower.includes("pm") ||
    timeLower.includes("night") ||
    timeLower.includes("eve")
  ) {
    timeOfDay = "evening";
  }

  // Parse priority
  let priority: "low" | "medium" | "high" = "medium";
  const prioLower = priorityStr.toLowerCase();
  if (
    prioLower === "10" ||
    prioLower === "high" ||
    prioLower === "hi" ||
    prioLower === "3"
  ) {
    priority = "high";
  } else if (prioLower === "1" || prioLower === "low" || prioLower === "lo") {
    priority = "low";
  } else if (
    prioLower === "5" ||
    prioLower === "medium" ||
    prioLower === "med" ||
    prioLower === "2"
  ) {
    priority = "medium";
  }

  return { text, timeOfDay, priority };
};

export default function DailyPlan({
  dailyPlan,
  onUpdatePlan,
  onCreatePlan,
  onGenerateWithGemini,
  aiError,
  user,
}: DailyPlanProps) {
  const [rawTasks, setRawTasks] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [useTableMode, setUseTableMode] = useState(false);
  const [useAIMode, setUseAIMode] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [emailErrorMsg, setEmailErrorMsg] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyPlan) return;

    setIsSendingEmail(true);
    setEmailStatus("idle");
    setEmailErrorMsg("");

    try {
      if (!isFirebaseConfigured) {
        throw new Error("Firebase configuration was not detected.");
      }

      let token = "";
      if (user) {
        token = await user.getIdToken();
      }

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          date: dailyPlan.date,
          tasks: dailyPlan.tasks,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send email");
      }

      setEmailStatus("success");
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setEmailStatus("idle");
      }, 2000);
    } catch (err: any) {
      console.error("Email send failed:", err);
      setEmailStatus("error");
      setEmailErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const recognitionRef = useRef<any>(null);
  const startTextRef = useRef("");

  const [tableTasks, setTableTasks] = useState<Partial<DailyTask>[]>([
    { text: "", priority: "medium", timeOfDay: "morning" },
    { text: "", priority: "medium", timeOfDay: "midday" },
    { text: "", priority: "medium", timeOfDay: "evening" },
    { text: "", priority: "medium", timeOfDay: "morning" },
  ]);


  const today = new Date().toISOString().split("T")[0];

  const handleToggleTask = (taskId: string) => {
    if (!dailyPlan) return;

    const updatedPlan = {
      ...dailyPlan,
      tasks: dailyPlan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
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
        const validTasks = tableTasks.filter((task) =>
          (task as any).rawText?.trim(),
        );
        if (validTasks.length === 0) return;

        const newTasks: DailyTask[] = validTasks.map((task) => {
          const parsed = parseRawTextEvent((task as any).rawText);
          return {
            id: `task_${Math.random().toString(36).slice(2, 9)}`,
            text: parsed.text.trim(),
            completed: false,
            priority: parsed.priority,
            timeOfDay: parsed.timeOfDay,
          };
        });

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

  const handleToggleVoiceRecord = () => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      alert(
        "Speech recognition is not supported in your browser. Please try Chrome or Safari.",
      );
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    startTextRef.current = rawTasks;
    setIsRecording(true);
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const baseText = startTextRef.current;
      const separator = baseText && !baseText.endsWith(" ") ? " " : "";

      const newText =
        baseText + separator + finalTranscript + interimTranscript;
      setRawTasks(newText);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        alert(
          "Microphone permission was denied. Please enable it in browser settings.",
        );
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleAddTableTask = () => {
    setTableTasks([
      ...tableTasks,
      { text: "", priority: "medium", timeOfDay: "morning" },
    ]);
  };

  const handleTableTaskChange = (
    index: number,
    field: keyof DailyTask,
    value: any,
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

  const handleCreateEmptyPlan = () => {
    const newPlan: DailyPlan = {
      id: `plan_${Math.random().toString(36).slice(2, 9)}`,
      date: today,
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onCreatePlan(today);
    onUpdatePlan(newPlan);
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

  const completedTasks = dailyPlan
    ? dailyPlan.tasks.filter((task) => task.completed).length
    : 0;
  const totalTasks = dailyPlan ? dailyPlan.tasks.length : 0;
  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="p-6 relative overflow-hidden bg-gradient-to-br from-[#e0f2fe] via-[#e0e7ff] to-[#f5f3ff] dark:from-[#0b1120] dark:via-[#1e1b4b] dark:to-[#090d16] text-zinc-800 dark:text-zinc-100 min-h-screen shrink-0">
      <div className="absolute top-[-15%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.08] dark:bg-indigo-500/[0.12] blur-[50px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-purple-500/[0.06] dark:bg-purple-500/[0.08] blur-[60px] pointer-events-none z-0" />
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        {!dailyPlan ? (
          <div className="text-center mb-8 pt-8">
            <h1 className="text-4xl font-bold mb-2">Daily Planning</h1>
            <p className="text-zinc-500 dark:text-gray-400">
              Start your day with a clear plan
            </p>
          </div>
        ) : (
          <div className="mb-8 pt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
                  Daily Plan
                </h1>
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
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {completedTasks}/{totalTasks}
                </div>
                <div className="text-sm text-zinc-500 dark:text-gray-400">
                  {Math.round(progressPercentage)}% complete
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/60 dark:bg-black/50 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Action Bar */}
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border border-black/15 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 text-zinc-600 dark:text-gray-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-gray-800/80 hover:border-black/25 dark:hover:border-gray-700 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <span>🖨️</span> Print Plan
              </button>
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-white hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700/60 active:scale-95 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.02)] dark:shadow-[0_0_15px_rgba(168,85,247,0.05)] hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]"
              >
                <span>✉️</span> Email Plan
              </button>
            </div>
          </div>
        )}

        {/* AI or MANUAL Generation */}
        <div className="mb-8">
          {/* Mode Switcher - Wide Segmented Tab Control */}
          <div className="w-full grid grid-cols-2 gap-2 p-1.5 bg-white/70 dark:bg-black/40 border border-black/10 dark:border-white/5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none mb-6 backdrop-blur-md">
            <button
              onClick={() => setUseAIMode(true)}
              className={`py-3 rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                useAIMode
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "text-zinc-500 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span className="text-base font-bold flex items-center gap-2">
                🤖 AI Mode
              </span>
              <span
                className={`text-xs mt-0.5 ${useAIMode ? "text-purple-100" : "text-zinc-400 dark:text-gray-500"}`}
              >
                Generate high-performing plans using Gemini AI
              </span>
            </button>
            <button
              onClick={() => setUseAIMode(false)}
              className={`py-3 rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                !useAIMode
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "text-zinc-500 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >
              <span className="text-base font-bold flex items-center gap-2">
                📋 Manual Mode
              </span>
              <span
                className={`text-xs mt-0.5 ${!useAIMode ? "text-pink-100" : "text-zinc-400 dark:text-gray-500"}`}
              >
                Write down tasks and organize them manually
              </span>
            </button>
          </div>

          <div className="relative bg-white/85 dark:bg-black/45 rounded-2xl p-6 border border-black/20 dark:border-white/5 backdrop-blur-md">
            {useAIMode &&
              (useTableMode ? (
                <div className="absolute top-6 right-6 hidden sm:flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/30 rounded-lg text-purple-700 dark:text-purple-300 z-20">
                  <span className="text-xs">💡</span>
                  <span className="text-[11px] font-medium leading-none">
                    Use <strong>Tab</strong> and <strong>Shift+Tab</strong> to
                    navigate
                  </span>
                </div>
              ) : (
                <div className="absolute top-6 right-6 hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg text-blue-700 dark:text-blue-300 z-20">
                  <span className="text-xs">⌨️</span>
                  <span className="text-[11px] font-medium leading-none">
                    Press{" "}
                    <kbd className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-[10px] font-mono text-zinc-700 dark:text-zinc-300">
                      Cmd+Enter
                    </kbd>{" "}
                    to generate plan
                  </span>
                </div>
              ))}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
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
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                          : "bg-black/5 dark:bg-gray-700 text-zinc-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-gray-600"
                      }`}
                    >
                      📝 Text
                    </button>
                    <button
                      onClick={() => setUseTableMode(true)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        useTableMode
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm"
                          : "bg-black/5 dark:bg-gray-700 text-zinc-500 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-gray-600"
                      }`}
                    >
                      🔲 Cells
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!useAIMode ? (
              // Manual mode - always show table
              <>
                <p className="text-gray-400 mb-20">
                  {!dailyPlan
                    ? "Fill in your tasks with priority and time preferences. Use the quick buttons (1-3) for time selection:"
                    : "Add more tasks to your plan. Fill in your tasks with priority and time preferences. Use the quick buttons (1-3) for time selection:"}
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
                  {/* Column Headers */}
                  <div className="flex gap-3 items-center mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-1">
                    <div className="flex-1">Task Name</div>
                    <div className="w-32">Importance</div>
                    <div className="w-28 text-center">Part of Day</div>
                    <div className="w-6"></div>
                  </div>

                  {tableTasks.map((task, index) => (
                    <div key={index} className="flex gap-3 items-center">
                      <Input
                        value={task.text || ""}
                        onChange={(e) =>
                          handleTableTaskChange(index, "text", e.target.value)
                        }
                        placeholder="Task name..."
                        className="flex-1 bg-white dark:bg-gray-800 border border-black/15 dark:border-gray-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-gray-500"
                      />
                      <select
                        value={task.priority || "medium"}
                        onChange={(e) =>
                          handleTableTaskChange(
                            index,
                            "priority",
                            e.target.value,
                          )
                        }
                        className="w-32 px-3 py-2 bg-white dark:bg-gray-800 border border-black/15 dark:border-gray-700 rounded text-zinc-900 dark:text-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                      <div className="w-28 flex gap-1 justify-center">
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
                                time.key,
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
                      <div className="w-6 flex justify-center">
                        {tableTasks.length > 1 && (
                          <button
                            onClick={() => handleRemoveTableTask(index)}
                            className="text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={handleAddTableTask}
                    className="!bg-black/5 dark:!bg-gray-700 hover:!bg-black/10 dark:hover:!bg-gray-600 !text-zinc-700 dark:!text-white !border-black/10 dark:!border-gray-600 hover:!scale-100 mt-4"
                  >
                    + Add Task
                  </Button>
                </div>
              </>
            ) : !useTableMode ? (
              // AI Text mode
              <>
                <p className="text-gray-400 mb-20">
                  {!dailyPlan
                    ? "Describe what you need to do today."
                    : "Add more tasks to your plan."}
                </p>

                {aiError && (
                  <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                    <p className="text-red-400 text-sm">
                      <span className="font-medium">AI Error:</span> {aiError}
                    </p>
                  </div>
                )}

                <div
                  className={`relative w-full bg-white dark:bg-gray-800 border rounded-xl overflow-hidden transition-all duration-300 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 ${
                    isRecording
                      ? "border-red-500/40 ring-1 ring-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                      : "border-black/15 dark:border-gray-700"
                  }`}
                >
                  <Textarea
                    value={rawTasks}
                    onChange={(e) => setRawTasks(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Write your tasks here... e.g., 'Meeting with team at 2pm, finish project report, buy groceries, call mom'"
                    className="w-full min-h-[120px] !bg-transparent !border-none !px-4 !py-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-gray-500 focus:ring-0 focus:outline-none"
                  />
                  <div className="flex items-center justify-between px-4 py-2 bg-black/5 dark:bg-gray-950/40 border-t border-black/10 dark:border-gray-800/80">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      {isRecording && (
                        <span className="flex items-center gap-1.5 text-red-400 font-medium animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          Listening... (speak now)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleVoiceRecord}
                        className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                          isRecording
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white border border-gray-600"
                        }`}
                        title={
                          isRecording
                            ? "Stop recording"
                            : "Record voice input"
                        }
                      >
                        {isRecording ? (
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // AI Table mode (Cells mode)
              <>
                <p className="text-zinc-500 dark:text-gray-400 mb-20">
                  Fill in your tasks using the input cells. Format:{" "}
                  <code>[Task] - [Time] - [Priority]</code>
                </p>

                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tableTasks.map((task, index) => (
                      <div
                        key={index}
                        className="relative flex items-center bg-white dark:bg-gray-800 border border-black/15 dark:border-gray-700 rounded-xl focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 overflow-hidden px-3 py-2"
                      >
                        <Input
                          value={(task as any).rawText || ""}
                          onChange={(e) =>
                            handleTableTaskChange(
                              index,
                              "rawText" as any,
                              e.target.value,
                            )
                          }
                          placeholder={
                            index === 0
                              ? "Task - time - importance (e.g. Doctor - 2 - 10)"
                              : "Task - time - importance"
                          }
                          className="flex-1 !bg-transparent !border-none !p-0 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-gray-500 focus:!ring-0 focus:!outline-none focus:!ring-transparent"
                        />
                        {tableTasks.length > 1 && (
                          <button
                            onClick={() => handleRemoveTableTask(index)}
                            className="text-zinc-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 ml-2 cursor-pointer transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleAddTableTask}
                    className="!bg-black/5 dark:!bg-gray-700 hover:!bg-black/10 dark:hover:!bg-gray-600 !text-zinc-700 dark:!text-white !border-black/10 dark:!border-gray-600 hover:!scale-100 mt-4"
                  >
                    + Add Task
                  </Button>
                </div>
              </>
            )}

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleGeneratePlan}
                disabled={
                  !useAIMode
                    ? !tableTasks.some((task) => task.text?.trim())
                    : useTableMode
                      ? !tableTasks.some((task) =>
                          (task as any).rawText?.trim(),
                        )
                      : !rawTasks.trim() || isGenerating
                }
                className="!bg-gradient-to-r !from-blue-500 !to-indigo-600 hover:!from-blue-600 hover:!to-indigo-700 dark:!bg-none dark:!bg-blue-600 dark:hover:!bg-blue-700 !text-white !border-none !backdrop-blur-none flex-1 hover:!scale-100 shadow-md"
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

        {/* Tasks List - Grouped by Time */}
        {dailyPlan && (
          <div className="space-y-6">
            {dailyPlan.tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📝</div>
                <p>No tasks yet. Add some tasks to get started!</p>
              </div>
            ) : (
              <>
                {/* Morning Tasks */}
                {(() => {
                  const morningTasks = dailyPlan.tasks.filter(
                    (task) => task.timeOfDay === "morning",
                  );
                  return morningTasks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          🌅 Morning
                          <span className="text-sm font-normal text-zinc-500 dark:text-gray-400">
                            (6AM - 12PM)
                          </span>
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-yellow-500/50 to-transparent"></div>
                        <span className="text-sm text-gray-400">
                          {morningTasks.filter((t) => t.completed).length}/
                          {morningTasks.length} completed
                        </span>
                      </div>
                      <div className="space-y-3">
                        {morningTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTask(task.id)}
                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  task.completed
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-zinc-300 dark:border-gray-600 hover:border-green-500"
                                }`}
                              >
                                {task.completed && (
                                  <span className="text-xs">✓</span>
                                )}
                              </button>
                              <div className="flex-1">
                                <p
                                  className={`text-zinc-900 dark:text-zinc-100 ${
                                    task.completed
                                      ? "line-through opacity-50 text-zinc-400 dark:text-gray-500"
                                      : ""
                                  }`}
                                >
                                  {task.text}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {task.priority !== "medium" && (
                                    <span
                                      className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(
                                        task.priority,
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
                  ) : null;
                })()}

                {/* Midday Tasks */}
                {(() => {
                  const middayTasks = dailyPlan.tasks.filter(
                    (task) => task.timeOfDay === "midday",
                  );
                  return middayTasks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          ☀️ Midday
                          <span className="text-sm font-normal text-zinc-500 dark:text-gray-400">
                            (12PM - 6PM)
                          </span>
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-orange-500/50 to-transparent"></div>
                        <span className="text-sm text-gray-400">
                          {middayTasks.filter((t) => t.completed).length}/
                          {middayTasks.length} completed
                        </span>
                      </div>
                      <div className="space-y-3">
                        {middayTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTask(task.id)}
                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  task.completed
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-zinc-300 dark:border-gray-600 hover:border-green-500"
                                }`}
                              >
                                {task.completed && (
                                  <span className="text-xs">✓</span>
                                )}
                              </button>
                              <div className="flex-1">
                                <p
                                  className={`text-zinc-900 dark:text-zinc-100 ${
                                    task.completed
                                      ? "line-through opacity-50 text-zinc-400 dark:text-gray-500"
                                      : ""
                                  }`}
                                >
                                  {task.text}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {task.priority !== "medium" && (
                                    <span
                                      className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(
                                        task.priority,
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
                  ) : null;
                })()}

                {/* Evening Tasks */}
                {(() => {
                  const eveningTasks = dailyPlan.tasks.filter(
                    (task) => task.timeOfDay === "evening",
                  );
                  return eveningTasks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          🌙 Evening
                          <span className="text-sm font-normal text-zinc-500 dark:text-gray-400">
                            (6PM - 12AM)
                          </span>
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/50 to-transparent"></div>
                        <span className="text-sm text-gray-400">
                          {eveningTasks.filter((t) => t.completed).length}/
                          {eveningTasks.length} completed
                        </span>
                      </div>
                      <div className="space-y-3">
                        {eveningTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTask(task.id)}
                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  task.completed
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-zinc-300 dark:border-gray-600 hover:border-green-500"
                                }`}
                              >
                                {task.completed && (
                                  <span className="text-xs">✓</span>
                                )}
                              </button>
                              <div className="flex-1">
                                <p
                                  className={`text-zinc-900 dark:text-zinc-100 ${
                                    task.completed
                                      ? "line-through opacity-50 text-zinc-400 dark:text-gray-500"
                                      : ""
                                  }`}
                                >
                                  {task.text}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {task.priority !== "medium" && (
                                    <span
                                      className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(
                                        task.priority,
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
                  ) : null;
                })()}

                {/* Tasks without timeOfDay */}
                {(() => {
                  const untimedTasks = dailyPlan.tasks.filter(
                    (task) => !task.timeOfDay,
                  );
                  return untimedTasks.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                          📋 Other Tasks
                          <span className="text-sm font-normal text-zinc-500 dark:text-gray-400">
                            (No specific time)
                          </span>
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-gray-500/50 to-transparent"></div>
                        <span className="text-sm text-gray-400">
                          {untimedTasks.filter((t) => t.completed).length}/
                          {untimedTasks.length} completed
                        </span>
                      </div>
                      <div className="space-y-3">
                        {untimedTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleTask(task.id)}
                                className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  task.completed
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-zinc-300 dark:border-gray-600 hover:border-green-500"
                                }`}
                              >
                                {task.completed && (
                                  <span className="text-xs">✓</span>
                                )}
                              </button>
                              <div className="flex-1">
                                <p
                                  className={`text-zinc-900 dark:text-zinc-100 ${
                                    task.completed
                                      ? "line-through opacity-50 text-zinc-400 dark:text-gray-500"
                                      : ""
                                  }`}
                                >
                                  {task.text}
                                </p>
                                <div className="flex gap-2 mt-2">
                                  {task.priority !== "medium" && (
                                    <span
                                      className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(
                                        task.priority,
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
                  ) : null;
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 transition-all duration-300">
          <div
            className="bg-white dark:bg-gray-950 border border-black/15 dark:border-gray-800/80 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(168,85,247,0.15)] transform scale-100 transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>✉️</span> Send Plan via Email
              </h3>
              <button
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setEmailStatus("idle");
                }}
                className="text-zinc-500 dark:text-gray-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1 hover:bg-black/5 dark:hover:bg-gray-900 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {emailStatus === "success" ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/30 text-3xl mb-4 animate-bounce">
                  ✓
                </div>
                <h4 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  Sent Successfully!
                </h4>
                <p className="text-zinc-600 dark:text-gray-400 text-sm">
                  Your daily plan has been sent to {user?.email}.
                </p>
              </div>
            ) : !user ? (
              <div className="space-y-4">
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30 rounded-xl text-center">
                  <span className="text-3xl mb-2 block">🔒</span>
                  <h4 className="text-base font-semibold text-purple-800 dark:text-purple-200 mb-1">
                    Sign-In Required
                  </h4>
                  <p className="text-zinc-600 dark:text-gray-400 text-sm leading-relaxed">
                    To prevent spam and protect email delivery limits, sending
                    plans to email is restricted to signed-in accounts.
                  </p>
                </div>
                <p className="text-zinc-500 dark:text-gray-400 text-xs text-center leading-normal">
                  Please use the <strong>Sign In</strong> button in the left
                  sidebar to authenticate, then try again.
                </p>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsEmailModalOpen(false)}
                    className="px-4 py-2 bg-black/5 dark:bg-gray-800 hover:bg-black/10 dark:hover:bg-gray-700 text-zinc-700 dark:text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendEmail} className="space-y-4">
                <p className="text-zinc-600 dark:text-gray-400 text-sm leading-relaxed">
                  We will send your daily plan format to your registered account
                  email:
                </p>

                {emailStatus === "error" && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl">
                    <p className="text-red-600 dark:text-red-400 text-xs leading-normal">
                      <strong>Failed to send:</strong> {emailErrorMsg}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-black/5 dark:bg-gray-900/60 border border-black/10 dark:border-gray-800 rounded-xl text-center text-purple-600 dark:text-purple-300 font-medium tracking-wide">
                  {user.email}
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    disabled={isSendingEmail}
                    onClick={() => {
                      setIsEmailModalOpen(false);
                      setEmailStatus("idle");
                    }}
                    className="px-4 py-2 bg-transparent hover:bg-black/5 dark:hover:bg-gray-900 border border-black/10 dark:border-gray-800 hover:border-black/20 dark:hover:border-gray-700 text-zinc-600 dark:text-gray-300 hover:text-zinc-900 dark:hover:text-white rounded-xl text-sm font-medium transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-md shadow-purple-950/20 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Sending...
                      </>
                    ) : (
                      "Send Plan"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
