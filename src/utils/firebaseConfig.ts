// lib/firebase.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const defaultConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// initialize default app only if none exists (safe for HMR / Next dev)
const defaultApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(defaultConfig);

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

// Exports: be explicit about which app each service belongs to
export const storage = getStorage(defaultApp);

// Exports
export const db = secondaryApp ? getFirestore(secondaryApp) : undefined;
