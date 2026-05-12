import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAHe_ynHH-AKGjYlymbpQi8zdOQ26yJJGo",
  authDomain: "kalam-notes.firebaseapp.com",
  projectId: "kalam-notes",
  storageBucket: "kalam-notes.firebasestorage.app",
  messagingSenderId: "1066929757932",
  appId: "1:1066929757932:web:54c44659e5c7c3424a8fc9",
  measurementId: "G-WSJWS3Z6X4"
};

let app, auth;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
