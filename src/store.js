import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, arrayUnion, arrayRemove, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth };

// Authentication Functions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Load data from Firestore
export const loadData = async (userId) => {
  if (!userId) return [];
  const q = query(collection(db, `users/${userId}/daily_logs`), orderBy("date", "asc"));
  const querySnapshot = await getDocs(q);
  const data = [];
  querySnapshot.forEach((doc) => {
    data.push(doc.data());
  });
  return data;
};

// Add or update entry in Firestore
// Add or update entry in Firestore
export const addOrUpdateEntry = async (userId, date, type, value) => {
  if (!userId) throw new Error("User not logged in");
  const docRef = doc(db, `users/${userId}/daily_logs`, date);

  // Check if document exists is tricky without reading, but setDoc with merge handles creation
  // However, we need to know current state for arrays if we want to be precise, 
  // but for 'food' arrayUnion is perfect.
  // For 'weight', we just overwrite.

  try {
    if (type === 'weight') {
      await setDoc(docRef, {
        date: date,
        weight: parseFloat(value)
      }, { merge: true });
    } else if (type === 'food') {
      await setDoc(docRef, {
        date: date,
        food: arrayUnion(value)
      }, { merge: true });
    }
    return await loadData(userId); // Reload to get fresh state
  } catch (e) {
    console.error("Error adding document: ", e);
    alert("儲存失敗，請檢查網路連線");
    throw e;
  }
};

// Delete food item
export const deleteFoodItem = async (userId, date, foodItem) => {
  if (!userId) throw new Error("User not logged in");
  const docRef = doc(db, `users/${userId}/daily_logs`, date);
  try {
    await updateDoc(docRef, {
      food: arrayRemove(foodItem)
    });
    return await loadData(userId);
  } catch (e) {
    console.error("Error removing document: ", e);
    alert("刪除失敗");
    throw e;
  }
}
