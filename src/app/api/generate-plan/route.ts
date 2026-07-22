import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { rawTasks, userSettings } = await request.json();

    if (!rawTasks) {
      return NextResponse.json({ error: "Missing rawTasks parameter" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key is not configured on the server" }, { status: 500 });
    }

    // Port prompt building logic from client services
    const userType = userSettings?.userType || "worker";
    const workHours = userSettings?.workHours
      ? `Work hours: ${userSettings.workHours.start} - ${userSettings.workHours.end}`
      : "Work hours: 9:00 AM - 5:00 PM (default)";

    const mealTimes = userSettings?.mealTimes
      ? `Meal times: Breakfast ${userSettings.mealTimes.breakfast}, Lunch ${userSettings.mealTimes.lunch}, Dinner ${userSettings.mealTimes.dinner}`
      : "Meal times: Breakfast 8:00 AM, Lunch 12:30 PM, Dinner 7:00 PM (default)";

    const prompt = `You are an AI assistant that helps create organized daily plans. Based on the user's raw tasks and preferences, create a structured daily plan.

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

    const modelName = "gemini-3.1-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
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

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const msg = data?.error?.message || response.statusText;
      return NextResponse.json({ error: `Gemini API error: ${msg}` }, { status: response.status });
    }

    const data = await response.json();
    const firstText = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => typeof p.text === "string"
    )?.text;

    if (!firstText) {
      return NextResponse.json({ error: "No text candidates returned from Gemini API" }, { status: 500 });
    }

    // Parse logic
    try {
      const jsonMatch =
        firstText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        firstText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : firstText;
      const parsed = JSON.parse(jsonString);

      const tasks = (parsed.tasks ?? []).map((task: any, index: number) => ({
        id: `ai_task_${Date.now()}_${index}`,
        text: task.text || task.description || "Untitled task",
        completed: false,
        priority: task.priority || "medium",
        estimatedTime: task.estimatedTime ?? undefined,
        category: task.category ?? undefined,
        timeOfDay: task.timeOfDay || "morning",
      }));

      return NextResponse.json({ tasks, summary: parsed.summary || "AI-generated daily plan" });
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, "\nRaw response:", firstText);
      const lines = firstText.split("\n").filter((l: string) => l.trim());
      const fallbackTasks = lines.slice(0, 10).map((line: string, i: number) => ({
        id: `ai_fallback_${Date.now()}_${i}`,
        text: line.trim(),
        completed: false,
        priority: "medium",
        timeOfDay: "morning",
      }));
      return NextResponse.json({
        tasks: fallbackTasks,
        summary: "AI-generated daily plan (parsed with fallback)",
      });
    }
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
