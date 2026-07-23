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
      console.error("Failed to initialize firebase-admin in checkout route:", error);
      return NextResponse.json({ error: "Failed to initialize database connection." }, { status: 500 });
    }
  }

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
      console.error("Token verification failed in checkout route:", authError);
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    // 3. Initialize Stripe
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

    if (!stripeSecret) {
      console.error("Missing STRIPE_SECRET_KEY environment variable");
      return NextResponse.json({ error: "Stripe integration not configured on the server." }, { status: 500 });
    }

    if (!priceId) {
      console.error("Missing NEXT_PUBLIC_STRIPE_PRICE_ID environment variable");
      return NextResponse.json({ error: "Pro subscription Price ID not configured." }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret);

    // 4. Resolve client origin for redirection URLs
    const origin = request.headers.get("origin") || "http://localhost:3000";

    // 5. Create the Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",      
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: uid,
      },
      client_reference_id: uid,
      success_url: `${origin}/`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout session creation failed:", err);
    return NextResponse.json({ error: err.message || "Failed to initiate Stripe Checkout." }, { status: 500 });
  }
}
