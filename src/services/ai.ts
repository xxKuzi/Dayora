export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
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
}

export interface AIGeneratedPlan {
  tasks: DailyTask[];
  summary: string;
}

class AIService {
  private apiKey: string;
  private baseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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
        "X-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API error: ${response.status} - ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    return this.parseGeneratedPlan(generatedText);
  }

  private buildPrompt(rawTasks: string, userSettings?: any): string {
    const workHours = userSettings?.workHours
      ? `Work hours: ${userSettings.workHours.start} - ${userSettings.workHours.end}`
      : "Work hours: 9:00 AM - 5:00 PM (default)";

    const mealTimes = userSettings?.mealTimes
      ? `Meal times: Breakfast ${userSettings.mealTimes.breakfast}, Lunch ${userSettings.mealTimes.lunch}, Dinner ${userSettings.mealTimes.dinner}`
      : "Meal times: Breakfast 8:00 AM, Lunch 12:30 PM, Dinner 7:00 PM (default)";

    return `You are an AI assistant that helps create organized daily plans. Based on the user's raw tasks and preferences, create a structured daily plan.

User's raw tasks: "${rawTasks}"

User preferences:
- ${workHours}
- ${mealTimes}

Please analyze the tasks and create an organized daily plan. Consider:
1. Prioritizing tasks by importance and urgency
2. Grouping related tasks together
3. Suggesting optimal timing based on work hours and meal times
4. Adding estimated time for each task
5. Categorizing tasks (work, personal, health, etc.)

Return your response in the following JSON format:
{
  "summary": "Brief summary of the day's plan",
  "tasks": [
    {
      "text": "Task description with suggested timing",
      "priority": "high|medium|low",
      "estimatedTime": 30,
      "category": "work|personal|health|errands"
    }
  ]
}

Make sure the response is valid JSON and includes all tasks from the user's input, plus any additional suggestions for a productive day.`;
  }

  private parseGeneratedPlan(text: string): AIGeneratedPlan {
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch =
        text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        text.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;

      const parsed = JSON.parse(jsonString);

      // Transform the parsed data into our DailyTask format
      const tasks: DailyTask[] = parsed.tasks.map(
        (task: any, index: number) => ({
          id: `ai_task_${Date.now()}_${index}`,
          text: task.text || task.description || "Untitled task",
          completed: false,
          priority: task.priority || "medium",
          estimatedTime: task.estimatedTime || undefined,
          category: task.category || undefined,
        })
      );

      return {
        tasks,
        summary: parsed.summary || "AI-generated daily plan",
      };
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("Raw response:", text);

      // Fallback: create basic tasks from the raw input
      const lines = text.split("\n").filter((line) => line.trim());
      const fallbackTasks: DailyTask[] = lines
        .slice(0, 10)
        .map((line, index) => ({
          id: `ai_fallback_${Date.now()}_${index}`,
          text: line.trim(),
          completed: false,
          priority: "medium" as const,
        }));

      return {
        tasks: fallbackTasks,
        summary: "AI-generated daily plan (parsed with fallback)",
      };
    }
  }
}

// Create a singleton instance
let aiService: AIService | null = null;

export function initializeAI(apiKey: string): void {
  aiService = new AIService(apiKey);
}

export function getAIService(): AIService {
  if (!aiService) {
    throw new Error("AI service not initialized. Call initializeAI() first.");
  }
  return aiService;
}

export { AIService };
