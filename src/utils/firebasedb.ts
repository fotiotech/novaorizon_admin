import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// If you need a second (named) app, e.g. to connect to a different project or Realtime DB:
const SECONDARY_APP_NAME = "secondary";
let secondaryApp: FirebaseApp | undefined;

try {
  secondaryApp = getApp(SECONDARY_APP_NAME);
} catch {
  // provide secondary config only if you actually need a second project/DB
  const secondaryConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY1,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN1,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID1,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET1,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID1,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID1,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID1,
  };
  secondaryApp = initializeApp(secondaryConfig, SECONDARY_APP_NAME);
}

// Exports
export const db = secondaryApp ? getFirestore(secondaryApp) : undefined;
