import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBg6o8TpbaGHME_lFNpfvntL1VAp0u0JpE",
  authDomain: "traces-ffd5c.firebaseapp.com",
  projectId: "traces-ffd5c",
  storageBucket: "traces-ffd5c.firebasestorage.app",
  messagingSenderId: "555876405221",
  appId: "1:555876405221:web:060cc00b3b8a8cd713a90c",
  measurementId: "G-FL83Z61L2K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
