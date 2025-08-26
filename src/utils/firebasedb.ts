import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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
const secondaryApp = initializeApp(secondaryConfig, "secondary");

// Exports
export const db = getFirestore(secondaryApp);
