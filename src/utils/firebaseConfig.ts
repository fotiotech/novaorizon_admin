// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Main app (for Storage, Auth, etc.)
const defaultConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const defaultApp = initializeApp(defaultConfig);

// Secondary app (only for Realtime Database)
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

const SECONDARY_APP_NAME = "secondary";
const secondaryApp = initializeApp(secondaryConfig, SECONDARY_APP_NAME);

// Exports
export const storage = getStorage(defaultApp);
export const db = getFirestore(secondaryApp);
