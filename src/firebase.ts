/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { initializeFirestore, setLogLevel } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC_fQq_qdlXbJ8BwBY1Zqq4Ljq2r_eJZmQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "enhanced-tokenizer-wd2jw.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "enhanced-tokenizer-wd2jw",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "enhanced-tokenizer-wd2jw.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "482301380709",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:482301380709:web:af5f8cad74ff0873471e8c"
};

export const app = initializeApp(firebaseConfig);
export const DATABASE_ID = import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-hdhyundaisamhoe7-96fa749c-627d-4eb8-9077-f1dccc79da5c";

// Suppress benign internal gRPC idle stream cancellation notices
setLogLevel("error");

export const firestoreDb = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  DATABASE_ID
);

