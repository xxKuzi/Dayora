import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { Resend } from "resend";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  timeOfDay?: "morning" | "midday" | "evening";
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "dayora-app",
    });
  } catch (error) {
    console.error("Failed to initialize firebase-admin:", error);
  }
}

export async function POST(request: Request) {
  try {
    // 1. Verify Authentication via Bearer token
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing or invalid authorization header" }, { status: 401 });
    }
    
    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (authError: any) {
      console.error("Firebase ID Token verification failed:", authError);
      return NextResponse.json({ error: `Unauthorized: ${authError.message}` }, { status: 401 });
    }

    const email = decodedToken.email;
    const emailVerified = decodedToken.email_verified;

    if (!email) {
      return NextResponse.json({ error: "Unauthorized: User token does not contain an email address" }, { status: 401 });
    }

    // A. Verify that the user's email is verified
    if (!emailVerified) {
      return NextResponse.json({ error: "Forbidden: Your email address must be verified to send plans." }, { status: 403 });
    }

    // B. Restrict strictly to gmail.com addresses
    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return NextResponse.json({ error: "Forbidden: Only @gmail.com addresses are allowed to send plans." }, { status: 403 });
    }

    // C. Verify daily email limits (1 email/day for non-pro, unlimited for Pro)
    try {
      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const db = admin.firestore();
      const subsSnapshot = await db
        .collection("users")
        .doc(decodedToken.uid)
        .collection("subscriptions")
        .where("status", "in", ["active", "trialing"])
        .limit(1)
        .get();
      const isPro = !subsSnapshot.empty;

      if (!isPro) {
        const usageDocRef = db.collection("users").doc(decodedToken.uid).collection("dailyUsage").doc(dateStr);
        const usageDoc = await usageDocRef.get();
        const usageData = usageDoc.data() || { emailCount: 0 };
        const emailCount = usageData.emailCount || 0;

        if (emailCount >= 10) {
          return NextResponse.json(
            {
              error: "EMAIL_LIMIT_EXCEEDED",
              message: "You have reached your daily limit of 10 emails. Upgrade to Pro for unlimited emails.",
            },
            { status: 403 }
          );
        }

        await usageDocRef.set(
          {
            emailCount: admin.firestore.FieldValue.increment(1),
          },
          { merge: true }
        );
      }
    } catch (dbError) {
      console.error("Firestore email limits validation failed, bypassing check:", dbError);
    }

    // 2. Validate Inputs
    const { date, tasks } = (await request.json()) as {
      date: string;
      tasks: Task[];
    };

    if (!date || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "Missing or invalid parameters: date and tasks are required." }, { status: 400 });
    }

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ error: "Resend API key is not configured on the server." }, { status: 500 });
    }

    const resend = new Resend(resendApiKey);

    // 3. Group Tasks
    const morning = tasks.filter((t) => t.timeOfDay === "morning");
    const midday = tasks.filter((t) => t.timeOfDay === "midday");
    const evening = tasks.filter((t) => t.timeOfDay === "evening");
    const others = tasks.filter((t) => !t.timeOfDay);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalCount = tasks.length;
    const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Helper to render priority badge
    const getPriorityStyle = (priority: string) => {
      switch (priority) {
        case "high":
          return "background-color: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);";
        case "low":
          return "background-color: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.3);";
        default:
          return "background-color: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3);";
      }
    };

    // Helper to render tasks list
    const renderTasksSection = (title: string, icon: string, timeLabel: string, items: Task[]) => {
      if (items.length === 0) return "";
      
      const listHtml = items.map((task) => {
        const priorityBadge = task.priority !== "medium" 
          ? `<span style="display: inline-block; padding: 2px 8px; font-size: 11px; border-radius: 9999px; font-weight: 500; margin-left: 8px; ${getPriorityStyle(task.priority)}">${task.priority}</span>`
          : "";
          
        return `
          <div style="padding: 12px; margin-bottom: 8px; background-color: #111827; border: 1px solid #1f2937; border-radius: 8px; display: flex; align-items: flex-start; justify-content: space-between;">
            <div style="display: flex; align-items: center; width: 100%;">
              <span style="font-size: 18px; margin-right: 12px; color: ${task.completed ? '#10b981' : '#9ca3af'}; font-family: monospace;">
                ${task.completed ? "✓" : "☐"}
              </span>
              <span style="font-size: 15px; color: ${task.completed ? '#9ca3af' : '#ffffff'}; text-decoration: ${task.completed ? 'line-through' : 'none'}; flex: 1;">
                ${task.text}
              </span>
              ${priorityBadge}
            </div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin-top: 24px;">
          <div style="display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #1f2937; padding-bottom: 6px;">
            <h3 style="font-size: 16px; color: #ffffff; font-weight: 600; margin: 0;">${icon} ${title}</h3>
            <span style="font-size: 12px; color: #9ca3af; margin-left: 8px; font-weight: normal;">(${timeLabel})</span>
          </div>
          <div>${listHtml}</div>
        </div>
      `;
    };

    // 4. Generate Premium HTML Template (Dark Theme matching Dayora's UI)
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your Daily Plan</title>
        </head>
        <body style="background-color: #030712; margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #000000; border: 1px solid #1f2937; border-radius: 16px; padding: 32px 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
            
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em; background: linear-gradient(to right, #a855f7, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Dayora Plan</h1>
              <p style="margin: 0; font-size: 15px; color: #9ca3af; font-weight: 500;">${formattedDate}</p>
            </div>

            <!-- Progress Bar -->
            <div style="background-color: #1f2937; border-radius: 9999px; height: 10px; margin-bottom: 8px; overflow: hidden; width: 100%;">
              <div style="background: linear-gradient(to right, #a855f7, #ec4899); height: 10px; border-radius: 9999px; width: ${progressPercentage}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; margin-bottom: 24px;">
              <span>Progress</span>
              <span style="font-weight: 600; color: #ffffff;">${completedCount} of ${totalCount} tasks (${progressPercentage}%)</span>
            </div>

            <!-- Task lists -->
            ${renderTasksSection("Morning", "🌅", "6AM - 12PM", morning)}
            ${renderTasksSection("Midday", "☀️", "12PM - 6PM", midday)}
            ${renderTasksSection("Evening", "🌙", "6PM - 12AM", evening)}
            ${renderTasksSection("Other Tasks", "📋", "No specific time", others)}

            <!-- Footer -->
            <div style="margin-top: 40px; border-top: 1px solid #1f2937; padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #4b5563;">Organized with AI Assistance on Dayora</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // 5. Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Dayora App <onboarding@resend.dev>",
      to: email,
      subject: `Your Plan for ${date} (${completedCount}/${totalCount} completed)`,
      html: emailHtml,
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("Resend API error:", err);
    return NextResponse.json({ error: err.message || "Failed to dispatch email via Resend." }, { status: 500 });
  }
}
