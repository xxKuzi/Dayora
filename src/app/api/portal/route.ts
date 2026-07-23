import { NextResponse } from "next/server";
import admin from "firebase-admin";
import Stripe from "stripe";

export async function POST(request: Request) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "dayora-app";

  // 1. Initialize Firebase Admin if not already initialized
  if (!admin.apps.some(app => app?.name === "[DEFAULT]")) {
    try {
      const serviceAccountKey = process.env.FB_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT;
      const clientEmail = process.env.FB_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FB_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

      if (serviceAccountKey) {
        let cleanedKey = serviceAccountKey.trim();
        if ((cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) || 
            (cleanedKey.startsWith('"') && cleanedKey.endsWith('"'))) {
          cleanedKey = cleanedKey.slice(1, -1).trim();
        }

        let parsedKey;
        try {
          parsedKey = JSON.parse(cleanedKey);
        } catch (parseErr: any) {
          try {
            const unescaped = cleanedKey.replace(/\\"/g, '"').replace(/\\n/g, '\n');
            parsedKey = JSON.parse(unescaped);
          } catch (secondErr: any) {
            throw new Error(`JSON parse failed for FB_SERVICE_ACCOUNT: ${parseErr.message}`);
          }
        }

        admin.initializeApp({
          credential: admin.credential.cert(parsedKey),
          projectId,
        });
      } else if (clientEmail && privateKey) {
        let cleanedKey = privateKey.trim();
        if ((cleanedKey.startsWith("'") && cleanedKey.endsWith("'")) || 
            (cleanedKey.startsWith('"') && cleanedKey.endsWith('"'))) {
          cleanedKey = cleanedKey.slice(1, -1).trim();
        }
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: cleanedKey.replace(/\\n/g, "\n"),
          }),
          projectId,
        });
      } else {
        admin.initializeApp({
          projectId,
        });
      }
    } catch (error: any) {
      console.error("Failed to initialize firebase-admin in portal route:", error);
      return NextResponse.json({ error: "Failed to initialize database connection." }, { status: 500 });
    }
  }

  const db = admin.firestore();

  try {
    // 2. Authenticate the user
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing authorization header" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let uid: string;
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      uid = decodedToken.uid;
    } catch (authError: any) {
      console.error("Token verification failed in portal route:", authError);
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    // 3. Fetch user document to get Stripe Customer ID
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    const userData = userDoc.data();
    const stripeId = userData?.stripeId;

    if (!stripeId) {
      return NextResponse.json({ error: "No active Stripe customer found for this account. If you just upgraded, please wait a moment." }, { status: 400 });
    }

    // 4. Initialize Stripe
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      return NextResponse.json({ error: "Stripe integration not configured on the server." }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret);

    // 5. Resolve client origin for redirection URLs
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // 6. Create Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeId,
      return_url: `${origin}/#settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Portal session creation failed:", err);
    return NextResponse.json({ error: err.message || "Failed to initiate Stripe Billing Portal." }, { status: 500 });
  }
}
