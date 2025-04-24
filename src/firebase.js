// src/firebase.js

// 1. Importer funksjoner fra Firebase SDK
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// 2. Din Firebase‑konfigurasjon
const firebaseConfig = {
  apiKey: 'AIzaSyBlMV1K3-n73HV0gB2-Tt5feoM3QgBYV00',
  authDomain: 'rundekultur-1a014.firebaseapp.com',
  databaseURL: 'https://rundekultur-1a014-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'rundekultur-1a014',
  storageBucket: 'rundekultur-1a014.appspot.com',
  messagingSenderId: '1015757144403',
  appId: '1:1015757144403:web:628aef4cdfc6602d9ca1a6',
  measurementId: 'G-8GVSZQC701',
};

// 3. Initialiser app og database
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// 4. Eksporter database-instansen
export { database };
