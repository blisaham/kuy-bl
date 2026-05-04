import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCod6Tj0RRHezf-fW7Sj0IyKCV6unYeX9w",
  authDomain: "kuy-bl-c4e17.firebaseapp.com",
  projectId: "kuy-bl-c4e17",
  storageBucket: "kuy-bl-c4e17.firebasestorage.app",
  messagingSenderId: "192103480532",
  appId: "1:192103480532:web:d388079075f29b8044cf41",
};

const app = initializeApp(firebaseConfig);

export const getFirebaseMessaging = async () => {
  const supported = await isSupported();

  if (!supported) return null;

  return getMessaging(app);
};