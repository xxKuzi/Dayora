export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text?: string }>;
    };
  }>;
}

export interface DailyTask {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  estimatedTime?: number;
  category?: string;
  timeOfDay?: "morning" | "midday" | "evening";
}

export interface AIGeneratedPlan {
  tasks: DailyTask[];
  summary: string;
}

class AIService {
  private apiKey: string;
  // Use the stable v1 endpoint; keep model configurable
  private model = "gemini-2.0-flash"; // or a 2.x model your project has access to
  private baseUrl = `https://generativelanguage.googleapis.com/v1/models/${this.model}:generateContent`;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateDailyPlan(
    rawTasks: string,
    userSettings?: any
  ): Promise<AIGeneratedPlan> {
    const prompt = this.buildPrompt(rawTasks, userSettings);

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": this.apiKey, // per docs
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    // Better error reporting
    let data: any;
    if (!response.ok) {
      data = await response.json().catch(() => ({}));
      const msg = data?.error?.message || response.statusText;
      throw new Error(`Gemini API error: ${response.status} – ${msg}`);
    }

    data = (await response.json()) as GeminiResponse;

    const firstText = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => typeof p.text === "string"
    )?.text;

    if (!firstText) {
      throw new Error("No text candidates returned from Gemini API");
    }

    return this.parseGeneratedPlan(firstText);
  }

  private buildPrompt(rawTasks: string, userSettings?: any): string {
    const userType = userSettings?.userType || "worker";
    const workHours = userSettings?.workHours
      ? `Work hours: ${userSettings.workHours.start} - ${userSettings.workHours.end}`
      : "Work hours: 9:00 AM - 5:00 PM (default)";

    const mealTimes = userSettings?.mealTimes
      ? `Meal times: Breakfast ${userSettings.mealTimes.breakfast}, Lunch ${userSettings.mealTimes.lunch}, Dinner ${userSettings.mealTimes.dinner}`
      : "Meal times: Breakfast 8:00 AM, Lunch 12:30 PM, Dinner 7:00 PM (default)";

    return `You are an AI assistant that helps create organized daily plans. Based on the user's raw tasks and preferences, create a structured daily plan.

User's raw tasks: "${rawTasks}"

User profile: ${userType}
User preferences:
- ${workHours}
- ${mealTimes}

Please analyze the tasks and create an organized daily plan. Consider:
1. Prioritizing tasks by importance and urgency
2. Grouping related tasks together
3. Assigning tasks to appropriate time blocks (morning, midday, evening)
4. Suggesting optimal timing based on work hours and meal times
5. Adding estimated time for each task
6. Categorizing tasks (work, personal, health, etc.)

Time blocks:
- Morning (6AM-12PM): Start your day, important tasks, breakfast
- Midday (12PM-6PM): Work/school tasks, meetings, lunch
- Evening (6PM-12AM): Wind down, personal tasks, dinner

Return your response in the following JSON format:
{
  "summary": "Brief summary of the day's plan",
  "tasks": [
    {
      "text": "Task description with suggested timing",
      "priority": "high|medium|low",
      "estimatedTime": 30,
      "category": "work|personal|health|errands",
      "timeOfDay": "morning|midday|evening"
    }
  ]
}

Make sure the response is valid JSON and includes all tasks from the user's input, plus any additional suggestions for a productive day. Each task MUST have a timeOfDay assigned.`;
  }

  private parseGeneratedPlan(text: string): AIGeneratedPlan {
    try {
      const jsonMatch =
        text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      const parsed = JSON.parse(jsonString);

      const tasks: DailyTask[] = (parsed.tasks ?? []).map(
        (task: any, index: number) => ({
          id: `ai_task_${Date.now()}_${index}`,
          text: task.text || task.description || "Untitled task",
          completed: false,
          priority: (task.priority as DailyTask["priority"]) || "medium",
          estimatedTime: task.estimatedTime ?? undefined,
          category: task.category ?? undefined,
          timeOfDay: (task.timeOfDay as DailyTask["timeOfDay"]) || "morning",
        })
      );

      return { tasks, summary: parsed.summary || "AI-generated daily plan" };
    } catch (err) {
      console.error(
        "Failed to parse AI response:",
        err,
        "\nRaw response:",
        text
      );
      const lines = text.split("\n").filter((l) => l.trim());
      const fallbackTasks: DailyTask[] = lines.slice(0, 10).map((line, i) => ({
        id: `ai_fallback_${Date.now()}_${i}`,
        text: line.trim(),
        completed: false,
        priority: "medium",
        timeOfDay: "morning" as const,
      }));
      return {
        tasks: fallbackTasks,
        summary: "AI-generated daily plan (parsed with fallback)",
      };
    }
  }
}

let aiService: AIService | null = null;
export function initializeAI(apiKey: string): void {
  aiService = new AIService(apiKey);
}
export function getAIService(): AIService {
  if (!aiService)
    throw new Error("AI service not initialized. Call initializeAI() first.");
  return aiService;
}
export { AIService };
