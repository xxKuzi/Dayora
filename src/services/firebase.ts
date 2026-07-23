import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if keys are actually provided and not placeholders
export const isFirebaseConfigured =
  typeof window !== "undefined" &&
  !!firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== "your_api_key" &&
  firebaseConfig.apiKey.trim() !== "";

let app;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
const googleProvider = new GoogleAuthProvider();

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Enable multi-tab offline persistence for Firestore
    if (typeof window !== "undefined") {
      enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn("Firestore persistence failed-precondition: multiple tabs open.");
        } else if (err.code === "unimplemented") {
          console.warn("Firestore persistence is not supported by the browser.");
        }
      });
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
}

export { auth, db, googleProvider };
