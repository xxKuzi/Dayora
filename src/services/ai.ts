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
  async generateDailyPlan(
    rawTasks: string,
    userSettings?: any
  ): Promise<AIGeneratedPlan> {
    const response = await fetch("/api/generate-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawTasks, userSettings }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const msg = data?.error || response.statusText;
      throw new Error(msg);
    }

    return (await response.json()) as AIGeneratedPlan;
  }
}

let aiService: AIService | null = null;

export function initializeAI(apiKey?: string): AIService {
  aiService = new AIService();
  return aiService;
}

export function getAIService(): AIService {
  if (!aiService) {
    aiService = new AIService();
  }
  return aiService;
}

export { AIService };

