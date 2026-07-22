import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import type { DailyPlan, DailyTask, UserSettings } from "../types";
import { Button, Input, Textarea, Modal } from "../components";
import type { User } from "firebase/auth";
import { isFirebaseConfigured } from "../services/firebase";

interface DailyPlanProps {
  dailyPlan: DailyPlan | null;
  settings: UserSettings;
  onUpdatePlan: (plan: DailyPlan) => void;
  onCreatePlan: (date: string) => void;
  onGenerateWithGemini: (tasks: string, date: string) => Promise<void>;
  aiError?: string | null;
  user: User | null;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onMoveTaskToTomorrow?: (taskId: string, currentPlanDate: string) => void;
}

const formatTime = (timeStr: string | undefined): string => {
  if (!timeStr) return "";
  const [hourStr, minStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minStr} ${ampm}`;
};

const parseRawTextEvent = (raw: string | undefined) => {
  if (!raw)
    return {
      text: "",
      timeOfDay: "morning" as const,
      priority: "medium" as const,
      time: undefined as string | undefined,
    };
  const parts = raw.split("-").map((p) => p.trim());
  const text = parts[0] || "";
  const timeStr = parts[1] || "";
  const priorityStr = parts[2] || "";

  // Parse specific time (e.g., "14:30", "2:30 pm", "2:30PM", "9am", "2pm")
  let time: string | undefined = undefined;
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      const isQuickSelector =
        timeStr === "1" || timeStr === "2" || timeStr === "3";

      if (
        !isQuickSelector &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
      ) {
        if (ampm) {
          if (ampm === "pm" && hours < 12) {
            hours += 12;
          } else if (ampm === "am" && hours === 12) {
            hours = 0;
          }
        } else {
          // General heuristic: assume hours < 8 are PM (e.g. 2 -> 14, 5 -> 17), and 8-11 are AM
          if (hours > 0 && hours < 8) {
            hours += 12;
          }
        }
        time = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
    }
  }

  // Parse timeOfDay
  let timeOfDay: "morning" | "midday" | "evening" = "morning";
  if (time) {
    const hours = parseInt(time.split(":")[0], 10);
    if (hours >= 6 && hours < 12) {
      timeOfDay = "morning";
    } else if (hours >= 12 && hours < 18) {
      timeOfDay = "midday";
    } else {
      timeOfDay = "evening";
    }
  } else {
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

  return { text, timeOfDay, priority, time };
};

export default function DailyPlan({
  dailyPlan,
  onUpdatePlan,
  onCreatePlan,
  onGenerateWithGemini,
  aiError,
  user,
  selectedDate,
  onDateChange,
  onMoveTaskToTomorrow,
}: DailyPlanProps) {
  const [rawTasks, setRawTasks] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [useTableMode, setUseTableMode] = useState(false);
  const [useAIMode, setUseAIMode] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // Edit task modal states
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [editTaskText, setEditTaskText] = useState("");
  const [editTaskPriority, setEditTaskPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [editTaskTimeOfDay, setEditTaskTimeOfDay] = useState<
    "morning" | "midday" | "evening"
  >("morning");
  const [editTaskTime, setEditTaskTime] = useState<string | undefined>(
    undefined,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleUpdatePlan = (updatedPlan: DailyPlan) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(() => {
          onUpdatePlan(updatedPlan);
        });
      });
    } else {
      onUpdatePlan(updatedPlan);
    }
  };

  const handleOpenEditModal = (task: DailyTask) => {
    setEditingTask(task);
    setEditTaskText(task.text);
    setEditTaskPriority(task.priority);
    setEditTaskTimeOfDay(task.timeOfDay || "morning");
    setEditTaskTime(task.time);
    setShowDeleteConfirm(false);
  };

  const handleSaveEditTask = () => {
    if (!dailyPlan || !editingTask || !editTaskText.trim()) return;

    const updatedTask: DailyTask = {
      ...editingTask,
      text: editTaskText.trim(),
      priority: editTaskPriority,
      timeOfDay: editTaskTimeOfDay,
      time: editTaskTime,
    };

    const updatedPlan = {
      ...dailyPlan,
      tasks: dailyPlan.tasks.map((t) =>
        t.id === editingTask.id ? updatedTask : t,
      ),
      updatedAt: Date.now(),
    };

    handleUpdatePlan(updatedPlan);
    setEditingTask(null);
  };

  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnTask = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dailyPlan) return;

    const sourceTaskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!sourceTaskId || sourceTaskId === targetTaskId) return;

    const sourceIndex = dailyPlan.tasks.findIndex((t) => t.id === sourceTaskId);
    const targetIndex = dailyPlan.tasks.findIndex((t) => t.id === targetTaskId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const updatedTasks = [...dailyPlan.tasks];
    const [draggedTask] = updatedTasks.splice(sourceIndex, 1);

    // Update timeOfDay to match target task's category
    const targetTask = dailyPlan.tasks[targetIndex];
    draggedTask.timeOfDay = targetTask.timeOfDay;

    // Find the new target index in the modified tasks list
    const newTargetIndex = updatedTasks.findIndex((t) => t.id === targetTaskId);
    const insertIndex =
      sourceIndex < targetIndex ? newTargetIndex + 1 : newTargetIndex;
    updatedTasks.splice(insertIndex, 0, draggedTask);

    handleUpdatePlan({
      ...dailyPlan,
      tasks: updatedTasks,
      updatedAt: Date.now(),
    });
    setDraggedTaskId(null);
  };

  const handleDropOnCategory = (
    e: React.DragEvent,
    category: "morning" | "midday" | "evening" | "other",
  ) => {
    e.preventDefault();
    if (!dailyPlan) return;

    const sourceTaskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!sourceTaskId) return;

    const sourceIndex = dailyPlan.tasks.findIndex((t) => t.id === sourceTaskId);
    if (sourceIndex === -1) return;

    const updatedTasks = [...dailyPlan.tasks];
    const [draggedTask] = updatedTasks.splice(sourceIndex, 1);

    // Update timeOfDay based on target category
    draggedTask.timeOfDay = category === "other" ? undefined : category;

    // Find the insertion index at the end of the matching category grouping
    const lastCategoryIndex = [...updatedTasks]
      .reverse()
      .findIndex(
        (t) =>
          (category === "other" && t.timeOfDay === undefined) ||
          (category !== "other" && t.timeOfDay === category),
      );

    if (lastCategoryIndex !== -1) {
      const insertIndex = updatedTasks.length - lastCategoryIndex;
      updatedTasks.splice(insertIndex, 0, draggedTask);
    } else {
      updatedTasks.push(draggedTask);
    }

    handleUpdatePlan({
      ...dailyPlan,
      tasks: updatedTasks,
      updatedAt: Date.now(),
    });
    setDraggedTaskId(null);
  };

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [emailErrorMsg, setEmailErrorMsg] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const handleExportMarkdown = () => {
    if (!dailyPlan) return;

    const formattedDate = new Date(dailyPlan.date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let markdown = `# Daily Plan - ${formattedDate}\n\n`;

    const categories = [
      { key: "morning", title: "Morning (6AM - 12PM)" },
      { key: "midday", title: "Midday (12PM - 6PM)" },
      { key: "evening", title: "Evening (6PM - 12AM)" },
      { key: "untimed", title: "Untimed Tasks" },
    ];

    categories.forEach(({ key, title }) => {
      const categoryTasks = dailyPlan.tasks.filter((t) => {
        if (key === "untimed") {
          return !t.timeOfDay;
        }
        return t.timeOfDay === key;
      });

      if (categoryTasks.length > 0) {
        markdown += `## ${title}\n\n`;
        categoryTasks.forEach((task) => {
          const checkbox = task.completed ? "- [x]" : "- [ ]";
          let taskLine = `${checkbox} ${task.text}`;
          const details: string[] = [];
          if (task.time) {
            details.push(formatTime(task.time));
          }
          if (task.priority && task.priority !== "medium") {
            details.push(
              `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority`,
            );
          }
          if (details.length > 0) {
            taskLine += ` *(${details.join(", ")})*`;
          }
          markdown += `${taskLine}\n`;
        });
        markdown += "\n";
      }
    });

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `daily-plan-${dailyPlan.date}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    onDateChange(`${y}-${m}-${d}`);
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    onDateChange(`${y}-${m}-${d}`);
  };

  const handleToggleTask = (taskId: string) => {
    if (!dailyPlan) return;

    const updatedPlan = {
      ...dailyPlan,
      tasks: dailyPlan.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
      updatedAt: Date.now(),
    };

    handleUpdatePlan(updatedPlan);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!dailyPlan) return;

    const updatedPlan = {
      ...dailyPlan,
      tasks: dailyPlan.tasks.filter((task) => task.id !== taskId),
      updatedAt: Date.now(),
    };

    handleUpdatePlan(updatedPlan);
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
        time: task.time,
      }));

      if (!dailyPlan) {
        const newPlan: DailyPlan = {
          id: `plan_${Math.random().toString(36).slice(2, 9)}`,
          date: selectedDate,
          tasks: newTasks,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        onCreatePlan(selectedDate);
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
            time: parsed.time,
          };
        });

        if (!dailyPlan) {
          const newPlan: DailyPlan = {
            id: `plan_${Math.random().toString(36).slice(2, 9)}`,
            date: selectedDate,
            tasks: newTasks,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          onCreatePlan(selectedDate);
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
          await onGenerateWithGemini(rawTasks, selectedDate);
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
    field: keyof DailyTask | "rawText",
    value: any,
  ) => {
    const updated = [...tableTasks];
    const updatedTask = { ...updated[index], [field]: value } as any;

    if (field === "time" && value) {
      const hour = parseInt(value.split(":")[0], 10);
      if (hour >= 6 && hour < 12) {
        updatedTask.timeOfDay = "morning";
      } else if (hour >= 12 && hour < 18) {
        updatedTask.timeOfDay = "midday";
      } else {
        updatedTask.timeOfDay = "evening";
      }
    }

    updated[index] = updatedTask;
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
      date: selectedDate,
      tasks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onCreatePlan(selectedDate);
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

  const getPriorityStripColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/60 dark:bg-red-500/40";
      case "medium":
        return "bg-blue-500/60 dark:bg-blue-500/40";
      case "low":
        return "bg-green-500/60 dark:bg-green-500/40";
      default:
        return "bg-gray-400/30";
    }
  };

  const completedTasks = dailyPlan
    ? dailyPlan.tasks.filter((task) => task.completed).length
    : 0;
  const totalTasks = dailyPlan ? dailyPlan.tasks.length : 0;
  const progressPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="p-6 relative overflow-hidden bg-gradient-to-br from-[#e0f2fe] via-[#e0e7ff] to-[#f5f3ff] dark:from-[#0b1120] dark:via-[#1e1b4b] dark:to-[#090d16] text-zinc-800 dark:text-zinc-100 min-h-screen shrink-0 print-clean-container">
      <div className="absolute top-[-15%] left-[15%] w-[500px] h-[500px] rounded-full bg-indigo-500/[0.08] dark:bg-indigo-500/[0.12] blur-[50px] pointer-events-none z-0 no-print" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-purple-500/[0.06] dark:bg-purple-500/[0.08] blur-[60px] pointer-events-none z-0 no-print" />
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="mb-8 pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-bold text-zinc-900 dark:text-white">
                  Daily Plan
                </h1>
                {/* Date switcher controls */}
                <div className="flex items-center gap-1.5 ml-2 no-print bg-white/50 dark:bg-black/30 border border-black/10 dark:border-white/5 rounded-xl p-1 backdrop-blur-sm shadow-sm">
                  <button
                    onClick={handlePrevDay}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer text-sm font-semibold flex items-center justify-center w-8 h-8"
                    title="Previous Day"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => onDateChange(today)}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-black/5 dark:bg-white/5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 cursor-pointer flex items-center gap-1"
                    title="Jump to Today"
                  >
                    Today
                  </button>
                  <div className="relative flex items-center">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => onDateChange(e.target.value)}
                      className="opacity-0 absolute inset-0 cursor-pointer w-full h-full z-10"
                    />
                    <button className="px-2 py-1.5 text-xs font-semibold bg-black/5 dark:bg-white/5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 pointer-events-none flex items-center justify-center w-8 h-8">
                      📅
                    </button>
                  </div>
                  <button
                    onClick={handleNextDay}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer text-sm font-semibold flex items-center justify-center w-8 h-8"
                    title="Next Day"
                  >
                    ▶
                  </button>
                </div>
              </div>
              <p className="text-gray-400 mt-1">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </p>
            </div>

            {dailyPlan && (
              <div className="text-right flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                <div className="text-3xl font-bold text-zinc-900 dark:text-white">
                  {completedTasks}/{totalTasks}
                </div>
                <div className="text-sm text-zinc-500 dark:text-gray-400">
                  {Math.round(progressPercentage)}% complete
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar & Actions - only when plan exists */}
          {dailyPlan && (
            <>
              <div className="w-full bg-white/60 dark:bg-black/50 rounded-full h-3 no-print">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="flex gap-3 mt-4 justify-end no-print">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border border-black/15 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 text-zinc-600 dark:text-gray-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-gray-800/80 hover:border-black/25 dark:hover:border-gray-700 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>🖨️</span> Print Plan
                </button>
                <button
                  onClick={handleExportMarkdown}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border border-black/15 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 text-zinc-600 dark:text-gray-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-gray-800/80 hover:border-black/25 dark:hover:border-gray-700 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>⬇️</span> Export MD
                </button>
                <button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 bg-purple-600 hover:bg-purple-700 text-white border border-transparent shadow-md shadow-purple-900/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>✉️</span> Email Plan
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI or MANUAL Generation */}
        <div className="mb-8 no-print">
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
                </p>

                <div className="space-y-3">
                  {/* Column Headers */}
                  <div className="flex gap-3 items-center mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-1">
                    <div className="flex-1">Task Name</div>
                    <div className="w-32">Importance</div>
                    <div className="w-48 text-center">Part of Day & Time</div>
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
                      <div className="w-48 flex gap-1 justify-center items-center">
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
                                time.key,
                              )
                            }
                            title={time.title}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer border ${
                              task.timeOfDay === time.key
                                ? `${getTimeOfDayColor(time.key)} border-transparent`
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-zinc-200/50 dark:border-zinc-700/50"
                            }`}
                          >
                            {time.label}
                          </button>
                        ))}

                        {/* Specific Time Picker / Add Time Button */}
                        {task.time !== undefined ? (
                          <div className="relative flex items-center bg-white dark:bg-gray-800 border border-black/15 dark:border-gray-700 rounded px-1.5 py-0.5 text-xs font-medium text-zinc-900 dark:text-white max-w-[100px]">
                            <input
                              type="time"
                              value={task.time}
                              onChange={(e) =>
                                handleTableTaskChange(
                                  index,
                                  "time",
                                  e.target.value,
                                )
                              }
                              className="bg-transparent border-none p-0 text-xs font-semibold focus:ring-0 focus:outline-none w-16 text-zinc-900 dark:text-white cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleTableTaskChange(index, "time", undefined)
                              }
                              className="ml-1 text-zinc-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 cursor-pointer"
                              title="Clear specific time"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              let defaultTime = "09:00";
                              if (task.timeOfDay === "midday")
                                defaultTime = "13:00";
                              else if (task.timeOfDay === "evening")
                                defaultTime = "19:00";
                              handleTableTaskChange(index, "time", defaultTime);
                            }}
                            className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:border-purple-500/35 transition-colors cursor-pointer"
                            title="Add specific start time"
                          >
                            + Time
                          </button>
                        )}
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
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
                        }`}
                        title={
                          isRecording ? "Stop recording" : "Record voice input"
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

        {/* Empty state message when there's no plan */}
        {!dailyPlan && (
          <div className="text-center pb-4 pt-8 px-6 bg-white/40 dark:bg-black/20 border border-dashed border-black/15 dark:border-white/5 rounded-2xl mb-8">
            <div className="text-3xl mb-2">📅</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
              No plan for this day yet
            </h3>
            <p className="text-sm text-zinc-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Start planning your day by adding tasks below plan.
            </p>
          </div>
        )}

        {/* Tasks List - Grouped by Time */}
        {dailyPlan && (
          <div className="space-y-20">
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
                    <div className="space-y-3 mt-20">
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
                      <div
                        className="space-y-3 min-h-[50px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnCategory(e, "morning")}
                      >
                        {morningTasks.map((task) => (
                          <div
                            key={task.id}
                            style={
                              {
                                viewTransitionName: `task-${task.id}`,
                              } as React.CSSProperties
                            }
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnTask(e, task.id)}
                            className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            } ${task.id === draggedTaskId ? "opacity-30 border-dashed border-zinc-400 dark:border-zinc-700" : ""} task-item`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors p-0.5 shrink-0 flex items-center justify-center font-bold text-sm tracking-widest select-none self-center no-print"
                                title="Drag to reorder"
                              >
                                ⠿
                              </div>
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
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-center">
                                {task.time && (
                                  <span className="text-xs opacity-90 font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                                    {formatTime(task.time)}
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    onMoveTaskToTomorrow?.(
                                      task.id,
                                      dailyPlan.date,
                                    )
                                  }
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center text-sm no-print"
                                  title="Move to tomorrow"
                                >
                                  ➡️
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(task)}
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center font-bold text-lg leading-none no-print"
                                  title="Edit task"
                                >
                                  ⋮
                                </button>
                              </div>
                            </div>
                            {task.priority && !task.completed && (
                              <div
                                className={`absolute bottom-0 left-0 right-0 h-[2px] ${getPriorityStripColor(
                                  task.priority,
                                )}`}
                              />
                            )}
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
                      <div
                        className="space-y-3 min-h-[50px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnCategory(e, "midday")}
                      >
                        {middayTasks.map((task) => (
                          <div
                            key={task.id}
                            style={
                              {
                                viewTransitionName: `task-${task.id}`,
                              } as React.CSSProperties
                            }
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnTask(e, task.id)}
                            className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            } ${task.id === draggedTaskId ? "opacity-30 border-dashed border-zinc-400 dark:border-zinc-700" : ""} task-item`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors p-0.5 shrink-0 flex items-center justify-center font-bold text-sm tracking-widest select-none self-center no-print"
                                title="Drag to reorder"
                              >
                                ⠿
                              </div>
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
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-center">
                                {task.time && (
                                  <span className="text-xs opacity-70 font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                                    {formatTime(task.time)}
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    onMoveTaskToTomorrow?.(
                                      task.id,
                                      dailyPlan.date,
                                    )
                                  }
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center text-sm no-print"
                                  title="Move to tomorrow"
                                >
                                  ➡️
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(task)}
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center font-bold text-lg leading-none no-print"
                                  title="Edit task"
                                >
                                  ⋮
                                </button>
                              </div>
                            </div>
                            {task.priority && !task.completed && (
                              <div
                                className={`absolute bottom-0 left-0 right-0 h-[2px] ${getPriorityStripColor(
                                  task.priority,
                                )}`}
                              />
                            )}
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
                      <div
                        className="space-y-3 min-h-[50px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnCategory(e, "evening")}
                      >
                        {eveningTasks.map((task) => (
                          <div
                            key={task.id}
                            style={
                              {
                                viewTransitionName: `task-${task.id}`,
                              } as React.CSSProperties
                            }
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnTask(e, task.id)}
                            className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            } ${task.id === draggedTaskId ? "opacity-30 border-dashed border-zinc-400 dark:border-zinc-700" : ""} task-item`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors p-0.5 shrink-0 flex items-center justify-center font-bold text-sm tracking-widest select-none self-center no-print"
                                title="Drag to reorder"
                              >
                                ⠿
                              </div>
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
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-center">
                                {task.time && (
                                  <span className="text-xs opacity-70 font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                                    {formatTime(task.time)}
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    onMoveTaskToTomorrow?.(
                                      task.id,
                                      dailyPlan.date,
                                    )
                                  }
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center text-sm no-print"
                                  title="Move to tomorrow"
                                >
                                  ➡️
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(task)}
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center font-bold text-lg leading-none no-print"
                                  title="Edit task"
                                >
                                  ⋮
                                </button>
                              </div>
                            </div>
                            {task.priority && !task.completed && (
                              <div
                                className={`absolute bottom-0 left-0 right-0 h-[2px] ${getPriorityStripColor(
                                  task.priority,
                                )}`}
                              />
                            )}
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
                      <div
                        className="space-y-3 min-h-[50px]"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnCategory(e, "other")}
                      >
                        {untimedTasks.map((task) => (
                          <div
                            key={task.id}
                            style={
                              {
                                viewTransitionName: `task-${task.id}`,
                              } as React.CSSProperties
                            }
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={() => setDraggedTaskId(null)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropOnTask(e, task.id)}
                            className={`relative overflow-hidden p-4 rounded-xl border transition-all duration-200 backdrop-blur-sm ${
                              task.completed
                                ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/50"
                                : "bg-white/85 dark:bg-black/55 border-black/20 dark:border-white/5 hover:border-black/35 dark:hover:border-white/10"
                            } ${task.id === draggedTaskId ? "opacity-30 border-dashed border-zinc-400 dark:border-zinc-700" : ""} task-item`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="cursor-grab active:cursor-grabbing text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 transition-colors p-0.5 shrink-0 flex items-center justify-center font-bold text-sm tracking-widest select-none self-center no-print"
                                title="Drag to reorder"
                              >
                                ⠿
                              </div>
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
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-center">
                                {task.time && (
                                  <span className="text-xs opacity-70 font-medium whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                                    {formatTime(task.time)}
                                  </span>
                                )}
                                <button
                                  onClick={() =>
                                    onMoveTaskToTomorrow?.(
                                      task.id,
                                      dailyPlan.date,
                                    )
                                  }
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center text-sm no-print"
                                  title="Move to tomorrow"
                                >
                                  ➡️
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(task)}
                                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-center justify-center font-bold text-lg leading-none no-print"
                                  title="Edit task"
                                >
                                  ⋮
                                </button>
                              </div>
                            </div>
                            {task.priority && !task.completed && (
                              <div
                                className={`absolute bottom-0 left-0 right-0 h-[2px] ${getPriorityStripColor(
                                  task.priority,
                                )}`}
                              />
                            )}
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
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => {
          setIsEmailModalOpen(false);
          setEmailStatus("idle");
        }}
        title="✉️ Send Plan via Email"
        footer={
          emailStatus === "success" ? (
            <button
              onClick={() => {
                setIsEmailModalOpen(false);
                setEmailStatus("idle");
              }}
              className="px-4 py-2 bg-black/5 dark:bg-zinc-800 hover:bg-black/10 dark:hover:bg-zinc-700 text-zinc-700 dark:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          ) : !user ? (
            <button
              onClick={() => setIsEmailModalOpen(false)}
              className="px-4 py-2 bg-black/5 dark:bg-zinc-800 hover:bg-black/10 dark:hover:bg-zinc-700 text-zinc-700 dark:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          ) : (
            <div className="flex justify-end gap-3 w-full">
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={() => {
                  setIsEmailModalOpen(false);
                  setEmailStatus("idle");
                }}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm font-semibold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={handleSendEmail}
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
          )
        }
      >
        {emailStatus === "success" ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 text-green-500 dark:text-green-400 border border-green-500/30 text-3xl mb-4 animate-bounce">
              ✓
            </div>
            <h4 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Sent Successfully!
            </h4>
            <p className="text-zinc-600 dark:text-gray-400 text-sm">
              Your daily plan has been sent to{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">
                {user?.email}
              </strong>
              .
            </p>
          </div>
        ) : !user ? (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-xl text-center">
              <span className="text-3xl mb-2 block">🔒</span>
              <h4 className="text-base font-semibold text-purple-800 dark:text-purple-300 mb-1">
                Sign-In Required
              </h4>
              <p className="text-zinc-600 dark:text-gray-300 text-sm leading-relaxed">
                To prevent spam and protect email delivery limits, sending plans
                to email is restricted to signed-in accounts.
              </p>
            </div>
            <p className="text-zinc-500 dark:text-gray-400 text-xs text-center leading-normal">
              Please use the <strong>Sign In</strong> button in the left sidebar
              to authenticate, then try again.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <p className="text-zinc-600 dark:text-gray-300 text-sm leading-relaxed">
              We will send your daily plan format to your registered account
              email:
            </p>

            {emailStatus === "error" && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl">
                <p className="text-red-600 dark:text-red-400 text-xs leading-normal">
                  <strong>Failed to send:</strong> {emailErrorMsg}
                </p>
              </div>
            )}

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-center text-purple-600 dark:text-purple-400 font-bold tracking-wide text-sm">
              {user.email}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        headerActions={
          editingTask &&
          dailyPlan && (
            <button
              type="button"
              onClick={() => {
                onMoveTaskToTomorrow?.(editingTask.id, dailyPlan.date);
                setEditingTask(null);
              }}
              className="px-2.5 py-1 text-xs border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors font-semibold flex items-center gap-1 cursor-pointer"
            >
              ➡️ Tomorrow
            </button>
          )
        }
        footer={
          <div className="flex items-center justify-between w-full">
            {showDeleteConfirm ? (
              <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="text-sm font-semibold text-red-500 dark:text-red-400">
                  Delete task permanently?
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-semibold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    No, cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTask) {
                        handleDeleteTask(editingTask.id);
                        setEditingTask(null);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-all active:scale-95 shadow-md shadow-red-950/20 cursor-pointer"
                  >
                    Yes, delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-red-500 hover:text-red-600 dark:hover:text-red-400 font-semibold text-sm transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl cursor-pointer"
                >
                  🗑️ Delete Task
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-sm font-semibold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditTask}
                    className="px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-md shadow-indigo-950/20 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          {/* Task Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
              Task Name
            </label>
            <Input
              value={editTaskText}
              onChange={(e) => setEditTaskText(e.target.value)}
              placeholder="Task name..."
              className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white"
            />
          </div>

          {/* Importance / Priority */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
              Importance
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as const).map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setEditTaskPriority(prio)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                    editTaskPriority === prio
                      ? prio === "high"
                        ? "bg-red-500/10 text-red-600 border-red-500/30 dark:bg-red-500/20 dark:text-red-400"
                        : prio === "medium"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:bg-blue-500/20 dark:text-blue-400"
                          : "bg-green-500/10 text-green-600 border-green-500/30 dark:bg-green-500/20 dark:text-green-400"
                      : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {prio}
                </button>
              ))}
            </div>
          </div>

          {/* Part of Day & Specific Time */}
          <div className="grid grid-cols-2 gap-4">
            {/* Part of Day */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
                Part of Day
              </label>
              <select
                value={editTaskTimeOfDay}
                onChange={(e) => {
                  const val = e.target.value as
                    "morning" | "midday" | "evening";
                  setEditTaskTimeOfDay(val);
                  // Automatically adjust start time if it was set
                  if (editTaskTime) {
                    if (val === "morning") setEditTaskTime("09:00");
                    else if (val === "midday") setEditTaskTime("13:00");
                    else if (val === "evening") setEditTaskTime("19:00");
                  }
                }}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                <option value="morning">🌅 Morning</option>
                <option value="midday">☀️ Midday</option>
                <option value="evening">🌙 Evening</option>
              </select>
            </div>

            {/* Specific Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide uppercase">
                Start Time
              </label>
              <div className="flex gap-2 items-center">
                {editTaskTime !== undefined ? (
                  <div className="relative flex-1 flex items-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-sm text-zinc-900 dark:text-white">
                    <input
                      type="time"
                      value={editTaskTime}
                      onChange={(e) => {
                        setEditTaskTime(e.target.value);
                        if (e.target.value) {
                          const hour = parseInt(
                            e.target.value.split(":")[0],
                            10,
                          );
                          if (hour >= 6 && hour < 12)
                            setEditTaskTimeOfDay("morning");
                          else if (hour >= 12 && hour < 18)
                            setEditTaskTimeOfDay("midday");
                          else setEditTaskTimeOfDay("evening");
                        }
                      }}
                      className="bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 focus:outline-none w-full text-zinc-900 dark:text-white cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setEditTaskTime(undefined)}
                      className="ml-2 text-zinc-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 cursor-pointer"
                      title="Clear specific time"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      let defaultTime = "09:00";
                      if (editTaskTimeOfDay === "midday") defaultTime = "13:00";
                      else if (editTaskTimeOfDay === "evening")
                        defaultTime = "19:00";
                      setEditTaskTime(defaultTime);
                    }}
                    className="w-full py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-dashed hover:border-purple-500/35 transition-colors cursor-pointer"
                  >
                    + Add Time
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
