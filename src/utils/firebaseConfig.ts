// Import the functions you need from the SDKs you need

import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  setLogLevel,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

setLogLevel("debug");

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const apps = getApps()[0];
console.log(
  "Using Firebase project:",
  apps.options.projectId,
  apps.options.databaseURL
);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

const storage = getStorage(app);

export { storage };
