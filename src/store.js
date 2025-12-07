import { initializeApp } from "firebase/app";
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

export const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Load data from Firestore
export const loadData = async () => {
  const q = query(collection(db, "daily_logs"), orderBy("date", "asc"));
  const querySnapshot = await getDocs(q);
  const data = [];
  querySnapshot.forEach((doc) => {
    data.push(doc.data());
  });
  return data;
};

// Add or update entry in Firestore
export const addOrUpdateEntry = async (date, type, value) => {
  const docRef = doc(db, "daily_logs", date);

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
    return await loadData(); // Reload to get fresh state
  } catch (e) {
    console.error("Error adding document: ", e);
    alert("儲存失敗，請檢查網路連線");
    throw e;
  }
};

// Delete food item
export const deleteFoodItem = async (date, foodItem) => {
  const docRef = doc(db, "daily_logs", date);
  try {
    await updateDoc(docRef, {
      food: arrayRemove(foodItem)
    });
    return await loadData();
  } catch (e) {
    console.error("Error removing document: ", e);
    alert("刪除失敗");
    throw e;
  }
}
