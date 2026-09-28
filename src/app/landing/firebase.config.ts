// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA3BbAL_cOoiltvVc4fNemGYMW1u6A6LzM",
    authDomain: "articulate-241c7.firebaseapp.com",
    projectId: "articulate-241c7",
    storageBucket: "articulate-241c7.firebasestorage.app",
    messagingSenderId: "871084289496",
    appId: "1:871084289496:web:e8d26505bd5854257fd6ad"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
