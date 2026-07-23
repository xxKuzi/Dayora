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
      console.error("Failed to initialize firebase-admin in webhook route:", error);
      return NextResponse.json({ error: "Database initialization failed." }, { status: 500 });
    }
  }

  const db = admin.firestore();

  // 2. Retrieve environment variables
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecret || !webhookSecret) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET env variables");
    return NextResponse.json({ error: "Stripe webhook configuration missing." }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret);

  // 3. Verify Stripe signature
  const signature = request.headers.get("stripe-signature") || "";
  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    const dataObject = event.data.object as any;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = dataObject as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const customerId = session.customer as string;

        if (!userId) {
          console.warn(`No client_reference_id or userId metadata found for session ${session.id}`);
          break;
        }

        // Save stripe customer ID under user document
        await db.collection("users").doc(userId).set({
          stripeId: customerId,
        }, { merge: true });

        // Retrieve subscription info if checkout was a subscription
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          await db.collection("users").doc(userId).collection("subscriptions").doc(subscription.id).set({
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_end: subscription.items.data[0].current_period_end,
            created: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log(`Successfully completed checkout and created subscription doc for user ${userId}`);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = dataObject as Stripe.Subscription;
        let userId = subscription.metadata?.userId;

        // If metadata doesn't contain userId, lookup customer ID in users collection
        if (!userId) {
          const customerId = subscription.customer as string;
          const userSnap = await db.collection("users").where("stripeId", "==", customerId).limit(1).get();
          if (!userSnap.empty) {
            userId = userSnap.docs[0].id;
          }
        }

        if (!userId) {
          console.warn(`Could not resolve Firebase userId for Stripe customer ${subscription.customer}`);
          break;
        }

        await db.collection("users").doc(userId).collection("subscriptions").doc(subscription.id).set({
          status: subscription.status,
          price_id: subscription.items.data[0].price.id,
          cancel_at_period_end: subscription.cancel_at_period_end,
          current_period_end: subscription.items.data[0].current_period_end,
        }, { merge: true });

        console.log(`Successfully synced subscription status (${subscription.status}) for user ${userId}`);
        break;
      }

      default:
        // Other events can be ignored
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Failed to process webhook event:", error);
    return NextResponse.json({ error: "Webhook event handler failed." }, { status: 500 });
  }
}
