import { initializeApp } from 'firebase/app';
import { getAuth,initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage'; // Uncomment if you need Storage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1zjWxJzhiSS9O6a5QuzsR1jVjdEEXtCQ",
  authDomain: "causeai.firebaseapp.com",
  projectId: "causeai",
  storageBucket: "causeai.firebasestorage.app",
  messagingSenderId: "100146976894",
  appId: "1:100146976894:web:c47720e7cc61980278a02f",
  measurementId: "G-E4L74VYG6N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
// @ts-ignore: getReactNativePersistence is not exported in the main type definition but exists at runtime
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
// export const storage = getStorage(app);

export default app;
