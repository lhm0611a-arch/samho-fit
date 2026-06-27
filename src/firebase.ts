/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC_fQq_qdlXbJ8BwBY1Zqq4Ljq2r_eJZmQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "enhanced-tokenizer-wd2jw.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "enhanced-tokenizer-wd2jw",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "enhanced-tokenizer-wd2jw.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "482301380709",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:482301380709:web:af5f8cad74ff0873471e8c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Use custom database ID from config
// Since standard getFirestore doesn't take databaseId in the same way directly without admin, 
// wait, Firebase v10 client SDK does support it if you initialize it. 
// However, the databaseId is ai-studio-hdhyundaisamhoe7-96fa749c-627d-4eb8-9077-f1dccc79da5c.
// Actually, getFirestore(app, "ai-studio-hdhyundaisamhoe7-96fa749c-627d-4eb8-9077-f1dccc79da5c")
// Let's configure the exact DB ID.

export const firestoreDb = getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-hdhyundaisamhoe7-96fa749c-627d-4eb8-9077-f1dccc79da5c");
